/* pyarud-worker.js — محرك العروض داخل المتصفح (نسخة الموقع المنشور بلا خادم).
   عامل وحدة (module worker): يحمّل Pyodide من CDN ثم يفكّ pyarud.zip المرفق مع الموقع،
   ويشغّل نفس prosody_core.py الذي يعمل على الخادم وداخل الـ APK.

   ملاحظة مهمّة: Pyodide 314 يرفض العوامل الكلاسيكية صراحةً
   («Classic web workers are not supported»)، فلا بدّ من {type:'module'} عند إنشاء العامل. */
const PYODIDE_CDN = self.MIZAN_PYODIDE_CDN ||
  'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';

let bootPromise = null;

async function boot() {
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    postMessage({ type: 'status', text: 'يُهيّئ محرّك العروض أوّل مرّة (تنزيل المحرّك ~10 م.ب)…' });

    const importUrl = (self.MIZAN_PYODIDE_IMPORT) || (PYODIDE_CDN + 'pyodide.mjs');
    const mod = await import(importUrl);
    const loadPyodide = mod.loadPyodide || (mod.default && mod.default.loadPyodide);
    if (!loadPyodide) throw new Error('Pyodide لم يُحمَّل');

    const py = await loadPyodide({ indexURL: PYODIDE_CDN });

    const zipUrl = new URL('pyarud.zip', self.location).toString();
    const res = await fetch(zipUrl);
    if (!res.ok) throw new Error('pyarud.zip: HTTP ' + res.status);
    py.FS.writeFile('/tmp/pyarud.zip', new Uint8Array(await res.arrayBuffer()));
    py.runPython([
      'import sys, zipfile',
      "zipfile.ZipFile('/tmp/pyarud.zip').extractall('/lib')",
      "sys.path.insert(0, '/lib')",
      'import prosody_core',
    ].join('\n'));

    postMessage({ type: 'status', text: '' });
    return py;
  })().catch((err) => {
    bootPromise = null;
    const msg = String((err && err.message) || err);
    postMessage({ type: 'status', text: 'تعذّر تشغيل المحرك: ' + msg });
    throw err;
  });
  return bootPromise;
}

self.onmessage = async (ev) => {
  const { id, text } = ev.data || {};
  try {
    const py = await boot();
    py.globals.set('_mizan_text', String(text || ''));
    const out = py.runPython(
      'import json, prosody_core\n' +
      'json.dumps(prosody_core.analyze_text(_mizan_text), ensure_ascii=False)'
    );
    postMessage({ id: id, ok: true, data: JSON.parse(out) });
  } catch (err) {
    postMessage({ id: id, ok: false, error: String((err && err.message) || err) });
  }
};