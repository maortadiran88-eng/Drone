// Service Worker — פתיחת האתר גם בלי קליטה (אחרי ביקור אחד עם אינטרנט).
// נתוני הקטלוג עצמם לא עוברים כאן (Firestore לא נתפס); עותק הנתונים נשמר ב-js/offline.js.
// אסטרטגיה: רשת קודם (תמיד הגרסה העדכנית כשיש קליטה), ואם אין תשובה תוך 4 שניות או אין רשת — העותק השמור.
const CACHE = 'tadiran-shell-v1';
const NET_TIMEOUT = 4000;

// רק קבצי האתר ו-CDN מוכרים. לעולם לא Firestore / Google APIs.
const allowed = u => {
  if (u.origin === self.location.origin) return true;
  if (u.hostname === 'unpkg.com' || u.hostname === 'cdnjs.cloudflare.com') return true;
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') return true;
  if (u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/')) return true;
  return false;
};

// כתובות הקבצים שה-index.html טוען (כולל הגרסה העדכנית של dist/app.js)
const assetsFromHtml = (html, base) => {
  const out = new Set([base.href]);
  const re = /(?:src|href)=["']([^"']+)["']/g; let m;
  while ((m = re.exec(html))) {
    try { const u = new URL(m[1], base); if (/^https?:$/.test(u.protocol) && allowed(u)) out.add(u.href); } catch (e) {}
  }
  return [...out];
};

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      const base = new URL('./', self.location.href);
      const res = await fetch(base.href, {cache:'reload'});
      const html = await res.clone().text();
      await cache.put(base.href, res);
      await Promise.all(assetsFromHtml(html, base).filter(h => h !== base.href).map(async h => {
        try {
          const cross = new URL(h).origin !== self.location.origin;
          await cache.put(h, await fetch(new Request(h, {mode: cross ? 'no-cors' : 'same-origin', cache:'reload'})));
        } catch (err) {}
      }));
    } catch (err) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

const networkFirst = async (req, isNav) => {
  const cache = await caches.open(CACHE);
  const fromCache = async () =>
    (await cache.match(req)) || (await cache.match(req, {ignoreSearch:true})) ||
    (isNav ? (await cache.match(new URL('./', self.location.href).href)) || (await cache.match('index.html')) : undefined);
  try {
    const net = await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout')), NET_TIMEOUT);
      fetch(req).then(r => { clearTimeout(t); resolve(r); }, err => { clearTimeout(t); reject(err); });
    });
    if (net && (net.ok || net.type === 'opaque')) cache.put(isNav ? new URL('./', self.location.href).href : req, net.clone()).catch(() => {});
    return net;
  } catch (err) {
    const c = await fromCache();
    if (c) return c;
    throw err;
  }
};

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let u; try { u = new URL(req.url); } catch (err) { return; }
  if (!allowed(u)) return;                      // Firestore ועוד — ישירות לרשת
  const isNav = req.mode === 'navigate';
  e.respondWith(networkFirst(req, isNav));
});
