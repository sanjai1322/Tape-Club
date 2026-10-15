// Offline support: the 3D room, fonts, art and synth studies work without a connection.
// Bundled MP3s stream from the network. Bump VERSION when you change the file list.
const VERSION='tape-club-v2';
const SHELL=[
  './',
  './assets/aqua.png',
  './assets/cosmic.png',
  './assets/golden.png',
  './assets/midnight.png',
  './assets/pixel.png',
  './fonts/instrument-serif-latin-400-italic.woff2',
  './fonts/instrument-serif-latin-400-normal.woff2',
  './fonts/jetbrains-mono-latin-400-normal.woff2',
  './fonts/jetbrains-mono-latin-600-normal.woff2',
  './fonts/space-grotesk-latin-400-normal.woff2',
  './fonts/space-grotesk-latin-500-normal.woff2',
  './fonts/space-grotesk-latin-700-normal.woff2',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './index.html',
  './js/analytics.js',
  './js/app.js',
  './js/audio.js',
  './js/cassette-finish.js',
  './js/cassette.js',
  './js/config.js',
  './js/environment.js',
  './js/library.js',
  './js/player.js',
  './js/playlist-store.js',
  './js/playlist-ui.js',
  './js/playlists.js',
  './js/rack.js',
  './js/resources.js',
  './js/share.js',
  './js/state.js',
  './js/themes.js',
  './js/transport.js',
  './js/youtube-player.js',
  './manifest.webmanifest',
  './music-credits.html',
  './style.css',
  './vendor/BufferGeometryUtils.js',
  './vendor/OBB.js',
  './vendor/OrbitControls.js',
  './vendor/gsap.min.js',
  './vendor/three.module.min.js',
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request,url=new URL(req.url);
  // Leave audio streaming (range requests), analytics, YouTube and other sites to the network.
  if(req.method!=='GET'||url.origin!==location.origin||req.headers.has('range')||url.pathname.includes('/audio/'))return;
  // Network first, so a new deploy is never mixed with old files; the cache is the offline fallback.
  e.respondWith(fetch(req).then(res=>{if(res.ok&&res.status===200){const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy));}return res;})
    .catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||(req.mode==='navigate'?caches.match('./'):Response.error()))));
});
