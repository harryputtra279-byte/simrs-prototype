// Service Worker — SIMRS PROTOTYPE
// Strategi: cache-first untuk app shell, supaya aplikasi tetap bisa dibuka offline.
// Data pasien/kunjungan/transaksi tersimpan di localStorage milik browser (per perangkat),
// bukan lewat service worker ini.
//
// PENTING: SW_VERSION harus dinaikkan setiap kali salah satu modules/*.js, style.css, atau qrcode.lib.js berubah,
// supaya browser tahu ada versi baru dan mengambil file segar (bukan memakai cache lama selamanya).
const SW_VERSION = 'v16.5.12';
const CACHE_NAME = 'simrs-prototype-' + SW_VERSION;
const APP_SHELL = [
  './',
  './index.html',
  './theme-system.js?v=16.5.12',
  './style.css?v=16.5.12',
  './modules/rawat-inap/core.js?v=16.5.12',
  './modules/01-core-store-master.js?v=16.5.12',
  './modules/02-navigation-auth-shell.js?v=16.5.12',
  './modules/03-patient-app.js?v=16.5.12',
  './modules/04-registration-booking.js?v=16.5.12',
  './modules/05-outpatient.js?v=16.5.12',
  './modules/06-diagnostics-pharmacy-cashier.js?v=16.5.12',
  './modules/07-inpatient-medical-records.js?v=16.5.12',
  './modules/08-queue-igd-bootstrap.js?v=16.5.12',

  './qrcode.lib.js',
  './manifest.json',
  './theme-system.js?v=16.5.12',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchAndUpdate = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch((error) => { if (cached) return cached; throw error; });
      // Jaga service worker tetap hidup sampai pembaruan cache di latar belakang selesai,
      // supaya kunjungan BERIKUTNYA mendapat file yang sudah segar (bukan macet di cache lama).
      event.waitUntil(fetchAndUpdate.catch(() => {}));
      return cached || fetchAndUpdate;
    })
  );
});
