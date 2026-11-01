/* ═══ المِيزان — app ═══ */
'use strict';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(() => {
    // عامل خدمة جديد أخذ السيطرة بعد تحديث: إعادة تحميل واحدة تكفي لظهور النسخة الجديدة
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      try {
        if (sessionStorage.getItem('mizan.reloaded')) return;
        sessionStorage.setItem('mizan.reloaded', '1');
        location.reload();
      } catch (e) {}
    });
  }).catch(() => {});
}

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* ── الوضع النهاري/الليلي ── */
const THEME_KEY = 'mizan.theme';
const ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2M12 19.4v2M2.6 12h2M19.4 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/></svg>';
const ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20.4 14.4A8.4 8.4 0 1 1 9.6 3.6a6.6 6.6 0 0 0 10.8 10.8z"/></svg>';

function applyTheme(t) {
  const theme = (t === 'light') ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  const meta = $('#theme-color');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0d1512' : '#f6f9f3');
  const btn = $('#theme-toggle');
  if (btn) {
    btn.innerHTML = theme === 'dark' ? ICON_SUN : ICON_MOON;
    btn.title = theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي';
    btn.setAttribute('aria-pressed', String(theme === 'dark'));
  }
}

(function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(saved || (prefersLight ? 'light' : 'dark'));
  $('#theme-toggle').addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });
})();

/* ── حجم الخط ── */
const SIZE_KEY = 'mizan.size';
const SIZES = [0.92, 1, 1.1, 1.22];
let sizeIdx = 1;

function applySize(i) {
  sizeIdx = Math.max(0, Math.min(SIZES.length - 1, i));
  document.documentElement.style.setProperty('--zoom', SIZES[sizeIdx]);
  try { localStorage.setItem(SIZE_KEY, String(sizeIdx)); } catch (e) {}
  const lbl = $('#size-label');
  if (lbl) lbl.textContent = ['ص', 'ص+', 'ص++', 'ص+++'][sizeIdx];
  $$('.size-btn').forEach(b => b.setAttribute('aria-pressed',
    String(b.dataset.size === (sizeIdx === 1 ? 'md' : (sizeIdx < 1 ? 'sm' : 'lg')))));
}

(function initSize() {
  let saved = null;
  try { saved = localStorage.getItem(SIZE_KEY); } catch (e) {}
  applySize(saved === null ? 1 : parseInt(saved, 10) || 1);
  $$('.size-btn').forEach(b => b.addEventListener('click', () => {
    applySize(sizeIdx + (b.dataset.size === 'sm' ? -1 : 1));
  }));
})();

/* ── navigation ── */
$$('[data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.nav-btn').forEach(b => b.classList.remove('active'));
    const navBtn = btn.classList.contains('nav-btn') ? btn : $('.nav-btn[data-view="' + btn.dataset.view + '"]');
    if (navBtn) navBtn.classList.add('active');
    $$('.view').forEach(v => v.classList.remove('active'));
    const view = $('#view-' + btn.dataset.view);
    if (view) view.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

/* ── small toast (لا يعرض تشخيصًا، مجرد تأكيد) ── */
let toastTimer = null;
function toast(msg) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

/* ── samples (fully vowelled, from public-domain diwans) ── */
const SAMPLES = {
  mutanabbi: 'عَلى قَدْرِ أَهْلِ العَزْمِ تَأْتِي العَزائِمُ | وَتَأْتِي عَلى قَدْرِ الكِرامِ المَكارِمُ',
  antar: 'هَلْ غَادَرَ الشُّعَرَاءُ مِنْ مُتَرَدِّمِ | أَمْ هَلْ عَرَفْتَ الدَّارَ بَعْدَ تَوَهُّمِ',
  basit: 'يَا عَبْلَ إِنْ كَانَ ظِلُّ القَسْطَلِ الحَلِكِ | أَخْفَى عَلَيْكِ قِتَالِي يَوْمَ مُعْتَرَكِي',
  ramal: 'يَا أَبَا اليَقْظَانِ أَغْوَاكَ الطَّمَعُ | سَوْفَ تَلْقَى فَارِسًا لَا يَنْدَفِعُ',
};

$$('.btn-sample').forEach(btn => {
  btn.addEventListener('click', () => {
    $('#poem-input').value = SAMPLES[btn.dataset.sample] || '';
    runAnalyze();
  });
});

$('#btn-clear').addEventListener('click', () => {
  $('#poem-input').value = '';
  $('#results').innerHTML = '';
  $('#warning-box').classList.add('hidden');
  const qp = $('#qafiyah-panel');
  if (qp) { qp.hidden = true; qp.innerHTML = ''; }
  lastData = null;
  $('#btn-copy').disabled = true;
});

$('#btn-analyze').addEventListener('click', runAnalyze);

/* ── أدوات: نسخ · طباعة · سجل ── */
let lastData = null;

function scansionText(data) {
  const L = [];
  L.push('المِيزان — تقطيع شعري');
  (data.verses || []).forEach((v, i) => {
    L.push('');
    L.push((i + 1) + ') ' + (v.meter_ar || '؟') + (v.is_valid ? ' — مطابق' : ' — غير مطابق') +
           (v.score != null ? ' (' + Math.round(v.score * 100) + '٪)' : ''));
    if (v.standard_pattern) L.push('   الرموز: ' + v.standard_pattern);
    [['الصدر', v.sadr], ['العجز', v.ajuz]].forEach(([label, sh]) => {
      if (!sh || !sh.feet || !sh.feet.length) return;
      L.push('   ' + label + ':');
      sh.feet.forEach(f => {
        L.push('     ' + (f.actual || f.base || '—') + '  [' + (f.segment || '') + ']  ' +
               (f.zihaf_ar || '') + '  «' + (f.text || '') + '»');
      });
    });
    if (v.qafiyah_text) L.push('   القافية: ' + v.qafiyah_text + (v.rawi ? ' | الرويّ: ' + v.rawi : ''));
  });
  const q = data.qafiyah_report;
  if (q && q.defects && q.defects.length) {
    L.push('');
    L.push('عيوب القافية:');
    q.defects.forEach(d => L.push(' - ' + d.name_ar + ': ' + d.detail));
  }
  L.push('');
  L.push('الميزان - أداة لتقطيع الشعر العربي من إنجاز محمد العماري');
  return L.join('\n');
}

$('#btn-copy').addEventListener('click', async () => {
  if (!lastData) return;
  const txt = scansionText(lastData);
  try {
    await navigator.clipboard.writeText(txt);
    toast('نُسخت النتيجة');
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = txt;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('نُسخت النتيجة'); }
    catch (e2) { toast('تعذّر النسخ — حدّد النص يدويًا'); }
    ta.remove();
  }
});

const btnPrint = $('#btn-print');
if (btnPrint) btnPrint.addEventListener('click', () => window.print());

/* ── السجل ── */
const HKEY = 'mizan.history';
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HKEY) || '[]').filter(x => x && x.t); }
  catch (e) { return []; }
}
function pushHistory(text, data) {
  const h = loadHistory();
  if (h[0] && h[0].t === text) return;
  h.unshift({ t: text, m: (data && data.dominant_meter) || '', at: Date.now() });
  try { localStorage.setItem(HKEY, JSON.stringify(h.slice(0, 10))); } catch (e) {}
  renderHistory();
}
function renderHistory() {
  const panel = $('#history-panel');
  if (!panel) return;
  const h = loadHistory();
  if (!h.length) {
    panel.innerHTML = '<p class="panel-empty">لا تحليلات محفوظة بعد.</p>';
    return;
  }
  panel.innerHTML = h.map((x, i) =>
    '<button class="history-item" data-i="' + i + '">' +
    '<span class="hi-meter">' + esc(x.m || '—') + '</span>' +
    '<span class="hi-text">' + esc(x.t.slice(0, 70)) + (x.t.length > 70 ? '…' : '') + '</span>' +
    '</button>').join('');
  $$('.history-item').forEach(btn => btn.addEventListener('click', () => {
    const item = h[parseInt(btn.dataset.i, 10)];
    if (!item) return;
    $('#poem-input').value = item.t;
    panel.hidden = true;
    runAnalyze();
  }));
}
$('#btn-history').addEventListener('click', () => {
  const panel = $('#history-panel');
  panel.hidden = !panel.hidden;
  if (!panel.hidden) renderHistory();
});
renderHistory();

/* ── المحرك: خادم محلي إن وُجد (خادم التطوير / APK)، وإلّا Pyodide في الصفحة نفسها.
   GitHub Pages لا يشغّل Python، فنسخة الويب تحمّل pyarud-main.js وتعمل على الخيط الرئيسي.
   (العامل لم يُستعمل: Pyodide 314 يرفض العوامل الكلاسيكية، وعوامل الوحدة قد تبقى بلا ردّ.) ── */
let mainEnginePromise = null;

function engineNote(text) {
  const el = $('#engine-note');
  if (!el) return;
  el.textContent = text || '';
  el.hidden = !text;
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(label + ' (تجاوز ' + Math.round(ms / 1000) + ' ث)')), ms)),
  ]);
}

async function mainThreadAnalyze(text) {
  // خطّاف للاختبار: يسمح بحقن محرك مزيّف في بيئة jsdom
  if (typeof window !== 'undefined' && typeof window.__MIZAN_ENGINE__ === 'function') {
    return window.__MIZAN_ENGINE__(text);
  }
  engineNote('يُهيّئ محرّك العروض أوّل مرّة (تنزيل ~10 م.ب، ثم يعمل من الكاش)…');
  if (!mainEnginePromise) mainEnginePromise = import('./pyarud-main.js');
  try {
    const mod = await withTimeout(mainEnginePromise, 60000, 'تعذّر تحميل محرك المتصفح');
    const data = await withTimeout(mod.analyze(text), 180000, 'تعذّر تحليل النص');
    engineNote('');
    return data;
  } catch (e) {
    mainEnginePromise = null;  // محاولة أخرى في الضغط التالي
    engineNote('⚠️ ' + (e && e.message ? e.message : e) + ' — استعمل تطبيق الأندرويد أو الخادم المحلي.');
    throw e;
  }
}

async function analyzeText(text) {
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const ct = (res.headers.get && res.headers.get('content-type')) || '';
    if (res.ok && ct.indexOf('json') !== -1) return await res.json();
  } catch (e) { /* لا خادم على هذا النطاق */ }
  return mainThreadAnalyze(text);
}

/* ── analyze ── */
async function runAnalyze() {
  const text = $('#poem-input').value.trim();
  if (!text) return;
  const btn = $('#btn-analyze');
  btn.disabled = true;
  btn.textContent = '...';
  try {
    const data = await analyzeText(text);
    if (data.error) {
      $('#results').innerHTML = '<div class="warning-box">' + esc(data.error) + '</div>';
      return;
    }
    lastData = data;
    render(data);
    pushHistory(text, data);
    $('#btn-copy').disabled = false;
  } catch (e) {
    $('#results').innerHTML =
      '<div class="warning-box">تعذّرت الوصول إلى المحرك. تأكد أن الخادم يعمل.</div>';
  } finally {
    btn.disabled = false;
    btn.textContent = 'قطِّع ✦';
  }
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* 1 = حركة، 0 = سكون — كل رقم في عنصر خاص ليأخذ لونه ويُقرأ من اليمين */
function digits(str) {
  return esc(str || '').replace(/[01]/g, d => '<i class="d' + d + '">' + d + '</i>');
}

function render(data) {
  const warn = $('#warning-box');
  const missing = data.words_without_tashkeel || [];
  if (data.low_tashkeel) {
    warn.innerHTML = '<div class="warn-title">⚠️ النص غير مشكَّل كفاية (' +
      Math.round((data.tashkeel_coverage || 0) * 100) + '٪ من الحروف عليها حركة)</div>' +
      '<div class="warn-body">الوزن يُقارَن بالنطق، فنتائج التقطيع قد تكون خاطئة.</div>' +
      (missing.length ? '<div class="warn-words">كلمات بلا حركات: ' +
        missing.slice(0, 24).map(w => '<span class="miss-word">' + esc(w) + '</span>').join('') +
        (missing.length > 24 ? '<span class="miss-more">و' + (missing.length - 24) + ' غيرها</span>' : '') +
        '</div>' : '');
    warn.classList.remove('hidden');
  } else {
    warn.classList.add('hidden');
  }

  const out = $('#results');
  out.innerHTML = '';
  if (data.dominant_meter && data.verses.length > 1) {
    const head = document.createElement('div');
    head.className = 'verse-head';
    head.style.cssText = 'border-radius:14px;border:1px solid var(--line);margin-top:18px';
    head.innerHTML = '<span class="meter-badge">البحر الغالب: ' + esc(data.dominant_meter) +
      '</span><span class="score-chip">من ' + data.verses.length + ' أبيات</span>';
    out.appendChild(head);
  }
  data.verses.forEach(v => out.appendChild(verseCard(v)));
  renderQafiyah(data);
}

function feetRow(label, sh) {
  if (!sh || !sh.feet || !sh.feet.length) return '';
  let html = '<div class="shatr"><div class="shatr-label">' + label + '</div><div class="feet-row">';
  sh.feet.forEach(f => {
    const cls = f.status === 'ok' ? '' : (f.status === 'extra' ? ' extra' : ' broken');
    const isZahif = f.zihaf_ar && f.zihaf_ar.indexOf('سالمة') === -1;
    const zihaf = isZahif
      ? '<button class="zahif-btn" type="button" data-zihaf="' + esc(f.zihaf_ar) + '">' +
        esc(f.zihaf_ar) + '</button><div class="zahif-note" hidden></div>'
      : '<span class="foot-zihaf">' + esc(f.zihaf_ar || '') + '</span>';
    html += '<div class="foot' + cls + '">' +
      '<span class="foot-text">' + esc(f.text) + '</span>' +
      '<span class="foot-name">' + esc(f.actual || f.base || '—') + '</span>' +
      zihaf +
      '<span class="seg-digits">' + digits(f.segment || '') + '</span>' +
      '</div>';
  });
  html += '</div></div>';
  return html;
}

/* شرح الزحافات عند النقر */
const ZIHAF = [
  ['خبن', 'الخَبْن', 'حذف الثاني الساكن من التفعيلة: مُسْتَفْعِلُنْ ← مُتَفْعِلُنْ، فَاعِلَاتُنْ ← فَعِلَاتُنْ.'],
  ['قبض', 'القَبْض', 'حذف الخامس الساكن: مَفَاعِيلُنْ ← مَفَاعِلُنْ.'],
  ['طي', 'الطَّي', 'حذف الرابع الساكن: مُسْتَفْعِلُنْ ← مُسْتَعِلُنْ.'],
  ['وقص', 'الوَقْص', 'حذف الثاني المتحرك: مُتَفَاعِلُنْ ← مُتْفَاعِلُنْ.'],
  ['كف', 'الكَفّ', 'حذف السابع الساكن: مَفَاعِيلُنْ ← مَفَاعِيلُ.'],
  ['شتر', 'الشَّتْر', 'حذف السابع المتحرك: مَفْعُولَاتُ ← مَفْعُولَاتْ.'],
  ['خزل', 'الخَزْل', 'حذف الرابع المتحرك من مُتَفَاعِلُنْ.'],
  ['خبل', 'الخَبْل', 'حذف الخامس المتحرك من مُتَفَاعِلُنْ.'],
  ['عصب', 'العَصْب', 'تسكين الخامس المتحرك: مُتَفَاعِلُنْ ← مُتَفَاعِلُنْ (مُتَفَاعِلْ).'],
  ['عقل', 'العَقْل', 'حذف الخامس المتحرك من مُفَاعَلَتُنْ.'],
  ['نقص', 'النَّقْص', 'زحاف في «مُتَفَاعِلُنْ» بحذف الخامس المتحرك.'],
  ['عضم', 'العَضْم', 'إسكان الحرف الثاني أو حذفه في نحو «مُسْتَفْعِلُنْ».'],
  ['ثرم', 'الثَّرْم', 'حذف الثاني الساكن من «مَفَاعِيلُنْ».'],
  ['جذب', 'الجَذْب', 'زحاف بتحريك الساكن أو تسكين المتحرك في الحشو.'],
  ['حذذ', 'الحَذَذ', 'حذف الثاني الساكن من سبب التفعيلة.'],
];
function zihafInfo(name) {
  const bare = String(name || '').replace(/[\u064b-\u0652]/g, '');
  for (const [key, title, desc] of ZIHAF) {
    if (bare.indexOf(key) !== -1) return { title, desc };
  }
  return { title: 'زحاف', desc: 'تغيير جائز في أسباب التفعيلة، لا يخرج البيت عن بحره.' };
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.zahif-btn');
  if (!btn) return;
  const note = btn.nextElementSibling;
  if (!note || !note.classList.contains('zahif-note')) return;
  if (!note.dataset.filled) {
    const info = zihafInfo(btn.dataset.zihaf);
    note.innerHTML = '<b>' + esc(info.title) + ':</b> ' + esc(info.desc);
    note.dataset.filled = '1';
  }
  note.hidden = !note.hidden;
  btn.setAttribute('aria-expanded', String(!note.hidden));
});

function verseCard(v) {
  const card = document.createElement('div');
  card.className = 'verse-card';
  if (v.error) {
    card.innerHTML = '<div class="verse-head"><span class="meter-badge invalid">خطأ</span></div>' +
      '<div class="shatr"><span class="foot-text">' + esc((v.sadr && v.sadr.text) || '') + '</span></div>' +
      '<div class="explain-hint">' + esc(v.error) + '</div>';
    return card;
  }
  const scorePct = Math.min(100, Math.round((v.score || 0) * 100));
  let html = '<div class="verse-head">' +
    '<span class="meter-badge' + (v.is_valid ? '' : ' invalid') + '">' + esc(v.meter_ar || '؟') + '</span>' +
    '<span class="score-chip">مطابقة ' + scorePct + '٪</span>' +
    '<span class="pattern-chip">' + digits(v.standard_pattern || '') + '</span>' +
    '</div>';
  html += feetRow('الصدر', v.sadr);
  html += feetRow('العجز', v.ajuz);

  if (!v.is_valid) html += explainBlock(v);

  if (v.qafiyah_text) {
    html += '<div class="qafiya-row">' +
      '<span>القافية: <b>' + esc(v.qafiyah_text) + '</b></span>' +
      (v.rawi ? '<span>الرويّ: <b>' + esc(v.rawi) + '</b></span>' : '') +
      (v.qafiyah_type_ar ? '<span>نوعها: <b>' + esc(v.qafiyah_type_ar) + '</b></span>' : '') +
      (v.tasees ? '<span>التأسيس: <b>' + esc(v.tasees) + '</b></span>' : '') +
      (v.dakhil ? '<span>الدَّخيل: <b>' + esc(v.dakhil) + '</b></span>' : '') +
      (v.ridf ? '<span>الرِّدف: <b>' + esc(v.ridf) + '</b></span>' : '') +
      '</div>';
  }
  card.innerHTML = html;
  return card;
}

function explainBlock(v) {
  const ex = v.explain;
  let html = '<div class="explain-box"><div class="explain-title">لماذا لم يطابق؟</div>';
  if (ex) {
    html += '<div class="explain-line">أوّل تفعيلة خالفت الوزن: <b>' + esc(ex.side) +
      ' · التفعيلة ' + ex.foot_index + '</b>' + (ex.text ? ' «' + esc(ex.text) + '»' : '') + '</div>' +
      '<div class="explain-grid">' +
      '<div><span class="eg-label">المتوقَّع</span><span class="eg-val">' + esc(ex.base || '—') +
      ' <code class="digits">' + digits(ex.expected || '') + '</code></span></div>' +
      '<div><span class="eg-label">الموجود</span><span class="eg-val">' + esc(ex.actual || '—') +
      ' <code class="digits">' + digits(ex.got || '') + '</code></span></div>' +
      '</div>';
    if (ex.zihaf_ar && ex.zihaf_ar.indexOf('سالمة') === -1) {
      const info = zihafInfo(ex.zihaf_ar);
      html += '<div class="explain-hint">التغيير الملاحظ: <b>' + esc(ex.zihaf_ar) + '</b> — ' + esc(info.desc) + '</div>';
    }
    if (ex.status === 'extra') {
      html += '<div class="explain-hint">حروف زائدة بعد آخر تفعيلة: قد يكون الشطر أطول من البحر، أو فيه كلمة زائدة.</div>';
    }
  } else {
    html += '<div class="explain-line">لم يتحدد موضع الخلل بدقة؛ جرّب تشكيل النص كاملًا أو مراجعة الشطر الآخر.</div>';
  }
  if (v.nearest && v.nearest.length) {
    html += '<div class="nearest-row">أقرب البحور: ' + v.nearest.map(n =>
      '<span class="nearest-chip">' + esc(n.meter_ar.replace('بحر ', '')) + ' ' +
      Math.round(n.similarity * 100) + '٪</span>').join('') + '</div>';
  }
  html += '</div>';
  return html;
}

/* ── لوحة القافية العامة ── */
function renderQafiyah(data) {
  const box = $('#qafiyah-panel');
  if (!box) return;
  const q = data.qafiyah_report;
  if (!q || !q.verse_count) { box.hidden = true; box.innerHTML = ''; return; }
  const defects = q.defects || [];
  box.hidden = false;
  box.innerHTML = '<div class="panel-head"><h3>القافية في الأبيات (' + q.verse_count + ')</h3>' +
    (defects.length ? '<span class="panel-badge warn">' + defects.length + ' ملاحظة</span>'
                    : '<span class="panel-badge ok">سليمة</span>') + '</div>' +
    '<div class="panel-body">' +
    (q.rawi && q.rawi.length ? '<div class="qafiya-row"><span>الرويّ: ' +
      q.rawi.map(r => '<b>' + esc(r) + '</b>').join(' · ') + '</span></div>' : '') +
    (defects.length
      ? '<ul class="qafiya-defects">' + defects.map(d =>
          '<li><b>' + esc(d.name_ar) + '</b><span>' + esc(d.detail) + '</span></li>').join('') + '</ul>'
      : '<p class="qafiya-clean">لا إيطاء ولا سِناد ولا توجيه ظاهر — الرويّ واحد وحركته واحدة.</p>') +
    '<p class="panel-note">الفحص يقوم على الرويّ وحركته وتكرار كلمة القافية داخل سبعة أبيات.</p>' +
    '</div>';
}

/* ── اختصارات: Ctrl+Enter للتحليل، وتحليل تلقائي عند اللصق ── */
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    runAnalyze();
  }
});
$('#poem-input').addEventListener('paste', () => {
  setTimeout(() => { if ($('#poem-input').value.trim().length > 12) runAnalyze(); }, 260);
});

/* ── رأس مُصغَّر عند التمرير ── */
window.addEventListener('scroll', () => {
  const h = $('.site-header');
  if (h) h.classList.toggle('compact', window.scrollY > 60);
}, { passive: true });

/* ═══════════ البحور الستة عشر ═══════════ */
// Patterns audited against pyarud canonical tafeelat + Wikipedia (بحر شعر).
const BAHUR = [
  { n: 'الطَّويل', p: 'فَعُولُنْ مَفَاعِيلُنْ فَعُولُنْ مَفَاعِلُنْ', s: 'وَفَاءً بِعَهْدِي جِئْتُهُ وَهُوَ وَاجِدُ', s2: 'وَلَمَّا يُسَلِّينِي الزَّمَانُ المُعَانِدُ', note: 'أكثر البحور استعمالًا في المدح والرثاء والحكمة.' },
  { n: 'المَديد', p: 'فَاعِلَاتُنْ فَاعِلُنْ فَاعِلَاتُنْ', s: 'لَيْسَ يَدْرِي نَاعِسُ الجَفْنِ حَالِي', s2: 'مَا لِقَلْبِي كُلَّمَا مَالَ غُصْنٌ', note: 'مجزوءه شائع في الأغاني.' },
  { n: 'البَسِيط', p: 'مُسْتَفْعِلُنْ فَاعِلُنْ مُسْتَفْعِلُنْ فَاعِلُنْ', s: 'غَابَتْ شُمُوسُ الدُّجَى فِي الأُفُقِ وَاهِنَةً', s2: 'وَاسْتَلَّني ظِلُّ خَطْوِي وَهُوَ يَنْفَرِدُ', note: 'واسع، صالح للمديح الطويل.' },
  { n: 'الوَافِر', p: 'مُفَاعَلَتُنْ مُفَاعَلَتُنْ فَعُولُنْ', s: 'فُؤَادٌ لَا يُسَلِّيهِ المُدَامُ', s2: 'وَلَا رَاحَاتُهَا وَلَا الشَّمَالُ', note: 'سُمِّي وافرًا لوَفَرِ حركاته.' },
  { n: 'الكَامِل', p: 'مُتَفَاعِلُنْ مُتَفَاعِلُنْ مُتَفَاعِلُنْ', s: 'نَطَقَتْ وَكَانَ الثَّغْرُ يَبْسِمُ هَائِمًا', s2: 'مِنِّي وَقَبْلَ الحَرْفِ مِنْهَا بَاسِمَا', note: 'لا يسلم حشوُه من الزحاف غالبًا.' },
  { n: 'الهَزَج', p: 'مَفَاعِيلُنْ مَفَاعِيلُنْ', s: 'تَبِعْنَا سَيِّدَ النَّاسِ', s2: 'بِشَرْعٍ كَامِلٍ رَاسِي', note: 'مخفف، استعمله المولدون في الأغاني.' },
  { n: 'الرَّجَز', p: 'مُسْتَفْعِلُنْ مُسْتَفْعِلُنْ مُسْتَفْعِلُنْ', s: 'هَلْ مُنْتَهٍ يَا حَازِمَ بنَ رِزقِ', s2: 'عَمَّا رُزِقْتَ مِنْ خَنًا وَحُمْقِ', note: 'بحر الأرجوزات العلمية.' },
  { n: 'الرَّمَل', p: 'فَاعِلَاتُنْ فَاعِلَاتُنْ فَاعِلَاتُنْ', s: 'هَكَذَا الدُّنْيَا بِجَرْيٍ لِلزَّمَانِ', s2: 'عُمْرُهَا إِنْ جَازَ عَنَّا كَالثَّوَانِي', note: 'خفيف رشيق، أكثر البحور غنائية.' },
  { n: 'السَّرِيع', p: 'مُسْتَفْعِلُنْ مُسْتَفْعِلُنْ مَفْعُولاتُ', s: 'بِالمَالِ لَا يُبَاعُ أَوْ ذَهَبٍ', s2: 'إِنْ لَمْ يُصَنْ فَسَيْرُنَا زَلَلُ', note: 'من بحور الفخر والحماسة.' },
  { n: 'المُنْسَرِح', p: 'مُسْتَفْعِلُنْ مَفْعُولاتُ مُسْتَفْعِلُنْ', s: 'سَمْرَاءُ حَسْنَاءُ زَانَهَا الأَدَبُ', s2: 'مَهْمَا يَقُولُوا فِيهَا فَقَدْ كَذَبُوا', note: 'قليل الاستعمال؛ يُزحَف صدره بالخبن والطي.' },
  { n: 'الخَفِيف', p: 'فَاعِلَاتُنْ مُسْتَفْعِلُنْ فَاعِلَاتُنْ', s: 'كَوْكَبَ السَّعْدِ يَا أَخَا المَهْرَجَانِ', s2: 'دُمْتَ فِي الشِّعْرِ فَارِسَ المَيْدَانِ', note: 'لا يستعمل إلا مخبونًا.' },
  { n: 'المُضَارِع', p: 'مَفَاعِيلُنْ فَاعِ لاتُنْ', s: 'شَبِيهِي الَّذِي يُمَارِي', s2: 'يُحَاكِي كَذَا يُجَارِي', note: 'قليل، من بحور الموشحات.' },
  { n: 'المُقْتَضَب', p: 'مَفْعُولاتُ فَاعِلُنْ', s: 'طَبْعُهَا هُوَ العَجَبُ', s2: 'لَيْسَ يُدْرَكُ السَّبَبُ', note: 'نادر الاستعمال.' },
  { n: 'المُجْتَثّ', p: 'مُسْتَفْعِلُنْ فَاعِلاتُنْ', s: 'يَا مُصْطَفَى يَا إِمَامِي', s2: 'عَلَيْكَ أَزْكَى سَلَامِي', note: 'نادر؛ لا يأتي إلا مخبونًا.' },
  { n: 'المُتَقَارِب', p: 'فَعُولُنْ فَعُولُنْ فَعُولُنْ فَعُولُنْ', s: 'أَزَيْنَ النِّسَاءِ وَزَيْنَ البَشَرْ', s2: 'أَجِيبِي سُؤَالِي فَقَلْبِي ضَجَرْ', note: 'مستعمل في الأمثال.' },
  { n: 'المُتَدَارَك', p: 'فَاعِلُنْ فَاعِلُنْ فَاعِلُنْ فَاعِلُنْ', s: 'يُفْنِي الأَحْبَابُ مَوَدَّتَهُمْ', s2: 'مِنْ رِيبَةِ فِعْلٍ قَدْ يَظْهَرْ', note: 'زاده الأخفش، وبحره مطعونٌ فيه عند الخليل.' },
];

$('#meters-grid').innerHTML = BAHUR.map(b =>
  '<div class="bahr-card"><h3>بحر ' + b.n + '</h3>' +
  '<div class="bahr-pattern">' + b.p + '</div>' +
  '<div class="bahr-sample">' + b.s + '</div>' +
  (b.s2 ? '<div class="bahr-sample">' + b.s2 + '</div>' : '') +
  '<div class="bahr-note">' + b.note + '</div></div>'
).join('');

/* ── glossary ── */
const TERMS = [
  ['العَرُوض', 'علم معرفة أوزان الشعر العربي، وضعه الخليل بن أحمد الفراهيدي باستقراء شعر العرب.'],
  ['التفعيلة', 'الوحدة الإيقاعية المتكررة في البيت، مثل «مَفَاعِيلُنْ»، وتتركب من أسباب وأوتاد.'],
  ['السَّبب الخفيف', 'حرفان: متحرك فساكن «فَعْ» (10).'],
  ['السَّبب الثقيل', 'حرفان متحركان «فَعَل» (00).'],
  ['الوَتَد', 'وتد مجموع (3) ووتد مفروق، وهو أصل التفعيلة لا يُزحَف عنه.'],
  ['الزِّحاف', 'تغيير جائز في أسباب التفعيلة (كالخَبْن والقَبْض والطَّي).'],
  ['العِلّة', 'تغيير لازم في آخر التفعيلة (العروض أو الضرب) كالحذف والقطع والقصر.'],
  ['العَروض', 'التفعيلة الأخيرة من الصدر، وبها يُعرف البحر غالبًا.'],
  ['الضَّرْب', 'التفعيلة الأخيرة من العجز.'],
  ['الحَشْو', 'تفعيلات البيت ما عدا العروض والضرب.'],
  ['القافية', 'الحروف من آخر ساكن في البيت إلى أول ساكن مع المتحرك قبله؛ فيها الرويّ والوصل والخروج.'],
  ['الرَّوِيّ', 'الحرف الأخير الذي تُبنى عليه القافية (حرف الاستسجام).'],
  ['الإيطاء', 'إعادة كلمة القافية نفسها بمعناها في بيت قريب — عيب من عيوب القافية.'],
  ['السِّناد', 'اختلاف الرويّ (أو حركته) بين أبيات القصيدة.'],
  ['التوجيه', 'اختلاف حركة الرويّ مع اتحاد الحرف — من عيوب القافية.'],
  ['المجزوء والمشطور والمنهوك', 'أبنية ناقصة الأوتاد: المجزوء يحذف عروضًا وضربًا، والمشطور يبقى بشطر، والمنهوك بجزء.'],
];
$('#glossary-list').innerHTML = TERMS.map(t =>
  '<div class="term-card"><h3>' + t[0] + '</h3><p>' + t[1] + '</p></div>'
).join('');

/* ═══════════ التدريب ═══════════ */
const normAr = (s) => String(s || '')
  .replace(/[\u064b-\u0652\u0670]/g, '')
  .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/^بحر\s+/, '').replace(/\s+/g, '')
  .trim();

const POOL = BAHUR.map(b => ({ text: b.s + ' | ' + (b.s2 || ''), meter: b.n }));
let practice = { asked: 0, right: 0, answer: null, busy: false };

function practiceScore() {
  const el = $('#practice-score');
  if (el) el.textContent = practice.asked ? practice.right + ' / ' + practice.asked : '—';
}

async function newQuestion() {
  if (practice.busy) return;
  practice.busy = true;
  const box = $('#practice-question');
  const opts = $('#practice-options');
  const fb = $('#practice-feedback');
  box.textContent = '...';
  opts.innerHTML = '';
  fb.hidden = true;
  const item = POOL[Math.floor(Math.random() * POOL.length)];
  let detected = item.meter;
  try {
    const d = await analyzeText(item.text);
    if (d && d.dominant_meter) detected = d.dominant_meter;
  } catch (e) { /* المحرك غير متاح: نستخدم اسم البحر من القائمة */ }

  practice.answer = detected;
  box.textContent = item.text.replace(' | ', '  ۞  ');
  // الخيار الصحيح هو ما قرّره المحرك؛ لو خالف تصنيفَ القائمة نُدرجه كما هو
  const allNames = BAHUR.map(b => b.n);
  const correct = allNames.find(n => normAr(n) === normAr(detected)) || item.meter;
  practice.answer = correct;
  const others = allNames.filter(n => normAr(n) !== normAr(correct));
  const picks = [correct];
  while (picks.length < 4 && others.length) {
    picks.push(others.splice(Math.floor(Math.random() * others.length), 1)[0]);
  }
  picks.sort(() => Math.random() - 0.5);
  opts.innerHTML = picks.map(n =>
    '<button class="practice-opt" data-meter="' + esc(n) + '">بحر ' + esc(n) + '</button>').join('');
  $$('.practice-opt').forEach(b => b.addEventListener('click', () => answerQuestion(b)));
  practice.busy = false;
}

function answerQuestion(btn) {
  if (btn.disabled) return;
  const chosen = btn.dataset.meter;
  const right = normAr(chosen) === normAr(practice.answer);
  practice.asked += 1;
  if (right) practice.right += 1;
  $$('.practice-opt').forEach(b => {
    b.disabled = true;
    if (normAr(b.dataset.meter) === normAr(practice.answer)) b.classList.add('correct');
    else if (b === btn) b.classList.add('wrong');
  });
  const fb = $('#practice-feedback');
  fb.hidden = false;
  fb.className = 'practice-feedback ' + (right ? 'ok' : 'bad');
  fb.innerHTML = (right ? '✅ صحيح — ' : '❌ ليس كذلك — الصواب: ') +
    '<b>بحر ' + esc(practice.answer.replace('بحر ', '')) + '</b>';
  practiceScore();
}

if ($('#practice-next')) {
  $('#practice-next').addEventListener('click', newQuestion);
  newQuestion();
  practiceScore();
}