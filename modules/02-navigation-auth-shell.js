/* =================================================================
   MODUL 02 — NAVIGASI, AUTENTIKASI & KERANGKA UI
   Tanggung jawab: Katalog menu, RBAC, login, sesi, toast/modal, dan helper tampilan bersama.
   Kontrak integrasi: dijalankan sebagai classic script berurutan setelah modul sebelumnya;
   gunakan Store/Session/helper bersama yang sudah didefinisikan. Jangan mengubah urutan pemuatan
   tanpa audit dependensi dan uji alur lintas unit.
   PENCARIAN KODE: modules/02-navigation-auth-shell.js
   ================================================================= */

"use strict"; // Pertahankan semantik strict-mode dari app.js monolitik.
/* INDEKS BANTUAN TAHAP 7
 * Modul: NAVIGASI, AUTENTIKASI & KERANGKA UI
 * Tanggung jawab: Katalog menu, RBAC, login, sesi, toast/modal, helper tampilan bersama.
 * Fungsi yang sering menjadi titik masuk (cari nama fungsi dengan Ctrl+F):
 * - primaryNavHashesForUser
 * - isRouteAllowed
 * - roleLabel
 * - defaultRouteForRole
 * - navigate
 * - currentRoute
 * - render
 * - getVisibleNotifications
 * - renderShell
 * - bindShellEvents
 * - openNotifications
 * - openAdminMenuFolder
 * - openMoreSheet
 * - openAccountSheet
 * - openGlobalSearch
 * - renderGlobalSearchResults
 * - pickGlobalSearchPatient
 * - setPageTitle
 * - closeDrawer
 * - renderLogin
 * - chipsForDemo
 * - handleLogin
 * - doLogin
 * - showToast
 * - openModal
 * - closeModal
 * - printArea
 * - pageIntro
 * - renderAntrianTable
 * - statCard
 * - barRow
 * - renderDashboard
 * Integrasi: fungsi global/Store dipertahankan untuk kompatibilitas classic script.
 * Catatan: jangan memindahkan fungsi lintas modul tanpa audit pemanggil dan uji alur.
 */

/* ================================================================
   NAVIGASI V13.1 — satu katalog menu, lalu disaring oleh RBAC.
   Urutan sengaja dibuat agar menu klinis utama muncul lebih dulu.
   ================================================================ */
const ADMIN_SERVICE_MENU_ROUTES = [
  'pendaftaran','booking','igd','lab','radiologi',
  'farmasi-rawat-jalan','farmasi-rawat-inap','farmasi-igd',
  'kasir-rawat-jalan','kasir-rawat-inap','kasir-igd',
  'rekam-medis','master-data','audit-sistem','cek-antrian','monitor-antrean','monitor-lab','monitor-radiologi'
];

const NAV_ITEMS = [
  {hash:'dashboard',label:'Dashboard',ic:'▦'},
  {hash:'beranda',label:'Beranda',ic:'⌂'},
  {hash:'pendaftaran',label:'Pendaftaran',ic:'📝'},
  {hash:'booking',label:'Booking',ic:'📅'},
  {hash:'poli',label:'Poli',ic:'🩺'},
  {hash:'igd',label:'IGD',ic:'🚑'},
  {hash:'triase-igd',label:'Triase IGD',ic:'🩺'},
  {hash:'dokter-igd',label:'Dokter IGD',ic:'🩻'},
  {hash:'perawat-pelaksana-igd',label:'Perawat Pelaksana IGD',ic:'🩹'},
  {hash:'monitor-igd',label:'Monitor IGD',ic:'🛏️'},
  {hash:'ranap',label:'Rawat Inap',ic:'🏨'},
  {hash:'lab',label:'Laboratorium',ic:'🧪'},
  {hash:'radiologi',label:'Radiologi',ic:'☢️'},
  {hash:'monitor-lab',label:'Monitor Laboratorium',ic:'📊'},
  {hash:'monitor-radiologi',label:'Monitor Radiologi',ic:'📊'},
  {hash:'farmasi-rawat-jalan',label:'Farmasi Rawat Jalan',ic:'💊'},
  {hash:'farmasi-rawat-inap',label:'Farmasi Rawat Inap',ic:'💊'},
  {hash:'farmasi-igd',label:'Farmasi IGD',ic:'💊'},
  {hash:'kasir-rawat-jalan',label:'Kasir Rawat Jalan',ic:'🧾'},
  {hash:'kasir-rawat-inap',label:'Kasir Rawat Inap',ic:'🧾'},
  {hash:'kasir-igd',label:'Kasir IGD',ic:'🧾'},
  {hash:'rekam-medis',label:'Rekam Medis',ic:'📋'},
  {hash:'riwayat-dokter',label:'Riwayat',ic:'🕘'},
  {hash:'riwayat-admin',label:'Riwayat',ic:'🕘'},
  {hash:'master-data',label:'Master Data',ic:'⚙️'},
  {hash:'audit-sistem',label:'Audit Sistem',ic:'🧪'},
  {hash:'cek-antrian',label:'Cek Antrian',ic:'📺'},
  {hash:'monitor-antrean',label:'Monitor',ic:'🖥️'},
  {hash:'informasi-rs',label:'Informasi RS',ic:'ℹ️'},
  {hash:'pasien-dashboard',label:'Beranda',ic:'⌂'},
  {hash:'pasien-booking',label:'Rawat Jalan',ic:'📅'},
  {hash:'pasien-rawat-inap',label:'Rawat Inap',ic:'🏥'},
  {hash:'pasien-info',label:'Informasi',ic:'ℹ️'},
  {hash:'pasien-booking-saya',label:'Booking Saya',ic:'🎫'},
  {hash:'pasien-riwayat',label:'Riwayat',ic:'🕘'}
];

const ROLE_ROUTE_RULES = {
  admin: ['*'],
  monitor_public: ['monitor-antrean'],
  pasien: ['pasien-dashboard','pasien-booking','pasien-info','pasien-booking-saya','pasien-riwayat','pasien-chat'],
  loket: ['pendaftaran','booking','cek-antrian','chat-pasien'],
  // Petugas Rawat Jalan: Monitor menjadi tab utama; Cek Antrian tetap merupakan route sekunder/desktop.
  rawat_jalan: ['pendaftaran','booking','poli','cek-antrian','monitor-antrean','chat-pasien'],
  dokter: ['beranda','poli','rekam-medis','monitor-antrean','chat-pasien'],
  dokter_igd: ['beranda','dokter-igd','monitor-igd','rekam-medis','chat-pasien'],
  perawat_triase_igd: ['beranda','triase-igd','monitor-igd','rekam-medis','chat-pasien'],
  perawat_pelaksana_igd: ['beranda','perawat-pelaksana-igd','monitor-igd','rekam-medis','chat-pasien'],
  dokter_ranap: ['beranda','ranap','rekam-medis','monitor-antrean','chat-pasien'],
  // Perawat Rawat Jalan: Monitor sejajar dengan workspace utama, bukan di Lainnya.
  perawat: ['beranda','poli','rekam-medis','monitor-antrean','chat-pasien'],
  perawat_igd: ['beranda','igd','monitor-igd','rekam-medis','chat-pasien'],
  perawat_ranap: ['beranda','ranap','rekam-medis','monitor-antrean','chat-pasien'],
  admisi_ranap: ['beranda','ranap','monitor-antrean','chat-pasien'],
  lab: ['beranda','lab','monitor-lab','chat-pasien'],
  radiologi: ['beranda','radiologi','monitor-radiologi','chat-pasien'],
  farmasi: ['beranda','farmasi-rawat-jalan','farmasi-rawat-inap','farmasi-igd','chat-pasien'],
  kasir: ['beranda','kasir-rawat-jalan','kasir-rawat-inap','kasir-igd','chat-pasien']
};

// Urutan navbar utama ditetapkan per role agar fungsi penting tidak terdorong ke Menu Lainnya
// hanya karena urutan katalog NAV_ITEMS berubah. Overflow tetap berisi modul sekunder.
const PRIMARY_NAV_BY_ROLE = {
  admin: ['dashboard','poli','pendaftaran','ranap','master-data','beranda'],
  pasien: ['pasien-dashboard','pasien-booking','pasien-info','pasien-booking-saya','pasien-riwayat'],
  loket: ['pendaftaran','booking','cek-antrian'],
  rawat_jalan: ['pendaftaran','booking','poli','monitor-antrean'],
  dokter: ['beranda','poli','monitor-antrean','rekam-medis'],
  dokter_igd: ['beranda','dokter-igd','monitor-igd','rekam-medis'],
  perawat_triase_igd: ['beranda','triase-igd','monitor-igd','rekam-medis'],
  perawat_pelaksana_igd: ['beranda','perawat-pelaksana-igd','monitor-igd','rekam-medis'],
  dokter_ranap: ['beranda','ranap','rekam-medis','monitor-antrean'],
  perawat: ['beranda','poli','rekam-medis','monitor-antrean'],
  perawat_igd: ['beranda','igd','monitor-igd','rekam-medis'],
  perawat_ranap: ['beranda','ranap','rekam-medis','monitor-antrean'],
  admisi_ranap: ['beranda','ranap','monitor-antrean'],
  lab: ['beranda','lab','monitor-lab'],
  radiologi: ['beranda','radiologi','monitor-radiologi'],
  farmasi: ['beranda'],
  kasir: ['beranda']
};

function primaryNavHashesForUser(u){
  if(!u) return [];
  if(u.role==='farmasi') return u.unit==='igd'?['beranda','farmasi-igd','monitor-igd']:['beranda',u.unit==='rawat-inap'?'farmasi-rawat-inap':'farmasi-rawat-jalan'];
  if(u.role==='kasir') return u.unit==='igd'?['beranda','kasir-igd','monitor-igd']:['beranda',u.unit==='rawat-inap'?'kasir-rawat-inap':'kasir-rawat-jalan'];
  return PRIMARY_NAV_BY_ROLE[u.role] || [];
}

function isRouteAllowed(route, role){
  const current=Session.currentUser||{};
  if(route==='monitor-igd'){return role==='admin'||(current.unit==='igd'&&['dokter_igd','perawat_triase_igd','perawat_pelaksana_igd','perawat_igd','farmasi','kasir'].includes(role));}
  const u = Session.currentUser;
  if(!u || !role) return false;
  // Menu pasien tidak boleh bocor ke navigasi staf/admin; pasien memiliki shell sendiri.
  if(role!=='pasien' && route.indexOf('pasien-')===0) return false;
  if(role==='pasien' && ['informasi-rs','chat-pasien'].includes(route)) return false;
  if(role==='admin') return true; // super user
  const allowed = ROLE_ROUTE_RULES[role] || [];
  if(!allowed.includes(route)) return false;

  // Akun pasien hanya boleh berada di ruang pasien.
  if(role==='pasien') return route.indexOf('pasien-')===0 && route!=='pasien-rawat-inap';

  const ctx = routeContext(route);
  if(ctx && u.unit && u.unit!==ctx) return false;

  // Poli rawat jalan wajib mengikuti poli yang melekat pada akun dokter/perawat.
  if((role==='dokter' || role==='perawat') && route==='poli' && !u.poliId) return false;

  // Rekam medis dan riwayat dokter tetap mengikuti unit akun.
  if(route==='riwayat-dokter' && !['dokter','dokter_igd','dokter_ranap'].includes(role)) return false;

  return true;
}

function roleLabel(role){
  return {admin:'Admin', loket:'Petugas Pendaftaran', rawat_jalan:'Petugas Rawat Jalan', admisi_ranap:'Petugas Admisi Rawat Inap', dokter:'Dokter', dokter_igd:'Dokter IGD', perawat_triase_igd:'Perawat Triase IGD', perawat_pelaksana_igd:'Perawat Pelaksana IGD', dokter_ranap:'Dokter Rawat Inap', farmasi:'Apoteker', kasir:'Kasir', lab:'Petugas Laboratorium', radiologi:'Petugas Radiologi', perawat:'Perawat', perawat_igd:'Perawat IGD', perawat_ranap:'Perawat Rawat Inap', pasien:'Pasien'}[role] || role;
}
function defaultRouteForRole(role){
  const u=Session.currentUser||{};
  if(role==='farmasi') return u.unit==='igd'?'farmasi-igd':(u.unit==='rawat-inap'?'farmasi-rawat-inap':'farmasi-rawat-jalan');
  if(role==='kasir') return u.unit==='igd'?'kasir-igd':(u.unit==='rawat-inap'?'kasir-rawat-inap':'kasir-rawat-jalan');
  return ({admin:'dashboard', loket:'pendaftaran', rawat_jalan:'poli', dokter:'poli', dokter_igd:'beranda', perawat_triase_igd:'beranda', perawat_pelaksana_igd:'beranda', dokter_ranap:'ranap', lab:'lab', radiologi:'radiologi', perawat:'poli', perawat_igd:'beranda', perawat_ranap:'ranap', admisi_ranap:'ranap', pasien:'pasien-dashboard'})[role] || 'cek-antrian';
}
function navigate(hash){ location.hash = '#/' + hash; }
function currentRoute(){ return location.hash.replace(/^#\/?/, '').split('?')[0]; }

function render(){
  try{
    if(currentRoute()==='monitor-antrean' && !Session.currentUser){ renderMonitorAntrean(); return; }
    if(!Session.currentUser){ renderLogin(); return; }
    let route = currentRoute();
    if(!route){ location.hash = '#/'+defaultRouteForRole(Session.currentUser.role); return; }
    if(!isRouteAllowed(route, Session.currentUser.role)){
      location.hash = '#/'+defaultRouteForRole(Session.currentUser.role);
      return;
    }
    renderShell(route);
  }catch(err){
    console.error('SIMRS render error:',err);
    const app=document.getElementById('app');
    if(app){
      app.innerHTML='<div style="max-width:760px;margin:40px auto;padding:24px;font-family:system-ui"><h2>SIMRS sedang memulihkan data demo</h2><p>Data browser sebelumnya kemungkinan terhapus. Tekan tombol di bawah untuk membuat ulang data demo.</p><button id="btn-recover-demo" style="padding:12px 18px;border:0;border-radius:12px;cursor:pointer">Pulihkan Data Demo</button><pre style="white-space:pre-wrap;margin-top:16px;opacity:.65">'+esc(err&&err.message?err.message:String(err))+'</pre></div>';
      const b=document.getElementById('btn-recover-demo');
      if(b) b.onclick=function(){ localStorage.removeItem('simrs_db_v1'); localStorage.removeItem('simrs_session_v1'); location.reload(); };
    }
  }
}
window.addEventListener('hashchange', render);

function getVisibleNotifications(){
  const u=Session.currentUser;
  const list=Store.data.notifications||[];
  if(!u) return [];
  if(u.role==='pasien') return list.filter(function(n){ return n.target===u.patientId || n.targetUserId===u.id; });
  return list;
}
function renderShell(route){
  const u = Session.currentUser;
  const visibleNotifications=getVisibleNotifications();
  // Katalog menu SELALU dibatasi oleh RBAC lalu dideduplikasi berdasarkan route.
  // Ini mencegah menu pasien/dokter bocor ke Admin dan mencegah satu route tampil dua kali.
  const items = NAV_ITEMS.filter(n=>isRouteAllowed(n.hash,u.role) && !(u.role==='pasien' && (n.hash==='cek-antrian' || n.hash==='pasien-chat' || /cari|pencarian/i.test(n.label))))
    .filter(function(n,i,arr){ return arr.findIndex(function(x){return x.hash===n.hash;})===i; });
  // Navbar dibatasi maksimal enam menu. Chat selalu berada di kiri atas, bukan di navbar.
  const patientFixedNav = PRIMARY_NAV_BY_ROLE.pasien;
  const primary = u.role==='pasien'
    ? patientFixedNav.map(h=>items.find(n=>n.hash===h)).filter(Boolean)
    : primaryNavHashesForUser(u).map(h=>items.find(n=>n.hash===h)).filter(Boolean);
  const ADMIN_FOLDER_ROUTES = []; 
  const primaryHashes = new Set(primary.map(function(n){return n.hash;}));
  const MOBILE_NAV_HIDDEN_ROUTES = ['cek-antrian'];
  const overflowCandidates = items.filter(function(n){return !primaryHashes.has(n.hash) && !(MOBILE_NAV_HIDDEN_ROUTES.includes(n.hash) && u.role!=='admin');});
  const overflow = [];
  const initial = (u.nama||'?').trim().charAt(0).toUpperCase();

  const sidebarNavHtml = items.map(n=>
    '<button class="nav-item '+(n.hash===route?'active':'')+'" data-nav="'+n.hash+'"><span class="ic">'+n.ic+'</span>'+n.label+'</button>'
  ).join('');
  const bottomTabsHtml = primary.slice(0,6).map(n=>
    '<button class="tab-item '+(n.hash===route?'active':'')+'" data-nav="'+n.hash+'"><span class="ic">'+n.ic+'</span><span class="tl">'+(u.role==='admin'&&n.hash==='poli'?'Rawat Jalan':n.label)+'</span></button>'
  ).join('');

  document.getElementById('app').innerHTML =
   '<div class="app-shell">'+
     '<aside class="sidebar" id="sidebar">'+
       '<div class="brand"><div class="brand-mark"></div><div class="brand-text"><div class="t1">SIMRS PROTOTYPE</div><div class="t2">Portfolio / Demo</div></div></div>'+
       '<nav class="nav">'+sidebarNavHtml+'</nav>'+
       '<div class="sidebar-user"><div class="name">'+esc(u.nama)+'</div><div class="role">'+roleLabel(u.role)+(u.poliId?' · '+esc(getPoli(u.poliId).nama):'')+'</div>'+
         '<button class="btn btn-outline btn-sm btn-block" id="btn-logout-sidebar">🚪 Keluar</button></div>'+
     '</aside>'+
     '<div class="main-area">'+
       '<div class="topbar '+(u.role==='admin'?'admin-topbar':'')+'">'+
         '<div class="topbar-left">'+(u.role==='admin'?'<button class="btn btn-outline btn-sm admin-top-menu-btn" id="btn-admin-service-menu" title="Buka menu Pelayanan" aria-label="Buka menu Pelayanan"><span class="admin-menu-hamburger" aria-hidden="true">☰</span><span class="admin-menu-label">Pelayanan</span></button>':'')+'<button class="btn btn-outline btn-sm staff-chat-top-btn" id="btn-top-chat" title="Buka Chat" aria-label="Buka Chat"><span aria-hidden="true">💬</span><span class="chat-top-label">Chat</span></button></div>'+
         '<h1 id="page-title"></h1>'+
         '<div class="topbar-right">'+
           '<button class="btn btn-outline btn-sm hidden" id="btn-install">⭳ Pasang</button>'+
           /* TAUTAN KAWASAN 3D: selalu tersedia setelah login, tidak masuk ke RBAC alur klinis. */
           '<a class="btn btn-outline btn-sm" href="kawasan-3d.html" title="Buka visualisasi kawasan rumah sakit">🏥 Kawasan 3D</a>'+
           (u.role!=='pasien' ? '<button class="avatar-btn" id="btn-global-search" title="Cari pasien" style="background:var(--glass-bg);border:1px solid var(--glass-border);color:var(--ink);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)">🔍</button>' : '')+
           '<button class="avatar-btn ops-notif-btn" id="btn-notifications" title="Notifikasi">🔔<span id="notif-count" class="'+(visibleNotifications.filter(function(n){return !n.read;}).length?'':'hidden')+'">'+visibleNotifications.filter(function(n){return !n.read;}).length+'</span></button>'+
           '<button class="avatar-btn" id="btn-account" title="Akun">'+esc(initial)+'</button>'+
         '</div>'+
       '</div>'+
       '<div class="content" id="main-content"></div>'+
     '</div>'+
     '<nav class="bottom-tabbar '+(u.role==='pasien'?'patient-bottom-nav':(u.role==='admin'?'admin-bottom-nav':(u.role==='dokter'?'doctor-bottom-nav':'')))+'" id="bottom-tabbar">'+bottomTabsHtml+'</nav>'+
   '</div>';

  bindShellEvents(overflow);
  const renderer = MODULE_RENDERERS[route];
  if(renderer) renderer();
  bindContentNavigation();
}

function bindShellEvents(overflow){
  document.querySelectorAll('.nav-item, .tab-item[data-nav]').forEach(el=>{
    el.addEventListener('click', ()=> navigate(el.dataset.nav));
  });
  const logoutHandler = function(){ logAudit('logout', 'Keluar manual'); Session.logout(); location.hash=''; render(); };
  const sideLogout = document.getElementById('btn-logout-sidebar');
  if(sideLogout) sideLogout.addEventListener('click', logoutHandler);

  const moreBtn = document.getElementById('btn-more-nav');
  if(moreBtn) moreBtn.addEventListener('click', ()=> openMoreSheet(overflow));
  const topChat = document.getElementById('btn-top-chat');
  if(topChat) topChat.addEventListener('click', ()=> navigate(Session.currentUser && Session.currentUser.role==='pasien' ? 'pasien-chat' : 'chat-pasien'));
  const adminServiceMenu = document.getElementById('btn-admin-service-menu');
  if(adminServiceMenu) adminServiceMenu.addEventListener('click', ()=> openAdminMenuFolder());

  const acctBtn = document.getElementById('btn-account');
  if(acctBtn) acctBtn.addEventListener('click', ()=> openAccountSheet(logoutHandler));

  const searchBtn = document.getElementById('btn-global-search');
  if(searchBtn) searchBtn.addEventListener('click', openGlobalSearch);
  const notifBtn = document.getElementById('btn-notifications');
  if(notifBtn) notifBtn.addEventListener('click', openNotifications);

  const installBtn = document.getElementById('btn-install');
  if(installPromptEvent && installBtn) installBtn.classList.remove('hidden');
  if(installBtn) installBtn.addEventListener('click', doInstallPrompt);
}

function openNotifications(){
  const list=getVisibleNotifications().slice(0,30);
  document.getElementById('modal-root').innerHTML='<div class="sheet-overlay" id="modal-overlay"><div class="bottom-sheet"><div class="sheet-handle"></div>'+
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:0 6px 10px"><h2>🔔 Notifikasi</h2><button class="btn btn-ghost btn-sm" id="btn-mark-notif-read">Tandai semua dibaca</button></div>'+
    (list.length?list.map(function(n){return '<div class="notification-item '+(n.read?'':'unread')+'"><div class="notification-icon">'+(n.type==='queue'?'🎫':n.type==='booking'?'📅':'ℹ️')+'</div><div><strong>'+esc(n.title)+'</strong><div>'+esc(n.body)+'</div><span>'+formatTanggalWaktu(n.createdAt)+'</span></div></div>';}).join(''):'<div class="empty">Belum ada notifikasi.</div>')+
    '</div></div>';
  document.getElementById('modal-overlay').addEventListener('click',function(e){if(e.target.id==='modal-overlay')closeModal();});
  const b=document.getElementById('btn-mark-notif-read');
  if(b) b.addEventListener('click',function(){
    getVisibleNotifications().forEach(function(n){n.read=true;});
    Store.save(); closeModal(); renderShell(currentRoute());
  });
  getVisibleNotifications().forEach(function(n){n.read=true;});
  Store.save();
}
function openAdminMenuFolder(){
  // Menu Pelayanan superuser: tepat 16 akses cepat dalam grid 4×4.
  // Semua route tetap terdaftar di sidebar desktop; kartu di sini adalah akses cepat.
  const ordered = ADMIN_SERVICE_MENU_ROUTES.map(function(h){return NAV_ITEMS.find(function(n){return n.hash===h;});}).filter(Boolean);
  const cards=ordered.map(function(n){return '<button class="admin-folder-item" data-nav="'+n.hash+'"><span class="admin-folder-icon">'+n.ic+'</span><span>'+esc(n.label)+'</span></button>';}).join('');
  document.getElementById('modal-root').innerHTML =
    '<div class="sheet-overlay admin-folder-overlay" id="modal-overlay"><div class="admin-menu-folder">'+
      '<div class="admin-folder-head"><div><div class="ops-eyebrow">AKSES CEPAT SUPERUSER</div><h2>Pelayanan</h2><div class="hint">16 modul dalam susunan ikon 4 × 4.</div></div><button class="btn btn-ghost btn-icon" id="btn-close-admin-folder" aria-label="Tutup menu Pelayanan">✕</button></div>'+
      '<div class="admin-folder-grid">'+cards+'</div>'+
    '</div></div>';
  document.getElementById('modal-overlay').addEventListener('click',function(e){if(e.target.id==='modal-overlay')closeModal();});
  const close=document.getElementById('btn-close-admin-folder'); if(close) close.addEventListener('click',closeModal);
  document.querySelectorAll('.admin-folder-item[data-nav]').forEach(function(b){b.addEventListener('click',function(){closeModal();navigate(this.dataset.nav);});});
}

function openMoreSheet(overflow){
  const listHtml = overflow.map(n=>
    '<button class="sheet-item" data-nav="'+n.hash+'"><span class="ic">'+n.ic+'</span>'+n.label+'</button>'
  ).join('');
  document.getElementById('modal-root').innerHTML =
    '<div class="sheet-overlay" id="modal-overlay"><div class="bottom-sheet">'+
      '<div class="sheet-handle"></div>'+
      '<h2 style="padding:0 6px 8px">Akses Modul</h2>'+listHtml+
    '</div></div>';
  document.getElementById('modal-overlay').addEventListener('click', function(e){ if(e.target.id==='modal-overlay') closeModal(); });
  document.querySelectorAll('.sheet-item[data-nav]').forEach(b=>{
    b.addEventListener('click', function(){ closeModal(); navigate(this.dataset.nav); });
  });
}

function openAccountSheet(logoutHandler){
  const u = Session.currentUser;
  const initial = (u.nama||'?').trim().charAt(0).toUpperCase();
  document.getElementById('modal-root').innerHTML =
    '<div class="sheet-overlay" id="modal-overlay"><div class="bottom-sheet">'+
      '<div class="sheet-handle"></div>'+
      '<div style="text-align:center;padding:4px 6px 18px">'+
        '<div class="avatar-btn" style="margin:0 auto 10px;width:54px;height:54px;font-size:21px">'+esc(initial)+'</div>'+
        '<div style="font-weight:800;font-size:16px">'+esc(u.nama)+'</div>'+
        '<div style="color:var(--ink-soft);font-size:13px">'+roleLabel(u.role)+(u.poliId?' · '+esc(getPoli(u.poliId).nama):'')+'</div>'+
      '</div>'+
      '<button class="sheet-item" id="btn-logout-sheet"><span class="ic">🚪</span>Keluar</button>'+
    '</div></div>';
  document.getElementById('modal-overlay').addEventListener('click', function(e){ if(e.target.id==='modal-overlay') closeModal(); });
  document.getElementById('btn-logout-sheet').addEventListener('click', function(){ closeModal(); logoutHandler(); });
}

function openGlobalSearch(){
  if(!Session.currentUser || Session.currentUser.role==='pasien'){ return; }
  if(!isRouteAllowed('rekam-medis', Session.currentUser.role) && Session.currentUser.role!=='loket' && Session.currentUser.role!=='rawat_jalan'){ return; }
  document.getElementById('modal-root').innerHTML =
    '<div class="sheet-overlay" id="modal-overlay"><div class="bottom-sheet">'+
      '<div class="sheet-handle"></div>'+
      '<h2 style="padding:0 6px 10px">🔍 Cari Pasien</h2>'+
      '<input type="text" id="gs-input" placeholder="NIK / No. RM / Nama pasien…" style="margin-bottom:10px">'+
      '<div id="gs-results"><div class="hint" style="padding:6px">Ketik NIK, No. RM, atau nama pasien.</div></div>'+
    '</div></div>';
  document.getElementById('modal-overlay').addEventListener('click', function(e){ if(e.target.id==='modal-overlay') closeModal(); });
  const input = document.getElementById('gs-input');
  input.addEventListener('input', function(){ renderGlobalSearchResults(this.value.trim()); });
  setTimeout(function(){ input.focus(); }, 60);
}
function renderGlobalSearchResults(q){
  const el = document.getElementById('gs-results');
  if(!el) return;
  if(!q){ el.innerHTML = '<div class="hint" style="padding:6px">Ketik NIK, No. RM, atau nama pasien.</div>'; return; }
  const qLower = q.toLowerCase();
  const results = accessiblePatients(Session.currentUser).filter(p => p.nik.includes(q) || p.id.toLowerCase().includes(qLower) || p.nama.toLowerCase().includes(qLower)).slice(0,12);
  if(results.length===0){ el.innerHTML = '<div class="empty">Pasien tidak ditemukan.</div>'; return; }
  el.innerHTML = results.map(p=>
    '<button type="button" class="sheet-item" data-pick-gs="'+p.id+'"><span class="ic">👤</span><span style="text-align:left"><span style="display:block">'+esc(p.nama)+'</span>'+
    '<span style="display:block;font-size:12px;color:var(--ink-soft)" class="mono">'+p.id+' &middot; '+maskNik(p.nik)+'</span></span></button>'
  ).join('');
  el.querySelectorAll('[data-pick-gs]').forEach(b=> b.addEventListener('click', function(){ pickGlobalSearchPatient(this.dataset.pickGs); }));
}
function pickGlobalSearchPatient(patientId){
  closeModal();
  const u = Session.currentUser;
  if(u.role==='admin' || u.role==='dokter'){
    openRiwayatModal(patientId);
    return;
  }
  const p = getPatient(patientId);
  openModal(
    '<div class="modal-head"><h2>'+esc(p.nama)+'</h2><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div>'+
    '<div class="modal-body"><p>No. RM: <span class="mono">'+p.id+'</span><br>NIK: <span class="mono">'+maskNik(p.nik)+'</span><br>'+
    'Tgl Lahir: '+formatTanggalIndo(p.tglLahir)+' ('+calcUmur(p.tglLahir)+' th)<br>'+
    'Alamat: '+esc(p.alamat)+'<br>No. HP: '+esc(p.noHp)+
    (p.alergi ? '<br><span style="color:var(--brick);font-weight:700">⚠ Alergi: '+esc(p.alergi)+'</span>' : '')+
    '</p></div>'
  );
}


function setPageTitle(title){ document.getElementById('page-title').textContent = title; }
function closeDrawer(){
  const sb = document.getElementById('sidebar'), ov = document.getElementById('drawer-overlay');
  if(sb){ sb.classList.remove('open'); ov.classList.remove('show'); }
}

/* =================================================================
   MODUL: AUTENTIKASI DAN PEMILIHAN AKUN DEMO
   PENCARIAN KODE: MODUL: LOGIN | FUNGSI: AKUN DEMO PER UNIT
   ================================================================= */
function renderLogin(){
  document.getElementById('app').innerHTML =
    '<div class="login-wrap"><div class="login-panel">'+
      '<div class="login-hero">'+
        '<div class="login-emblem"></div>'+
        '<h1>SIMRS PROTOTYPE</h1>'+
        '<div class="sub">SIMRS PROTOTYPE — Sistem Informasi Manajemen Rumah Sakit</div>'+
        '<div class="ticket-hint">NO. ANTRIAN &nbsp;— · — · — —</div>'+
      '</div>'+
      '<div class="login-body">'+
        '<div id="login-error"></div>'+
        '<form id="login-form">'+
          '<div class="field"><label>Username</label><input type="text" id="login-username" autocomplete="username" required></div>'+
          '<div class="field"><label>Password</label><input type="password" id="login-password" autocomplete="current-password" required></div>'+
          '<button type="submit" class="btn btn-primary btn-block">Masuk</button>'+
        '</form>'+
        '<div class="login-divider">atau gunakan akun demo</div>'+
        '<div class="chip-row">'+chipsForDemo()+'</div>'+
        /* TAUTAN KAWASAN 3D: akses langsung dari layar login, tanpa mengubah autentikasi. */
        '<div class="login-divider">Jelajahi visualisasi kawasan rumah sakit</div>'+
        '<a class="btn btn-outline btn-block" href="kawasan-3d.html">🏥 Buka Kawasan 3D</a>'+
      '</div>'+
    '</div></div>';

  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.querySelectorAll('.chip').forEach(c=>{
    c.addEventListener('click', ()=> doLogin(c.dataset.username, c.dataset.password));
  });
}
function chipsForDemo(){
  // Pengelompokan visual saja: username, password, role, dan relasi akun tidak diubah.
  // Admin tetap tersedia sebagai akses sistem terpisah, di luar lima kelompok unit pelayanan.
  const allUsers = Store.data.users || [];
  const roomAccounts = allUsers
    .filter(function(u){ return u.role==='perawat_ranap' && u.roomAccount; })
    .sort(function(a,b){ return a.nama.localeCompare(b.nama,'id'); })
    .slice(0,3)
    .map(function(u){ return [u.username, u.nama.replace('Petugas Perawat — ','Perawat Ruang — '), 'Akses perawat dibatasi ke ruang penugasan akun ini.']; });

  const shiftNurses = [
    ['perawat.ranap.pagi','Perawat Shift 1 — Pagi','Serah terima dan pelayanan keperawatan shift pagi; penugasan ruang tetap mengikuti data akun.'],
    ['perawat.ranap.sore','Perawat Shift 2 — Sore','Serah terima dan pelayanan keperawatan shift sore; penugasan ruang tetap mengikuti data akun.'],
    ['perawat.ranap.malam','Perawat Shift 3 — Malam','Serah terima dan pelayanan keperawatan shift malam; penugasan ruang tetap mengikuti data akun.']
  ];
  const shiftDoctors = [
    ['dokter.jaga.pagi','Dokter Jaga Shift 1 — Pagi','Akun dokter rawat inap untuk simulasi jadwal jaga pagi.'],
    ['dokter.jaga.sore','Dokter Jaga Shift 2 — Sore','Akun dokter rawat inap untuk simulasi jadwal jaga sore.'],
    ['dokter.jaga.malam','Dokter Jaga Shift 3 — Malam','Akun dokter rawat inap untuk simulasi jadwal jaga malam.']
  ];

  const sections = [
    {
      id:'rawat-jalan', title:'1. PELAYANAN RAWAT JALAN',
      hint:'Alur pendaftaran, pelayanan perawat dan dokter poli, pembayaran, hingga penyerahan obat.',
      items:[
        ['loket','Pendaftaran Rawat Jalan','Registrasi pasien, verifikasi data, booking, dan check-in.'],
        ['rawatjalan','Petugas Rawat Jalan','Pengelolaan alur operasional dan antrean rawat jalan sesuai hak akses.'],
        ['asisten.umum','Perawat / Asisten Poli Umum','Persiapan pasien dan dukungan alur pelayanan Poli Umum.'],
        ['asisten.anak','Perawat / Asisten Poli Anak','Persiapan pasien dan dukungan alur pelayanan Poli Anak.'],
        ['asisten.gigi','Perawat / Asisten Poli Gigi','Persiapan pasien dan dukungan alur pelayanan Poli Gigi.'],
        ['asisten.jantung','Perawat / Asisten Poli Jantung','Persiapan pasien dan dukungan alur pelayanan Poli Jantung.'],
        ['asisten.penyakitdalam','Perawat / Asisten Poli Penyakit Dalam','Persiapan pasien dan dukungan alur pelayanan Poli Penyakit Dalam.'],
        ['dokter.umum','Dokter Poli Umum','Panggilan pasien, pemeriksaan, rekam medis, dan resep sesuai poli.'],
        ['dokter.anak','Dokter Poli Anak','Panggilan pasien, pemeriksaan, rekam medis, dan resep sesuai poli.'],
        ['dokter.gigi','Dokter Poli Gigi','Panggilan pasien, pemeriksaan, rekam medis, dan resep sesuai poli.'],
        ['dokter.jantung','Dokter Poli Jantung','Panggilan pasien, pemeriksaan, rekam medis, dan resep sesuai poli.'],
        ['dokter.sany','Dokter Poli Jantung — Sesi Alternatif','Simulasi dokter pada sesi praktik alternatif di poli yang sama.'],
        ['dokter.penyakitdalam','Dokter Poli Penyakit Dalam','Panggilan pasien, pemeriksaan, rekam medis, dan resep sesuai poli.'],
        ['kasir.rajal','Kasir Rawat Jalan','Verifikasi dan penyelesaian tagihan rawat jalan.'],
        ['farmasi.rajal','Farmasi Rawat Jalan','Memproses resep rawat jalan dan penyerahan obat.']
      ]
    },
    {
      id:'rawat-inap', title:'2. PELAYANAN RAWAT INAP',
      hint:'Simulasi tiga akun ruangan, tiga shift perawat, dokter rawat inap, admisi, kasir, dan farmasi. Kredensial asli tetap digunakan.',
      items:[
        ['admisi.ranap','Pendaftaran / Admisi Rawat Inap','Penerimaan pasien, verifikasi penjamin, dan penempatan ruang/bed.'],
        ...roomAccounts,
        ...shiftNurses,
        ['dokter.ranap','Dokter DPJP Rawat Inap','Pemeriksaan dan tindak lanjut klinis pasien rawat inap.'],
        ...shiftDoctors,
        ['kasir.ranap','Kasir Rawat Inap','Pengelolaan tagihan selama episode rawat inap dan proses pulang.'],
        ['farmasi.ranap','Farmasi Rawat Inap','Pemrosesan instruksi/resep obat yang terkait episode rawat inap.']
      ]
    },
    {
      id:'igd', title:'3. PELAYANAN IGD',
      hint:'Alur gawat darurat dari triase, pelayanan klinis, hingga transaksi dan obat IGD.',
      items:[
        ['triase.igd','Petugas Triase IGD','Asesmen awal, triase, dan pencatatan prioritas pasien.'],
        ['perawat.igd','Perawat Pelaksana IGD','Tindakan keperawatan dan tindak lanjut sesuai alur IGD.'],
        ['dokter.igd','Dokter IGD','Pemeriksaan, keputusan klinis, dan pencatatan pelayanan IGD.'],
        ['kasir.igd','Kasir IGD','Transaksi dan tagihan yang terkait episode IGD.'],
        ['farmasi.igd','Farmasi IGD','Memproses resep/obat yang terkait pelayanan IGD.']
      ]
    },
    {
      id:'penunjang', title:'4. PELAYANAN PENUNJANG',
      hint:'Pemeriksaan penunjang dan pengembalian hasil ke alur pelayanan pasien.',
      items:[
        ['lab','Petugas Laboratorium','Menerima permintaan pemeriksaan, memproses, dan memasukkan hasil laboratorium.'],
        ['radiologi','Petugas Radiologi','Memproses permintaan radiologi dan memasukkan hasil pemeriksaan.']
      ]
    },
    {
      id:'pasien', title:'5. AKUN PASIEN',
      hint:'Sepuluh akun demo untuk menguji alur dari sisi pasien; setiap akun tetap memakai kredensial yang sudah ada.',
      items:[
        ['pasien.demo1','Pasien 01 — Aditya Pratama','Simulasi login pasien, booking, check-in, dan riwayat milik akun sendiri.'],
        ['pasien.demo2','Pasien 02 — Siti Rahmawati','Simulasi login pasien, booking, check-in, dan riwayat milik akun sendiri.'],
        ['pasien.demo3','Pasien 03 — Budi Santoso','Simulasi login pasien, booking, check-in, dan riwayat milik akun sendiri.'],
        ['pasien.demo4','Pasien 04 — Nur Aisyah Putri','Simulasi login pasien, booking, check-in, dan riwayat milik akun sendiri.'],
        ['pasien.demo5','Pasien 05 — Rizky Ramadhan','Simulasi login pasien, booking, check-in, dan riwayat milik akun sendiri.'],
        ['pasien.demo6','Pasien 06 — Dewi Anggraini','Simulasi login pasien, booking, check-in, dan riwayat milik akun sendiri.'],
        ['pasien.demo7','Pasien 07 — Fajar Setiawan','Simulasi login pasien, booking, check-in, dan riwayat milik akun sendiri.'],
        ['pasien.demo8','Pasien 08 — Rina Oktaviani','Simulasi login pasien, booking, check-in, dan riwayat milik akun sendiri.'],
        ['pasien.demo9','Pasien 09 — Dimas Saputra','Simulasi login pasien, booking, check-in, dan riwayat milik akun sendiri.'],
        ['pasien.demo10','Pasien 10 — Maya Puspitasari','Simulasi login pasien, booking, check-in, dan riwayat milik akun sendiri.']
      ]
    }
  ];

  const make = function(items){
    return items.map(function(item){
      const uname=item[0], label=item[1], description=item[2]||'Akun demo dengan hak akses sesuai tugasnya.';
      const u=allUsers.find(function(x){return x.username===uname;});
      if(!u) return '';
      return '<button type="button" class="chip demo-account-chip" data-username="'+esc(uname)+'" data-password="'+esc(u.password)+'">'+
        '<span class="demo-account-name">'+esc(label)+'</span>'+
        '<span class="demo-account-desc">'+esc(description)+'</span>'+
        '<span class="demo-account-action">Masuk sebagai akun ini →</span></button>';
    }).join('');
  };

  const admin = '<div class="login-admin-access"><div class="login-demo-title">AKSES ADMINISTRATOR SISTEM</div>'+
    '<div class="login-demo-hint">Pengelolaan konfigurasi, master data, akun, dan audit. Dipisahkan karena bukan unit pelayanan klinis.</div>'+
    '<div class="chip-row">'+make([['admin','Admin Sistem — Siti Rahayu','Hak akses administrator/superuser sesuai konfigurasi yang sudah ada.']])+'</div></div>';
  const grouped = sections.map(function(sec,index){
    return '<details class="login-demo-section" data-demo-group="'+sec.id+'">'+
      '<summary class="login-demo-summary"><span class="login-demo-summary-copy"><span class="login-demo-title">'+sec.title+'</span><span class="login-demo-hint">'+sec.hint+'</span></span><span class="login-demo-chevron" aria-hidden="true">⌄</span></summary>'+
      '<div class="login-demo-content"><div class="chip-row">'+make(sec.items)+'</div></div></details>';
  }).join('');
  return admin+'<div class="login-demo-groups">'+grouped+'</div>';
}

function handleLogin(e){
  e.preventDefault();
  doLogin(document.getElementById('login-username').value.trim(), document.getElementById('login-password').value);
}
function doLogin(uname, pass){
  const errEl = document.getElementById('login-error');
  const now = Date.now();
  const attempt = _loginAttempts[uname];
  if(attempt && attempt.lockUntil && now < attempt.lockUntil){
    const sisa = Math.ceil((attempt.lockUntil - now)/1000);
    if(errEl) errEl.innerHTML = '<div class="login-error">Terlalu banyak percobaan gagal. Coba lagi dalam '+sisa+' detik.</div>';
    return;
  }
  const u = Store.data.users.find(x=>x.username===uname && x.password===pass);
  if(!u){
    _loginAttempts[uname] = _loginAttempts[uname] || {count:0, lockUntil:0};
    _loginAttempts[uname].count++;
    if(_loginAttempts[uname].count >= 5){
      _loginAttempts[uname].lockUntil = now + 30000;
      _loginAttempts[uname].count = 0;
    }
    if(errEl) errEl.innerHTML = '<div class="login-error">Username atau password salah.</div>';
    return;
  }
  delete _loginAttempts[uname];
  Session.login(u);
  logAudit('login', 'Masuk sebagai '+roleLabel(u.role));
  resetSessionTimer();
  location.hash = '';
  render();
}

/* ---------------- toast / modal / print ---------------- */
function showToast(msg, type){
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast ' + (type||'');
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(()=>{ el.remove(); }, 3200);
}
function openModal(innerHtml){
  document.getElementById('modal-root').innerHTML = '<div class="modal-overlay" id="modal-overlay"><div class="modal">'+innerHtml+'</div></div>';
  document.getElementById('modal-overlay').addEventListener('click', function(e){ if(e.target.id==='modal-overlay') closeModal(); });
}
function closeModal(){ document.getElementById('modal-root').innerHTML = ''; }
function printArea(html){ document.getElementById('print-area').innerHTML = html; setTimeout(()=>window.print(), 60); }

/* =================================================================
   SHARED: page intro + tabel antrian
   ================================================================= */
function pageIntro(text){
  return '<p style="color:var(--ink-soft);font-size:13.5px;margin:-4px 0 18px;max-width:640px">'+text+'</p>';
}
function renderAntrianTable(visits){
  if(visits.length===0) return '<div class="empty"><div class="big">—</div>Belum ada antrian hari ini</div>';
  const sorted = [...visits].sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt));
  return '<div class="table-wrap"><table><thead><tr><th>No. Antrian</th><th>Pasien</th><th>Poli</th><th>Jam Daftar</th><th>Pembayaran</th><th>Status</th></tr></thead><tbody>'+
    sorted.map(v=>{
      const p = getPatient(v.patientId), poli = getPoli(v.poliId);
      return '<tr><td class="mono" style="font-weight:700">'+v.noAntrian+'</td><td>'+esc(p?p.nama:'-')+'</td>'+
        '<td><span class="poli-tag"><span class="poli-dot" style="background:var(--'+poliColor(poli.id)+')"></span>'+esc(poli.nama)+'</span></td>'+
        '<td class="mono">'+formatJam(v.createdAt)+'</td><td>'+esc(v.jenisBayar)+'</td><td>'+badgeStatus(v.status)+'</td></tr>';
    }).join('')+'</tbody></table></div>';
}

/* =================================================================
   MODULE: DASHBOARD
   PENCARIAN KODE: MODUL: BERANDA | FUNGSI: DASHBOARD OPERASIONAL
   Tanggung jawab: ringkasan sesuai role; jangan menampilkan data unit tanpa hak akses.
   ================================================================= */
function statCard(lbl, val, sub){
  return '<div class="stat"><div class="lbl">'+lbl+'</div><div class="val">'+val+'</div><div class="sub">'+sub+'</div></div>';
}
function barRow(label, count, max, color){
  const pct = Math.round((count/max)*100);
  return '<div style="margin-bottom:12px">'+
    '<div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:5px"><span>'+esc(label)+'</span><span class="mono" style="font-weight:700">'+count+'</span></div>'+
    '<div style="height:8px;background:var(--ink-hair);border-radius:99px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:var(--'+color+')"></div></div></div>';
}
function renderDashboard(){
  setPageTitle('Dashboard Operasional');
  const today=todayStr(), visits=visitsToday();
  const bookingHariIni=Store.data.bookings.filter(function(b){return b.tanggalKontrol===today;});
  const waiting=visits.filter(function(v){return ['menunggu_screening','screening','menunggu_dokter','menunggu_review'].includes(v.status);}).length;
  const diperiksa=visits.filter(function(v){return v.status==='diperiksa';}).length;
  const selesai=visits.filter(function(v){return v.status==='selesai';}).length;
  const checkedIn=bookingHariIni.filter(function(b){return b.status==='checked_in';}).length;
  const obatMenipis=Store.data.medicines.filter(function(m){return m.stok<((Store.data.meta.settings||{}).lowStockThreshold||LOW_STOCK_THRESHOLD);});
  const beds=Store.data.beds||[], bedsAvailable=beds.filter(function(b){return b.status==='kosong';}).length, bedsOccupied=beds.filter(function(b){return b.status==='terisi';}).length;
  const totalPendapatan=Store.data.transactions.filter(function(t){return todayStr(new Date(t.createdAt))===today;}).reduce(function(a,t){return a+t.total;},0);
  const outPh=pharmacyMetrics('rawat_jalan'), inPh=pharmacyMetrics('rawat_inap');
  const settings=Store.data.meta.settings||{};
  const kpi=function(icon,label,value,sub,cls){return '<div class="ops-kpi '+(cls||'')+'"><div class="ops-kpi-icon">'+icon+'</div><div><div class="ops-kpi-label">'+label+'</div><div class="ops-kpi-value">'+value+'</div><div class="ops-kpi-sub">'+sub+'</div></div></div>';};
  const status=function(p){const av=getDoctorAvailability(p.id); return av.status==='available'?'<span class="ops-status ok">● Tersedia</span>':av.status==='delay'?'<span class="ops-status warn">● Terlambat</span>':av.status==='cancel'?'<span class="ops-status bad">● Tidak Praktik</span>':'<span class="ops-status">● Belum ditugaskan</span>';};
  const catalog=Store.data.poli.filter(function(p){return p.official;});
  const renderClinicTable=function(group){
    return catalog.filter(function(p){return p.layanan===group;}).map(function(p){
      const m=clinicTodayMetrics(p.id), ph=pharmacyMetrics('rawat_jalan',p.id), q=m.queue;
      return '<tr><td><strong>'+esc(p.nama)+'</strong><div class="hint">'+esc(group)+'</div></td><td class="mono">'+m.registered+'</td><td class="mono">'+m.bookings+'</td><td class="mono">'+m.waiting+'</td><td class="mono">'+m.examined+'</td><td class="mono">'+m.completed+'</td><td><span class="pharmacy-sla '+(ph.maxWait>ph.sla?'over':'')+'">'+(ph.maxWait?ph.maxWait+' mnt':'—')+'</span><div class="hint">SLA '+ph.sla+' mnt · '+ph.pending+' resep</div></td><td>'+status(p)+'</td></tr>';
    }).join('');
  };
  document.getElementById('main-content').innerHTML=
    '<div class="ops-hero"><div><div class="ops-eyebrow">SIMRS COMMAND CENTER · SIMRS PROTOTYPE</div><h2>Monitoring Operasional Harian</h2><p>'+formatTanggalIndo(today)+' · Rawat jalan, IGD, rawat inap, penunjang, dan farmasi.</p></div><div class="ops-hero-actions"><button class="btn btn-outline btn-sm" id="btn-dashboard-refresh">↻ Perbarui</button><button class="btn btn-primary btn-sm" data-nav="cek-antrian">📺 Papan Antrian</button></div></div>'+
    '<div class="ops-kpi-grid">'+
      kpi('👥','Pasien Terdaftar',visits.length,'kunjungan tercatat hari ini')+
      kpi('🎫','Antrean Menunggu',waiting,'semua poli',waiting>=((settings.alertQueueThreshold)||10)?'hot':'')+
      kpi('🩺','Sedang Diperiksa',diperiksa,'pelayanan berlangsung')+
      kpi('✓','Selesai',selesai,'kunjungan selesai')+
      kpi('🗓️','Booking Hari Ini',bookingHariIni.length,checkedIn+' sudah check-in')+
      kpi('💊','Farmasi Rawat Jalan',outPh.pending,'resep menunggu · max '+outPh.maxWait+' mnt',outPh.maxWait>outPh.sla?'hot':'')+
      kpi('🏥','Farmasi Rawat Inap',inPh.pending,'instruksi menunggu · max '+inPh.maxWait+' mnt',inPh.maxWait>inPh.sla?'hot':'')+
      kpi('🛏️','Bed Tersedia',bedsAvailable,beds.length+' total · '+bedsOccupied+' terisi')+
    '</div>'+
    '<div class="ops-grid-main"><section class="panel ops-panel"><div class="panel-head"><div><h2>🩺 Rekap Semua Poli</h2><div class="hint">Setiap poli ditampilkan: terdaftar, booking, antrean, diperiksa, selesai, dan waktu farmasi.</div></div></div><div class="panel-body"><div class="table-wrap ops-clinic-table"><table><thead><tr><th>Poli</th><th>Daftar</th><th>Booking</th><th>Menunggu</th><th>Diperiksa</th><th>Selesai</th><th>Farmasi</th><th>Status</th></tr></thead><tbody>'+renderClinicTable('Poliklinik Spesialis')+'</tbody></table></div></div></section></div>'+
    '<div class="ops-grid-main"><section class="panel ops-panel"><div class="panel-head"><div><h2>⭐ Poliklinik Eksekutif</h2><div class="hint">Monitoring terpisah dari Poliklinik Spesialis.</div></div></div><div class="panel-body"><div class="table-wrap ops-clinic-table"><table><thead><tr><th>Poli</th><th>Daftar</th><th>Booking</th><th>Menunggu</th><th>Diperiksa</th><th>Selesai</th><th>Farmasi</th><th>Status</th></tr></thead><tbody>'+renderClinicTable('Poliklinik Eksekutif')+'</tbody></table></div></div></section></div>'+
    '<div class="ops-grid-main"><section class="panel ops-panel"><div class="panel-head"><div><h2>💊 Farmasi</h2><div class="hint">Rawat jalan memakai konsep waktu tunggu pengambilan obat; rawat inap memakai waktu pemenuhan instruksi obat untuk unit perawatan.</div></div><button class="btn btn-ghost btn-sm" data-nav="farmasi-rawat-jalan">Buka Farmasi Rawat Jalan →</button></div><div class="panel-body"><div class="pharmacy-monitor-grid"><div class="pharmacy-monitor"><span>Rawat Jalan</span><strong>'+outPh.pending+'</strong><small>menunggu · max '+outPh.maxWait+' / SLA '+outPh.sla+' mnt</small></div><div class="pharmacy-monitor"><span>Rawat Inap</span><strong>'+inPh.pending+'</strong><small>instruksi · max '+inPh.maxWait+' / SLA '+inPh.sla+' mnt</small></div><div class="pharmacy-monitor '+(outPh.overSla?'danger':'')+'"><span>Lewat SLA RJ</span><strong>'+outPh.overSla+'</strong><small>resep melewati batas</small></div><div class="pharmacy-monitor '+(inPh.overSla?'danger':'')+'"><span>Lewat SLA RI</span><strong>'+inPh.overSla+'</strong><small>instruksi melewati batas</small></div></div><div class="hint" style="margin-top:10px">SLA di atas adalah parameter prototype yang dapat diubah pada pengaturan; bukan klaim standar resmi institusi kesehatan manapun.</div></div></section><section class="panel ops-panel"><div class="panel-head"><div><h2>🚑 IGD & Rawat Inap</h2><div class="hint">Struktur layanan baseline prototype; detail fasilitas wajib diverifikasi sebelum implementasi nyata.</div></div><button class="btn btn-ghost btn-sm" data-nav="ranap">Rawat Inap →</button></div><div class="panel-body"><div class="service-tree"><div><strong>IGD</strong><span>Zona Merah · Zona Kuning · Ambulans Gawat Darurat</span></div><div><strong>Rawat Inap</strong><span>Tulip · Teratai · Mawar Kuning · Mawar Merah Putih · Graha Delta Husada</span></div><div><strong>Rawat Intensif</strong><span>ICU · ICCU · PICU · NICU · HCU</span></div><div><strong>Ruang Bersalin</strong><span>Pelayanan rawat inap maternal</span></div></div></div></section></div>'+
    '<div class="ops-grid-main"><section class="panel ops-panel"><div class="panel-head"><div><h2>📈 Alur Hari Ini</h2><div class="hint">BOOKING → CHECK-IN → MENUNGGU → DIPERIKSA → SELESAI.</div></div></div><div class="panel-body"><div class="flow-status-grid">'+[['BOOKING',bookingHariIni.length,'slate'],['CHECK-IN',checkedIn,'sage'],['MENUNGGU',waiting,'amber'],['DIPERIKSA',diperiksa,'clinical'],['SELESAI',selesai,'slate']].map(function(x){return '<div class="flow-status '+x[2]+'"><span>'+x[0]+'</span><strong>'+x[1]+'</strong></div>';}).join('')+'</div></div></section><section class="panel ops-panel"><div class="panel-head"><div><h2>💊 Stok Kritis</h2><div class="hint">Obat di bawah batas minimum.</div></div></div><div class="panel-body">'+(obatMenipis.length?obatMenipis.slice(0,8).map(function(m){return '<div class="ops-stock-row"><span>'+esc(m.nama)+'</span><strong>'+m.stok+' '+esc(m.satuan)+'</strong></div>';}).join(''):'<div class="ops-empty">✓ Stok aman.</div>')+'</div></section></div>';
  const btn=document.getElementById('btn-dashboard-refresh'); if(btn) btn.addEventListener('click',renderDashboard);
}

