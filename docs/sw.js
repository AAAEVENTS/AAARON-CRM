const CACHE='aaaron-onework-charcoal-20261024';
const SHELL=['./','./index.html','./styles.css','./app.js','./charts.js','./reports.js','./dashboard.js','./ai.js','./demo-data.js','./assets/logo.png','./assets/icon-192.png','./assets/icon-512.png','./assets/logo-wordmark.svg','./assets/logo-lockup.png','./assets/logo-mark-reversed.svg','./assets/logo-wordmark-reversed.svg','./assets/fonts/figtree-latin-wght.woff2'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
/* Network first, cache fallback. config.js (Supabase keys) is never cached. */
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||u.pathname.includes('config.js'))return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok&&SHELL.some(s=>u.pathname.endsWith(s.replace('./','/')))){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request)))});
