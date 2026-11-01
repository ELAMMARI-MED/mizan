# -*- coding: utf-8 -*-
"""نواة العروض المشتركة بين خادم التطوير (server.py) وخادم التطبيق داخل APK (app_server.py).
تُنسخ كما هي إلى app/src/main/python/ عند البناء — نسخة واحدة، فلا تتباعد النسختان."""
import re
from functools import lru_cache

from pyarud import ArudhProcessor

proc = ArudhProcessor()

HARAKAT = re.compile(r'[\u064b-\u0652]')
DIACRITICS = re.compile(r'[\u064b-\u0652\u0670\u0640]')
LETTERS = re.compile(r'[\u0621-\u064a\u0671]')

METERS = {}  # meter_key -> {'ar': ..., 'type': ...}

def _meter_names():
    """Build the key -> Arabic-name map once (used by the nearest-meter ranking)."""
    for key, cls in proc.meter_classes.items():
        try:
            METERS[key] = {'ar': cls.name_ar, 'type': getattr(cls, 'bahr_type', '')}
        except Exception:
            METERS[key] = {'ar': key, 'type': ''}

_meter_names()

TASHKEEL_HINT = 'الشعر بلا حركات لا يمكن تقطيعه بثقة: ضع الحركات (فَتَحَات، ضَمّات، كَسَرات، سُكُون) على الحروف.'

def tashkeel_coverage(text):
    """fraction of letter-positions carrying a haraka (0..1)."""
    letters = len(LETTERS.findall(text))
    if not letters:
        return 0.0
    return min(1.0, len(HARAKAT.findall(text)) / letters)

def words_without_tashkeel(text, cap=60):
    """Words that carry no haraka at all — those are the ones the user must vowellize."""
    out = []
    for raw in re.split(r'\s+', text or ''):
        w = raw.strip('«»"\'.,،؛:!؟()[]|—ـ')
        if not w or not LETTERS.search(w):
            continue
        if not HARAKAT.search(w) and w not in out:
            out.append(w)
            if len(out) >= cap:
                break
    return out

def split_verse(line):
    """'صدر | عجز' or 'صدر — عجز' or 'صدر  عجز' (double space)."""
    for sep in ('|', '—', '¦', '٭'):
        if sep in line:
            a, b = line.split(sep, 1)
            return a.strip(), b.strip()
    parts = re.split(r'\s{2,}', line.strip())
    if len(parts) >= 2:
        return parts[0].strip(), parts[1].strip()
    return line.strip(), ''

def feet_to_chunks(sh):
    """split arudi_text into foot chunks; pattern digits count letters, not spaces."""
    text = sh.get('arudi_text') or ''
    chunks = []
    pos = 0
    for f in sh.get('feet', []):
        need = len(f.get('actual_segment') or '')
        consumed = 0
        start = pos
        while pos < len(text) and consumed < need:
            if not text[pos].isspace():
                consumed += 1
            pos += 1
        # include a trailing space in the chunk boundary
        while pos < len(text) and text[pos] == ' ':
            pos += 1
        chunks.append({
            'text': text[start:pos].strip(),
            'base': f.get('base_tafeela'),
            'actual': f.get('actual_tafeela'),
            'zihaf_ar': f.get('zihaf_name_ar'),
            'zihaf_en': f.get('zihaf_name_en'),
            'status': f.get('status'),
            'segment': f.get('actual_segment'),
            'expected': f.get('expected_pattern'),
        })
    rest = text[pos:].strip()
    if rest:
        chunks.append({'text': rest, 'base': '', 'actual': '',
                       'zihaf_ar': '', 'zihaf_en': '', 'status': 'extra',
                       'segment': '', 'expected': ''})
    return chunks

def _patterns_of(data, side):
    """precomputed_patterns[side] is a list of variants (sub-بحور) or a dict."""
    v = data.get(side)
    out = []
    if isinstance(v, list):
        for item in v:
            if isinstance(item, dict) and item.get('pattern'):
                out.append(item['pattern'])
    elif isinstance(v, dict) and v.get('pattern'):
        out.append(v['pattern'])
    return out

def _match_ratio(a, b):
    """Positional agreement of two scansion patterns (0..1).
    SequenceMatcher rates any two 0/1 strings ~0.95, which made «الكامل» look as close as
    «الطويل» to a الطويل verse; positional matching separates them cleanly (1.0 vs 0.70)."""
    n = max(len(a), len(b))
    if not n:
        return 0.0
    return sum(1 for x, y in zip(a, b) if x == y) / n

def _best_sim(target, variants):
    """Best similarity against a meter's variant list — not the cross product:
    75k comparisons cost ~20s per verse, this is ~500 and runs in 0.1s."""
    if not target or not variants:
        return None
    best = 0.0
    for v in variants:
        if not v:
            continue
        if abs(len(v) - len(target)) > max(6, len(target) // 3):
            continue
        sim = _match_ratio(target, v)
        if sim > best:
            best = sim
    return best if best else 0.0

@lru_cache(maxsize=256)
def nearest_meters(sadr_pattern, ajuz_pattern, exclude='', top=3):
    """Rank the sixteen بحور by pattern similarity — answers «لماذا لم يطابق؟»."""
    if not (sadr_pattern or ajuz_pattern):
        return ()
    rows = []
    for key, data in proc.precomputed_patterns.items():
        if key == exclude:
            continue
        parts = [x for x in (_best_sim(sadr_pattern, _patterns_of(data, 'sadr')),
                             _best_sim(ajuz_pattern, _patterns_of(data, 'ajuz')))
                 if x is not None]
        if not parts:
            continue
        sim = sum(parts) / len(parts)
        rows.append({'meter_key': key,
                     'meter_ar': METERS.get(key, {}).get('ar', key),
                     'similarity': round(sim, 3)})
    rows.sort(key=lambda r: -r['similarity'])
    return tuple(rows[:top])

def explain_failure(verse, sadr_txt, ajuz_txt):
    """Point at the first foot that breaks the meter (instead of a bare «غير موزون»)."""
    for label, key in (('الصدر', 'sadr'), ('العجز', 'ajuz')):
        for i, f in enumerate((verse.get(key) or {}).get('feet') or [], 1):
            if f.get('status') and f['status'] != 'ok':
                return {
                    'side': label,
                    'foot_index': i,
                    'text': f.get('text') or '',
                    'base': f.get('base') or '',
                    'actual': f.get('actual') or '',
                    'zihaf_ar': f.get('zihaf_ar') or '',
                    'expected': f.get('expected') or '',
                    'got': f.get('segment') or '',
                    'status': f.get('status'),
                    'sadr_text': sadr_txt,
                    'ajuz_text': ajuz_txt,
                }
    return None

def analyze_one(sadr, ajuz):
    a = proc.analyze_verse(sadr, ajuz)
    d = a.to_dict()
    q = d.get('qafiyah') or {}
    out = {
        'meter_ar': d.get('meter_name_ar'),
        'meter_key': d.get('meter_key'),
        'bahr_type': d.get('bahr_type'),
        'standard_pattern': d.get('standard_pattern'),
        'score': d.get('score'),
        'is_valid': d.get('is_valid'),
        'errors': d.get('errors') or [],
        'sadr': {'text': sadr, 'arudi_text': d['sadr'].get('arudi_text'),
                 'pattern': d['sadr'].get('pattern'),
                 'feet': feet_to_chunks(d['sadr'])},
        'ajuz': {'text': ajuz, 'arudi_text': (d.get('ajuz') or {}).get('arudi_text'),
                 'pattern': (d.get('ajuz') or {}).get('pattern'),
                 'feet': feet_to_chunks(d.get('ajuz') or {})},
        'rawi': q.get('rawi') or q.get('rawi_char'),
        'rawi_haraka': q.get('rawi_haraka'),
        'qafiyah_text': q.get('qafiyah_text'),
        'qafiyah_pattern': q.get('qafiyah_pattern'),
        'qafiyah_type_ar': q.get('qafiyah_type_ar'),
        'rhyme_classification': q.get('rhyme_classification'),
        'tasees': q.get('tasees'),
        'dakhil': q.get('dakhil'),
        'ridf': q.get('ridf'),
        'khuruj': q.get('khuruj'),
    }
    out['nearest'] = list(nearest_meters(out['sadr'].get('pattern') or '',
                                          out['ajuz'].get('pattern') or '',
                                          out.get('meter_key') or ''))
    out['explain'] = None if out['is_valid'] else explain_failure(out, sadr, ajuz)
    return out

def qafiyah_report(verses):
    """Poem-level قافية checks: إيطاء / سِناد / توجيه + اختلاف البحر."""
    qs = [v for v in verses if v.get('rawi')]
    defects = []
    rawis = []
    for v in qs:
        if v.get('rawi') and v['rawi'] not in rawis:
            rawis.append(v['rawi'])
    if len(rawis) > 1:
        defects.append({'code': 'sanad', 'name_ar': 'سِناد — اختلاف الرويّ',
                        'detail': 'الرويّ ليس واحدًا في كل الأبيات: ' + ' · '.join(rawis)})

    harakat = {}
    for v in qs:
        if v.get('rawi'):
            harakat.setdefault(v['rawi'], [])
            if v.get('rawi_haraka') and v['rawi_haraka'] not in harakat[v['rawi']]:
                harakat[v['rawi']].append(v['rawi_haraka'])
    for rawi, hs in harakat.items():
        if len(hs) > 1:
            defects.append({'code': 'tawjih', 'name_ar': 'توجيه — اختلاف حركة الرويّ',
                            'detail': f'الرويّ «{rawi}» جاء بحركات مختلفة: ' + ' · '.join(hs)})

    seen = {}
    for i, v in enumerate(qs):
        bare = DIACRITICS.sub('', (v.get('qafiyah_text') or '').strip())
        if not bare:
            continue
        if bare in seen and i - seen[bare] <= 7:
            defects.append({'code': 'ita', 'name_ar': 'إيطاء — تكرار كلمة القافية',
                            'detail': f'«{bare}» تكرّرت في البيتين {seen[bare] + 1} و {i + 1}'})
        seen.setdefault(bare, i)

    meters = [v.get('meter_ar') for v in verses if v.get('meter_ar')]
    mixed = len(set(meters)) > 1
    if mixed:
        defects.append({'code': 'mixed_meter', 'name_ar': 'اختلاف البحر',
                        'detail': 'الأبيات ليست على بحر واحد: ' + ' · '.join(sorted(set(meters)))})

    return {
        'verse_count': len(qs),
        'rawi': rawis,
        'rhyme_words': [v.get('qafiyah_text') for v in qs if v.get('qafiyah_text')],
        'defects': defects,
        'clean': not defects,
        'mixed_meter': mixed,
    }

def analyze_text(text, limit=40):
    """النصّ الكامل → استجابة /api/analyze (نفس الشكل في الويب وفي APK)."""
    lines = [l for l in re.split(r'[\n\r]+', text or '') if l.strip()]
    if not lines:
        return None
    cov = tashkeel_coverage(' '.join(lines))
    verses = []
    for line in lines[:limit]:
        sadr, ajuz = split_verse(line)
        try:
            verses.append(analyze_one(sadr, ajuz))
        except Exception as e:
            verses.append({'error': str(e),
                           'sadr': {'text': sadr, 'feet': []},
                           'ajuz': {'text': ajuz, 'feet': []}})
    meters = [v['meter_ar'] for v in verses if v.get('meter_ar')]
    return {
        'verses': verses,
        'dominant_meter': max(set(meters), key=meters.count) if meters else None,
        'tashkeel_coverage': round(cov, 2),
        'low_tashkeel': cov < 0.35,
        'tashkeel_hint': TASHKEEL_HINT if cov < 0.35 else '',
        'words_without_tashkeel': words_without_tashkeel(' '.join(lines)),
        'qafiyah_report': qafiyah_report(verses),
    }
