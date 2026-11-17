// Service worker: makes the app installable and loads faster.
// Your financial pages are NEVER cached (they always come fresh from the server);
// only the app's static files (JS, CSS, icons) are kept, and a simple message is
// shown when there is no internet.
const STATIC_CACHE = 'static-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const OFFLINE_HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sem conexão</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#120d1a;color:#e2e8f0;text-align:center;padding:24px}
button{margin-top:16px;padding:10px 18px;border:0;border-radius:12px;background:#7c3aed;color:#fff;font-size:15px}</style></head>
<body><div><h1 style="font-size:20px">Sem conexão</h1><p>Seus dados ficam no servidor. Conecte-se à internet para ver seus gastos.</p>
<button onclick="location.reload()">Tentar de novo</button></div></body></html>`;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages: always from the network; offline message if there is no connection.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
    return;
  }

  // Versioned static files and icons: cache first.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
  }
});
