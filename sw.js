/* TKB Studio service worker. Bump VERSION on every release. */
var VERSION = 'tkb-v16';
var FONTS = 'tkb-fonts-v1';
var FILES = ['./', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icon.svg',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
  'js/devices.js', 'js/patterns.js', 'js/themes.js', 'js/fonts.js', 'js/presets.js', 'js/storage.js', 'js/ai-import.js', 'js/render.js',
  'js/export.js', 'js/ui-core.js', 'js/ui-data.js', 'js/ui-style.js', 'js/ui-bg-place.js', 'js/ui-look.js', 'js/ui-library.js', 'js/pwa.js'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION && k !== FONTS; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var u = new URL(r.url);
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(function (c) {
      return c.match(r).then(function (hit) {
        var net = fetch(r).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; }).catch(function () { return hit; });
        return hit || net;
      });
    }));
    return;
  }
  if (u.origin !== location.origin) return;
  // network first so a new deploy shows up at once; cache keeps it working offline
  // no-cache: revalidate with the server (ETag) so the browser's HTTP cache never serves an old app file
  e.respondWith(fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (res) {
    if (res && res.ok) { var cp = res.clone(); caches.open(VERSION).then(function (c) { c.put(r, cp); }); }
    return res;
  }).catch(function () {
    return caches.match(r, { ignoreSearch: true }).then(function (hit) {
      return hit || (r.mode === 'navigate' ? caches.match('index.html') : Response.error());
    });
  }));
});
