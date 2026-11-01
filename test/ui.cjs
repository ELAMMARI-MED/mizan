
const { createRequire } = require('node:module');
const { JSDOM } = createRequire('/data/data/com.termux/files/home/maktaba-tools/')('jsdom');
const path = require('path'); const fs = require('fs'); const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.MIZAN_BASE || 'http://127.0.0.1:8096';
const dom = new JSDOM(fs.readFileSync(ROOT+'/index.html','utf8'), {url: BASE+'/', pretendToBeVisual:true});
const w = dom.window;
const st = w.document.createElement('style'); st.textContent = fs.readFileSync(ROOT+'/styles.css','utf8'); w.document.head.append(st);
globalThis.window = w; globalThis.document = w.document;
Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});
Object.defineProperty(globalThis,'localStorage',{value:w.localStorage,configurable:true});
globalThis.HTMLElement=w.HTMLElement; globalThis.Node=w.Node; globalThis.Event=w.Event;
globalThis.requestAnimationFrame=(f)=>setTimeout(f,16);
w.scrollTo = () => {};
globalThis.matchMedia = w.matchMedia = () => ({matches:false, addListener(){}, removeListener(){}});
const errors=[]; w.addEventListener('error', e => errors.push(String(e.message)));
const realFetch = globalThis.fetch;
globalThis.fetch = (u, o) => realFetch(new URL(u, BASE).toString(), o);
const q=(s)=>document.querySelector(s), qa=(s)=>Array.from(document.querySelectorAll(s));
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const ok=[], bad=[];
function check(name, cond, extra){ (cond?ok:bad).push(name + (extra!==undefined?' → '+extra:'')); }
const dir=(el)=> el ? w.getComputedStyle(el).direction : 'none';

(async()=>{
 try {
  await import(ROOT+'/app.js');
  await wait(400);
  check('nav has 5 buttons', qa('.nav-btn').length === 5, qa('.nav-btn').length);
  check('practice view exists', !!q('#view-practice'));
  check('digits legend', !!q('.digits-legend .d1'));

  q('#poem-input').value = 'عَلى قَدْرِ أَهْلِ العَزْمِ تَأْتِي العَزائِمُ | وَتَأْتِي عَلى قَدْرِ الكِرامِ المَكارِمُ';
  q('#btn-analyze').click();
  await wait(3000);
  const card = q('.verse-card');
  check('verse card rendered', !!card, card ? card.className : 'none');
  check('meter badge', /الطويل/.test((q('.meter-badge')||{}).textContent||''), (q('.meter-badge')||{}).textContent);
  check('coloured digits pattern', qa('.pattern-chip .d1').length > 5, qa('.pattern-chip .d1').length);
  check('coloured digits feet', qa('.seg-digits .d1').length > 5 && qa('.seg-digits .d0').length > 3,
        qa('.seg-digits .d1').length+'/'+qa('.seg-digits .d0').length);
  check('pattern rtl', dir(q('.pattern-chip')) === 'rtl', dir(q('.pattern-chip')));
  check('qafiyah panel shown', !q('#qafiyah-panel').hidden, (q('#qafiyah-panel')||{}).textContent?.slice(0,50));
  check('qafiyah ok badge', !!q('#qafiyah-panel .panel-badge.ok'));
  check('history saved', JSON.parse(w.localStorage.getItem('mizan.history')||'[]').length === 1);
  check('copy enabled', q('#btn-copy').disabled === false);
  check('no explain for valid', !q('.explain-box'));
  if (card) { const res = q('#results').textContent.replace(/\s+/g,' ').slice(0,120); console.log('SAMPLE RESULT:', res); }
 } catch(e){ console.log('THROW 1:', e.message); }

 try {
  q('#poem-input').value = 'الطلاب يذهبون الى المدرسة كل صباح | والمعلمون يشرحون الدرس باجتهاد';
  q('#btn-analyze').click(); await wait(3500);
  check('explain box for invalid', !!q('.explain-box'), (q('.explain-box')||{}).textContent?.slice(0,40));
  check('nearest chips', qa('.nearest-chip').length >= 1, qa('.nearest-chip').length);
  check('missing-word chips', qa('.miss-word').length >= 3, qa('.miss-word').length);
 } catch(e){ console.log('THROW 2:', e.message); }

 try {
  const before = w.document.documentElement.style.getPropertyValue('--zoom');
  q('.size-btn[data-size="lg"]').click();
  const after = w.document.documentElement.style.getPropertyValue('--zoom');
  check('size up changes zoom', before!==after, before+' → '+after);
  check('size stored', w.localStorage.getItem('mizan.size')!==null, w.localStorage.getItem('mizan.size'));
  q('#btn-history').click(); await wait(120);
  check('history items', qa('.history-item').length>=1, qa('.history-item').length);
  q('#btn-history').click();
 } catch(e){ console.log('THROW 3:', e.message); }

 try {
  await wait(600);
  check('practice 4 options', qa('.practice-opt').length===4, qa('.practice-opt').length);
  const opts = qa('.practice-opt');
  if (opts.length) { opts[0].click(); await wait(120); }
  check('practice feedback', q('#practice-feedback').hidden===false);
  check('practice score', /1/.test((q('#practice-score')||{}).textContent||''), (q('#practice-score')||{}).textContent);
  check('practice marks answer', qa('.practice-opt.correct').length===1);
  check('practice disables', qa('.practice-opt').every(b=>b.disabled));
 } catch(e){ console.log('THROW 4:', e.message); }

 try {
  const t0 = w.document.documentElement.dataset.theme;
  q('#theme-toggle').click(); await wait(60);
  check('theme toggles', w.document.documentElement.dataset.theme!==t0, t0+' → '+w.document.documentElement.dataset.theme);
  const html = fs.readFileSync(ROOT+'/index.html','utf8');
  check('no google fonts', !/fonts\.googleapis/.test(html));
  check('local fonts linked', /fonts\/fonts\.css/.test(html));
 } catch(e){ console.log('THROW 5:', e.message); }

 console.log('PASS ('+ok.length+')'); ok.forEach(x=>console.log('  ✓', x));
 if (bad.length){ console.log('FAIL ('+bad.length+')'); bad.forEach(x=>console.log('  ✗', x)); }
 if (errors.length) console.log('JS ERRORS:', errors);
 process.exit(bad.length?1:0);
})();
