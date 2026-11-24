// ก้าวรวมใจ — service worker: ใช้เครือข่ายก่อนเสมอ (ได้ไฟล์ใหม่ล่าสุด) ถ้าเน็ตหลุดค่อยใช้สำเนาในเครื่อง
// ไม่แคช /api/ เพราะข้อมูลการเดินและคำของานอดิเรกต้องเรียกเซิร์ฟเวอร์จริงเท่านั้น
const CACHE = 'kaoruamjai-v9';
const SHELL = [
  './', 'app', 'credits', '404.html', 'manifest.webmanifest', 'favicon.ico',
  'css/app.css', 'css/site.css',
  'js/boot.js', 'js/nomodule.js', 'js/app.js', 'js/site.js', 'js/pwa.js', 'js/store.js', 'js/ui.js', 'js/health.js', 'js/extras.js', 'js/questions.js',
  'js/core/gait.js', 'js/core/score.js', 'js/core/sign.js', 'js/core/progress.js', 'js/core/assess.js', 'js/core/stats.js',
  'js/core/exercises.js', 'js/core/safety.js', 'js/core/plan-progress.js', 'js/core/mood.js', 'js/core/hobby.js',
  'assets/logo.svg', 'img/icons/icon-192.png', 'img/icons/icon-512.png', 'img/app-step.webp', 'img/app-me.webp', 'img/app-team.webp',
  'assets/character/greet.png', 'assets/character/main.png', 'assets/character/happy.png', 'assets/character/run.png', 'assets/character/sleep.png',
  'assets/character/cute.png', 'assets/character/think.png', 'assets/character/sad.png', 'assets/character/angry.png', 'assets/character/read.png', 'assets/character/work.png',
  'assets/character/head_greet.png', 'assets/character/head_happy.png', 'assets/character/head_main.png', 'assets/character/head_cute.png', 'assets/character/head_think.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});
self.addEventListener('message', (e) => { if (e.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  const fonts = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !fonts) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok && !res.redirected) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || (e.request.mode === 'navigate' ? caches.match(url.pathname.startsWith('/app') ? 'app' : './') : undefined))),
  );
});
