
/* يتحقق من مسار GitHub Pages: لا خادم → Pyodide worker (مُحاكى) → نفس العرض */
const { createRequire } = require('node:module');
const { JSDOM } = createRequire('/data/data/com.termux/files/home/maktaba-tools/')('jsdom');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', 'docs');
const real = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample.json'), 'utf8'));

const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'),
                      { url: 'https://elammari-med.github.io/mizan/', pretendToBeVisual: true });
const w = dom.window;
const st = w.document.createElement('style');
st.textContent = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
w.document.head.append(st);
globalThis.window = w; globalThis.document = w.document;
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
Object.defineProperty(globalThis, 'localStorage', { value: w.localStorage, configurable: true });
globalThis.HTMLElement = w.HTMLElement; globalThis.Node = w.Node; globalThis.Event = w.Event;
w.scrollTo = () => {};
globalThis.matchMedia = w.matchMedia = () => ({ matches: false, addListener(){}, removeListener(){} });

// خادم Pages: /api/analyze غير موجود (404 HTML) — فالمسار البديل هو العامل
let apiHits = 0;
globalThis.fetch = async (u) => {
  apiHits++;
  return { ok: false, status: 404, headers: { get: () => 'text/html' }, json: async () => ({}) };
};

// عامل مُحاكى بنفس بروتوكول pyarud-worker.js
let workerCreated = null;
let workerOpts = null;
globalThis.Worker = class FakeWorker {
  constructor(url, opts) { workerCreated = String(url); workerOpts = opts; this.onmessage = null; this.onerror = null; }
  postMessage(msg) {
    setTimeout(() => {
      this.onmessage({ data: { type: 'status', text: 'يُهيّئ محرّك العروض أوّل مرّة…' } });
      setTimeout(() => this.onmessage({ data: { id: msg.id, ok: true, data: real } }), 60);
    }, 20);
  }
};

const q = (s) => document.querySelector(s), qa = (s) => Array.from(document.querySelectorAll(s));
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ok = [], bad = [];
const check = (n, c, e) => (c ? ok : bad).push(n + (e !== undefined ? ' → ' + e : ''));

(async () => {
  await import(path.join(ROOT, 'app.js'));
  await wait(300);
  q('#poem-input').value = 'عَلى قَدْرِ أَهْلِ العَزْمِ تَأْتِي العَزائِمُ | وَتَأْتِي عَلى قَدْرِ الكِرامِ المَكارِمُ';
  q('#btn-analyze').click();
  await wait(2500);

  check('API tried first', apiHits >= 1, apiHits);
  check('worker spawned', workerCreated === 'pyarud-worker.js', workerCreated);
  check('worker is a module worker (Pyodide 314 requires it)', workerOpts && workerOpts.type === 'module', JSON.stringify(workerOpts));
  check('verse rendered from worker', !!q('.verse-card'));
  check('meter correct', /الطويل/.test((q('.meter-badge') || {}).textContent || ''));
  check('feet rendered', qa('.foot').length === 8, qa('.foot').length);
  check('digits coloured', qa('.seg-digits .d1').length > 10, qa('.seg-digits .d1').length);
  check('qafiyah panel', q('#qafiyah-panel') && !q('#qafiyah-panel').hidden);
  check('status note cleared', q('#engine-note').hidden === true);
  check('copy enabled', q('#btn-copy').disabled === false);
  check('sw registered relatively', true); // registration needs a real SW stack; inspected statically below
  const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  check('sw paths relative', !swSrc.includes("'/index.html'") && swSrc.includes("'index.html'"));
  const appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  check('sw register uses relative url', appSrc.includes("register('sw.js')"));

  console.log('PASS (' + ok.length + ')'); ok.forEach(x => console.log('  ✓', x));
  if (bad.length) { console.log('FAIL (' + bad.length + ')'); bad.forEach(x => console.log('  ✗', x)); }
  process.exit(bad.length ? 1 : 0);
})();
