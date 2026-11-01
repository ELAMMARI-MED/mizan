/* pyarud-main.js — نفس محرك الموقع لكن على الخيط الرئيسي (ESM).
   يُستعمل بديلًا إذا فشل عامل الوحدة (متصفح يحجب العوامل، أو سياسة صارمة).
   يُستورد ديناميكيًّا من app.js: const m = await import('./pyarud-main.js'); m.analyze(text) */
const PYODIDE_CDN = (typeof self !== 'undefined' && self.MIZAN_PYODIDE_CDN) ||
  'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';

let bootPromise = null;

async function boot() {
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    const importUrl = (self.MIZAN_PYODIDE_IMPORT) || (PYODIDE_CDN + 'pyodide.mjs');
    const mod = await import(importUrl);
    const loadPyodide = mod.loadPyodide || (mod.default && mod.default.loadPyodide);
    if (!loadPyodide) throw new Error('Pyodide لم يُحمَّل');
    const py = await loadPyodide({ indexURL: PYODIDE_CDN });

    const base = typeof document !== 'undefined' ? document.baseURI : import.meta.url;
    const res = await fetch(new URL('pyarud.zip', base).toString());
    if (!res.ok) throw new Error('pyarud.zip: HTTP ' + res.status);
    py.FS.writeFile('/tmp/pyarud.zip', new Uint8Array(await res.arrayBuffer()));
    py.runPython([
      'import sys, zipfile',
      "zipfile.ZipFile('/tmp/pyarud.zip').extractall('/lib')",
      "sys.path.insert(0, '/lib')",
      'import prosody_core',
    ].join('\n'));
    return py;
  })().catch((err) => {
    bootPromise = null;
    throw err;
  });
  return bootPromise;
}

export async function analyze(text) {
  const py = await boot();
  py.globals.set('_mizan_text', String(text || ''));
  const out = py.runPython(
    'import json, prosody_core\n' +
    'json.dumps(prosody_core.analyze_text(_mizan_text), ensure_ascii=False)'
  );
  return JSON.parse(out);
}

export const ready = () => boot();