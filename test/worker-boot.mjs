
/* يشغّل pyarud-worker.js (عامل وحدة) داخل worker_threads مع محاكاة بيئة متصفح:
   WorkerGlobalScope + غياب process كي يسلك Pyodide مسار fetch لا مسار fs. */
import { parentPort, workerData } from 'node:worker_threads';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

globalThis.self = globalThis;
globalThis.location = new URL(workerData.workerUrl);
globalThis.postMessage = (msg) => parentPort.postMessage(msg);

const realFetch = globalThis.fetch;
const DOCS = workerData.docs;

globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : (input && input.url) || String(input);
  if (/^https?:/.test(url)) return realFetch(url, init);
  if (url.startsWith('file://')) {
    const p = decodeURIComponent(new URL(url).pathname);
    if (fs.existsSync(p)) return new Response(new Uint8Array(fs.readFileSync(p)), { status: 200 });
    return new Response('not found', { status: 404 });
  }
  const rel = decodeURIComponent(url.replace(/^.*\/mizan\//, ''));
  const file = path.join(DOCS, rel);
  if (fs.existsSync(file)) return new Response(new Uint8Array(fs.readFileSync(file)), { status: 200 });
  return new Response('not found', { status: 404 });
};

// بيئة "عامل ويب" كما يتحقق منها Pyodide
class WorkerGlobalScope {}
Object.setPrototypeOf(globalThis, WorkerGlobalScope.prototype);
globalThis.WorkerGlobalScope = WorkerGlobalScope;
globalThis.MIZAN_PYODIDE_CDN = workerData.cdn;

// إخفاء آثار Node
for (const k of ['process', 'require', 'module', 'Buffer']) {
  try { delete globalThis[k]; } catch (e) {}
}

await import(pathToFileURL(path.join(DOCS, 'pyarud-worker.js')).href);
setTimeout(() => globalThis.onmessage({ data: { id: 11, text: workerData.text } }), 50);
