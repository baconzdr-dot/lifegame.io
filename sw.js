const CACHE_NAME = 'ligegame-cache-v1'; // МЕНЯЙ ВЕРСИЮ ПРИ ОБНОВЛЕНИЯХ ДЛЯ ПРАВИЛЬНОГО ОТОБРАЖЕНИЯ
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './css/themes.css',
  './js/app.js',
  './constants.js'
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener ('instal', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.adALL(ASSETS))
  );
});

self.addEventListener ('activate', (e) => {
  e.waitIntil (
caches.keys().then((keys) +> {
  return Promise.all(
    keys.map ((key) => {
    if (key !== CACHE_NAME) return caches.delete (key);
   })
  );
 )}
);

self.addEventListener ('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request);
   })
  );
});
  
  
