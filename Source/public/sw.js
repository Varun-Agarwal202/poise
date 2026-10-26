// Pinpoise service worker: lets the game open and play offline. Today's puzzle only depends on the date, so it works with no network.
// HTML is network-first so a new deploy is picked up as soon as you are online. Hashed assets never change, so they are cache-first.
const CACHE = 'poise-v8';
const SHELL = ['./', './manifest.webmanifest', './icon.svg'];

// Install also precaches whatever the HTML references (hashed JS/CSS, font, icons): on a first visit those load before this worker controls the page.
async function precache() {
  const c = await caches.open(CACHE);
  await c.addAll(SHELL);
  const html = await (await c.match('./')).text();
  const urls = [...html.matchAll(/(?:href|src)="(\.\/[^"#?]+)"/g)].map(m => m[1]).filter(u => !SHELL.includes(u));
  await Promise.all(urls.map(u => c.add(u).catch(() => {})));
}
self.addEventListener('install', e => { e.waitUntil(precache().then(() => self.skipWaiting())) });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(k => k.put('./', c)); return res }).catch(() => caches.match('./', { ignoreVary: true })));
    return;
  }
  if (/\/(assets|fonts)\//.test(u.pathname) || /\.(png|svg|webmanifest)$/.test(u.pathname)) {
    e.respondWith(caches.match(r, { ignoreVary: true }).then(hit => hit || fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(k => k.put(r, c)) } return res })));
  }
});
