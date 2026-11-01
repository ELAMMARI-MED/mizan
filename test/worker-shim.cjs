
/* يشغّل docs/pyarud-worker.js كما هو داخل worker_threads، مع إخفاء آثار Node
   حتى يسلك محمّل Pyodide مسار المتصفح (fetch) لا مسار fs. */
const { parentPort, workerData } = require('node:worker_threads');
const fs = require('node:fs');
const path = require('node:path');

globalThis.self = globalThis;
globalThis.location = new URL(workerData.workerUrl);
globalThis.postMessage = (msg) => parentPort.postMessage(msg);
const realFetch = globalThis.fetch;
const DOCS = workerData.docs;

globalThis.importScripts = (url) => {
  const code = fs.readFileSync(path.join(workerData.cache, url.split('/').pop()), 'utf8');
  (0, eval)(code);
  if (typeof globalThis.loadPyodide !== 'function') throw new Error('no loadPyodide');
};

globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : (input && input.url) || String(input);
  if (/^https?:/.test(url)) return realFetch(url, init);
  const rel = decodeURIComponent(url.replace(/^.*\/mizan\//, ''));
  const file = path.join(DOCS, rel);
  if (fs.existsSync(file)) {
    return new Response(new Uint8Array(fs.readFileSync(file)), { status: 200 });
  }
  return new Response('not found', { status: 404 });
};

// إخفاء Node كي يختار Pyodide مسار الشبكة
delete globalThis.process;
delete globalThis.require;
delete globalThis.module;
delete globalThis.Buffer;

eval(fs.readFileSync(path.join(DOCS, 'pyarud-worker.js'), 'utf8'));

setTimeout(() => {
  globalThis.onmessage({ data: { id: 7, text: workerData.text } });
}, 50);
