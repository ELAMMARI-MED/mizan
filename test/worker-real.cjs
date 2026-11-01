
const { Worker } = require('node:worker_threads');
const path = require('node:path');
const DOCS = path.resolve(__dirname, '..', 'docs');
const CDN = 'file://' + path.resolve(__dirname, '.cdncache') + '/';

const text = 'عَلى قَدْرِ أَهْلِ العَزْمِ تَأْتِي العَزائِمُ | وَتَأْتِي عَلى قَدْرِ الكِرامِ المَكارِمُ';
const w = new Worker(path.join(__dirname, 'worker-boot.mjs'), {
  workerData: { docs: DOCS, cdn: CDN, text, workerUrl: 'https://elammari-med.github.io/mizan/pyarud-worker.js' },
});
let done = false;
const t0 = Date.now();
setTimeout(() => { if (!done) { console.log('TIMEOUT'); w.terminate(); process.exit(1); } }, 240000);
w.on('message', (m) => {
  if (m.type === 'status') { console.log(`[${((Date.now()-t0)/1000).toFixed(1)}s] status:`, m.text || '(cleared)'); return; }
  done = true;
  if (!m.ok) { console.log('ENGINE ERROR:', m.error); w.terminate(); process.exit(1); }
  const v = m.data.verses[0];
  console.log(`[${((Date.now()-t0)/1000).toFixed(1)}s] OK ·`, v.meter_ar, '| valid:', v.is_valid, '| feet:', v.sadr.feet.length);
  console.log('pattern:', v.standard_pattern);
  console.log('qafiyah:', JSON.stringify(m.data.qafiyah_report).slice(0, 100));
  w.terminate(); process.exit(0);
});
w.on('error', (e) => { console.log('WORKER ERROR:', e && e.message); process.exit(1); });
