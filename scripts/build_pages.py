#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
بناء مجلد docs/ لنشره على GitHub Pages.

الصفحات ثابتة، فالمحرك (Python) يعمل داخل المتصفح عبر Pyodide:
  docs/pyarud.zip  = pyarud + prosody_core.py
  docs/pyarud-main.js  = يحمّل Pyodide ويتشغّل في الصفحة (لا عامل: 314 يرفض الكلاسيكي)
على الخادم المحلي وداخل الـ APK يبقى المسار الأصلي: POST /api/analyze.

    python3 scripts/build_pages.py            # بناء docs/
"""
import json
import pathlib
import shutil
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ROOT / 'docs'

FILES = [
    'index.html', 'app.js', 'styles.css', 'sw.js', 'manifest.json',
    'pyarud-main.js', 'icon-192.png', 'icon-512.png',
]
DIRS = ['fonts']


def build_zip():
    """pyarud.zip — حزمة بايثون للـ Pyodide: pyarud + prosody_core.py."""
    import pyarud  # noqa: PLC0415  (يُستورد هنا لأنه قد لا يكون مثبتًا عند البناء فقط)
    src = pathlib.Path(pyarud.__file__).parent
    out = DOCS / 'pyarud.zip'
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in sorted(src.rglob('*.py')):
            z.write(f, 'pyarud/' + str(f.relative_to(src)))
        z.write(ROOT / 'prosody_core.py', 'prosody_core.py')
    return out


def main():
    if DOCS.exists():
        shutil.rmtree(DOCS)
    DOCS.mkdir(parents=True)

    for name in FILES:
        src = ROOT / name
        if not src.exists():
            print(f'  ✗ مفقود: {name}')
            return 1
        shutil.copy2(src, DOCS / name)

    for d in DIRS:
        shutil.copytree(ROOT / d, DOCS / d,
                        ignore=shutil.ignore_patterns('_*.css', '_*.json', '*.md'))

    zpath = build_zip()
    (DOCS / '.nojekyll').write_text('', encoding='utf-8')

    total = sum(f.stat().st_size for f in DOCS.rglob('*') if f.is_file())
    print(f'▸ docs/ جاهز — {len([f for f in DOCS.rglob("*") if f.is_file()])} ملفًا، '
          f'{total / 1024 / 1024:.2f} م.ب (منها pyarud.zip {zpath.stat().st_size / 1024:.0f} ك.ب)')
    for f in sorted(DOCS.rglob('*')):
        if f.is_file():
            print(f'   {f.relative_to(DOCS)}  {f.stat().st_size / 1024:.1f} KB')

    # تحقّق سريع: كل ما تشير إليه index.html موجود داخل docs/
    import re
    html = (DOCS / 'index.html').read_text(encoding='utf-8')
    refs = [u for u in re.findall(r'(?:href|src)="([^"]+)"', html) if not u.startswith(('http', '#', 'data:'))]
    missing = [r for r in refs if not (DOCS / r.split('?')[0]).exists()]
    if missing:
        print('  ✗ مراجع مفقودة في docs/:', missing)
        return 1
    print(f'  ✓ كل مراجع index.html موجودة ({len(refs)})')
    return 0


if __name__ == '__main__':
    sys.exit(main())