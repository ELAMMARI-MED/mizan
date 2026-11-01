/* المِيزان service worker — القشرة تُجلب من الشبكة أوّلًا (ثم الكاش عند عدم الاتصال).
   cache-first هنا كان يُخفي كل تعديل على الواجهة، لأن /index.html يبقى مخزّنًا بلا تحقّق. */
const CACHE = 'mizan-v8';
// مسارات نسبيّة: تعمل على الجذر (خادم/APK) وعلى /mizan/ (GitHub Pages) بلا تعديل
const STATIC = [
  './',
  'index.html',
  'styles.css?v=7',
  'app.js?v=7',
  'manifest.json',

  'pyarud-main.js',
  'pyarud.zip',
  'fonts/fonts.css',
  'fonts/amiri-arabic-400.woff2',
  'fonts/amiri-arabic-700.woff2',
  'fonts/amiri-latin-400.woff2',
  'fonts/amiri-latin-700.woff2',
  'fonts/reem-kufi-arabic.woff2',
  'fonts/reem-kufi-latin.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(STATIC.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    const stale = keys.filter((k) => k !== CACHE);
    await Promise.all(stale.map((k) => caches.delete(k)));
    await self.clients.claim();
    // كاش قديم يعني واجهة قديمة: أعد تحميل النوافذ المفتوحة مرّة واحدة
    if (stale.length) {
      const wins = await self.clients.matchAll({ type: 'window' });
      wins.forEach((w) => w.navigate(w.url).catch(() => {}));
    }
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // المحرك لا يُخزَّن أبدًا
  if (url.pathname.startsWith('/api/')) return;

  e.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: 'no-store' });
      if (fresh && fresh.ok && url.origin === location.origin) {
        const copy = fresh.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return fresh;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const shell = await caches.match('index.html');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});