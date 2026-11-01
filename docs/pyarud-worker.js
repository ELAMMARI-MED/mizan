/* pyarud-worker.js — محرك العروض داخل المتصفح (يُستعمل حين لا يوجد خادم، كما في GitHub Pages).
   يحمّل Pyodide من CDN، ثم يفكّ pyarud.zip المرفق مع الموقع، ويشغّل نفس prosody_core.py
   الذي يعمل على الخادم وداخل الـ APK — فالمحرك واحد في المواضع الثلاثة. */
const PYODIDE_VERSION = 'v314.0.7';
const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/' + PYODIDE_VERSION + '/full/';

importScripts(PYODIDE_CDN + 'pyodide.js');

let bootPromise = null;

function boot() {
  if (!bootPromise) {
    bootPromise = (async () => {
      postMessage({ type: 'status', text: 'يُهيّئ محرّك العروض أوّل مرّة (تنزيل المحرّك ~10 م.ب)…' });
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
        '__import__("builtins")._MIZAN_READY = True',
      ].join('\n'));

      postMessage({ type: 'status', text: '' });
      return py;
    })().catch((err) => {
      bootPromise = null;
      throw err;
    });
  }
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