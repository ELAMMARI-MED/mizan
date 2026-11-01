
/* يشغّل pyarud-main.js الفعلي (نفس ملف الموقع) مع Pyodide الحقيقي،
   وindexURL محلي لأن Node لا يستورد https. الباقي (التنزيل، فكّ pyarud.zip، التحليل) كما هو. */
import path from 'node:path';
import fs from 'node:fs';

const DOCS = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'docs');
const CDN = 'file://' + path.resolve(path.dirname(new URL(import.meta.url).pathname), '.cdncache') + '/';
globalThis.self = globalThis;          // في المتصفح self موجودة؛ هنا نُهيّئها
 globalThis.MIZAN_PYODIDE_CDN = path.resolve(path.dirname(new URL(import.meta.url).pathname), '.cdncache') + '/';
globalThis.MIZAN_PYODIDE_IMPORT = CDN + 'pyodide.mjs';

const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : (input && input.url) || String(input);
  if (!/^https?:/.test(url)) console.log('[fetch]', JSON.stringify(url), '| isShimCall');
  if (/^https?:/.test(url)) return realFetch(url, init);
  const file = url.startsWith('file://')
    ? decodeURIComponent(new URL(url).pathname)
    : path.join(DOCS, decodeURIComponent(url.replace(/^.*\/mizan\//, '')));
  if (fs.existsSync(file)) return new Response(new Uint8Array(fs.readFileSync(file)), { status: 200 });
  console.log('[fetch] 404 for', JSON.stringify(url));
  return new Response('not found', { status: 404 });
};

const t0 = Date.now();
const mod = await import(path.join(DOCS, 'pyarud-main.js'));
const data = await mod.analyze('عَلى قَدْرِ أَهْلِ العَزْمِ تَأْتِي العَزائِمُ | وَتَأْتِي عَلى قَدْرِ الكِرامِ المَكارِمُ');
const v = data.verses[0];
console.log(`boot+analyze ${((Date.now()-t0)/1000).toFixed(1)}s`);
console.log('meter:', v.meter_ar, '| valid:', v.is_valid, '| feet:', v.sadr.feet.length, '| pattern:', v.standard_pattern);
console.log('nearest:', v.nearest.map(n => n.meter_ar + ' ' + n.similarity).join(' · '));
const t1 = Date.now();
const again = await mod.analyze('هَلْ غَادَرَ الشُّعَرَاءُ مِنْ مُتَرَدِّمِ | أَمْ هَلْ عَرَفْتَ الدَّارَ بَعْدَ تَوَهُّمِ');
console.log('warm:', ((Date.now()-t1)/1000).toFixed(2)+'s ·', again.verses[0].meter_ar);
