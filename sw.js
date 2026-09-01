/* 职英英语 Service Worker：支持安装 + 离线可用
   策略：页面网络优先（联网总是最新版），断网回退缓存；图标/manifest 缓存优先。 */
const CACHE = 'zhiying-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // 静态资源（图标/manifest）：缓存优先，网络回填
  if (/\.(png|webmanifest|svg|ico|css|js)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(hit => {
        if (hit) { fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); }).catch(() => {}); return hit; }
        return fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(x => x.put(req, copy)); return res; }).catch(() => caches.match(req));
      })
    );
    return;
  }

  // 页面导航：网络优先，离线回退缓存
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(x => x.put('./index.html', copy));
      return res;
    }).catch(() => caches.match('./index.html').then(hit => hit || caches.match('./')))
  );
});
