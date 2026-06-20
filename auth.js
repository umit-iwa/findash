// ═══════════════════════════════════════════════════════════════
//  FinDash Auth — Ortak Kimlik Doğrulama Modülü
//  Tüm modüller bu dosyayı kullanır
//  Kullanım: <script src="auth.js"></script>
// ═══════════════════════════════════════════════════════════════
const FINDASH_API = 'https://script.google.com/macros/s/AKfycbz94i0KScY3SvLZekMt66n5fuh6sO0a1ekQNltPZW6HR3bc5jI5bVQwqfMHdir40MVsag/exec';
// Aktif oturum
window.FD_SESSION = {
  kadi: '',
  adSoyad: '',
  rol: '',       // admin | user | readonly
  yetki: '',     // admin | duzenle | goruntu | yok
  modul: '',     // hangi modülde
  girisZamani: null,
};
// ─── API ──────────────────────────────────────────────────────
async function fdApiGet(action) {
  try {
    const r = await fetch(`${FINDASH_API}?action=${action}`);
    return await r.json();
  } catch(e) { return null; }
}
async function fdApiSave(body) {
  try {
    const data = encodeURIComponent(JSON.stringify(body));
    const r = await fetch(`${FINDASH_API}?action=${body.action}&data=${data}`);
    return await r.json();
  } catch(e) { return null; }
}
// ─── YETKİ KONTROL ────────────────────────────────────────────
function fdIsAdmin()    { return window.FD_SESSION.rol === 'admin'; }
function fdCanEdit()    { return ['admin','duzenle'].includes(window.FD_SESSION.yetki); }
function fdCanView()    { return window.FD_SESSION.yetki !== 'yok'; }
// Yetki gerektiren elementi göster/gizle
function fdApplyYetkiler() {
  document.querySelectorAll('[data-yetki]').forEach(el => {
    const gereken = el.getAttribute('data-yetki');
    let goster = false;
    if (gereken === 'admin')   goster = fdIsAdmin();
    if (gereken === 'duzenle') goster = fdCanEdit();
    if (gereken === 'goruntu') goster = fdCanView();
    el.style.display = goster ? '' : 'none';
  });
}
// ─── GİRİŞ EKRANI HTML ────────────────────────────────────────
function fdLockHTML(modulAdi, modulEmoji) {
  return `
  <div id="fd-lock" style="position:fixed;inset:0;background:#0f1117;display:flex;align-items:center;justify-content:center;z-index:9999;font-family:'IBM Plex Sans',sans-serif">
    <div style="background:#161b27;border:1px solid #2a3348;border-radius:12px;padding:40px 48px;width:360px;text-align:center">
      <div style="font-size:32px;margin-bottom:16px">${modulEmoji}</div>
      <h2 style="font-size:18px;font-weight:500;color:#e8edf5;margin-bottom:4px">${modulAdi}</h2>
      <p style="font-size:12px;color:#8a9bb8;margin-bottom:24px">FinDash · Lütfen giriş yapın</p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px">
        <input id="fd-kadi" type="text" placeholder="Kullanıcı adı" autocomplete="off"
          style="width:100%;background:#1e2535;border:1px solid #2a3348;border-radius:6px;padding:10px 14px;color:#e8edf5;font-family:'IBM Plex Sans',sans-serif;font-size:14px;outline:none">
        <input id="fd-sifre" type="password" placeholder="Şifre"
          style="width:100%;background:#1e2535;border:1px solid #2a3348;border-radius:6px;padding:10px 14px;color:#e8edf5;font-family:'IBM Plex Sans',sans-serif;font-size:14px;outline:none"
          onkeydown="if(event.key==='Enter')fdGirisYap()">
      </div>
      <button onclick="fdGirisYap()"
        style="width:100%;background:#4f9cf9;color:#fff;border:none;border-radius:6px;padding:10px;font-size:14px;font-family:'IBM Plex Sans',sans-serif;font-weight:500;cursor:pointer">
        Giriş yap
      </button>
      <div id="fd-lock-err" style="color:#e05555;font-size:12px;margin-top:8px;display:none">
        Hatalı kullanıcı adı veya şifre
      </div>
      <div id="fd-lock-loading" style="color:#8a9bb8;font-size:12px;margin-top:8px;display:none">
        Doğrulanıyor…
      </div>
    </div>
  </div>`;
}
// ─── GİRİŞ YAP ────────────────────────────────────────────────
async function fdGirisYap() {
  const kadi  = document.getElementById('fd-kadi')?.value?.trim();
  const sifre = document.getElementById('fd-sifre')?.value;
  const modul = window.FD_MODUL || '';
  if (!kadi || !sifre) return;
  document.getElementById('fd-lock-err').style.display = 'none';
  document.getElementById('fd-lock-loading').style.display = 'block';
  const res = await fdApiSave({
    action: 'dogrulaKullanici',
    kadi, sifre, modul
  });
  document.getElementById('fd-lock-loading').style.display = 'none';
  if (res?.ok) {
    window.FD_SESSION = {
      kadi:        res.kadi,
      adSoyad:     res.adSoyad,
      rol:         res.rol,
      yetki:       res.yetki,
      modul:       modul,
      girisZamani: new Date(),
    };
    const userEl = document.getElementById('fd-user-info');
    if (userEl) userEl.textContent = res.adSoyad || res.kadi;
    const rolEl = document.getElementById('fd-user-rol');
    if (rolEl) rolEl.textContent = res.rol === 'admin' ? '👑' : res.yetki === 'duzenle' ? '✏️' : '👁';
    const lock = document.getElementById('fd-lock');
    if (lock) lock.remove();
    const app = document.getElementById('app');
    if (app) app.style.display = 'block';
    fdApplyYetkiler();
    if (typeof fdOnGiris === 'function') fdOnGiris();
  } else {
    document.getElementById('fd-lock-err').style.display = 'block';
    document.getElementById('fd-lock-err').textContent = res?.hata || 'Hatalı kullanıcı adı veya şifre';
    document.getElementById('fd-sifre').value = '';
    document.getElementById('fd-sifre').focus();
  }
}
// ─── MODÜL BAŞLATICI ──────────────────────────────────────────
function fdInit(modulId, modulAdi, modulEmoji) {
  window.FD_MODUL = modulId;
  document.body.insertAdjacentHTML('afterbegin', fdLockHTML(modulAdi, modulEmoji));
  document.getElementById('fd-kadi')?.focus();
  const app = document.getElementById('app');
  if (app) app.style.display = 'none';
}
// ─── OTURUM KAPAT ─────────────────────────────────────────────
function fdCikisYap() {
  window.FD_SESSION = { kadi:'', adSoyad:'', rol:'', yetki:'', modul:'', girisZamani:null };
  location.reload();
}
// ─── TOAST ────────────────────────────────────────────────────
function fdToast(msg, type='ok') {
  let t = document.getElementById('fd-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'fd-toast';
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#161b27;border:1px solid #2a3348;border-radius:8px;padding:12px 18px;font-size:13px;display:flex;align-items:center;gap:10px;z-index:300;transform:translateY(80px);opacity:0;transition:all .3s;font-family:"IBM Plex Sans",sans-serif;color:#e8edf5';
    document.body.appendChild(t);
  }
  const dot = type==='ok' ? '#2ecc8a' : type==='err' ? '#e05555' : '#f0a030';
  t.style.borderColor = dot;
  t.innerHTML = `<span style="width:6px;height:6px;border-radius:50%;background:${dot};display:inline-block;flex-shrink:0"></span><span>${msg}</span>`;
  t.style.transform = 'translateY(0)';
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.transform='translateY(80px)'; t.style.opacity='0'; }, 3000);
}
function fdTemaUygula(mod) {
  const r = document.documentElement;
  if (mod === 'light') {
    r.style.setProperty('--bg', '#f0f4f8');
    r.style.setProperty('--bg2', '#ffffff');
    r.style.setProperty('--bg3', '#e8edf5');
    r.style.setProperty('--bg4', '#dde3ee');
    r.style.setProperty('--border', '#c8d3e8');
    r.style.setProperty('--border2', '#a0b0d0');
    r.style.setProperty('--text', '#1a2540');
    r.style.setProperty('--text2', '#4a5a78');
    r.style.setProperty('--text3', '#8a9bb8');
    r.style.setProperty('--accent', '#1a3a8a');
    r.style.setProperty('--green', '#0a7a4a');
    r.style.setProperty('--green-bg', '#d0f0e0');
    r.style.setProperty('--amber', '#8a5a00');
    r.style.setProperty('--amber-bg', '#fff0d0');
    r.style.setProperty('--red', '#a02020');
    r.style.setProperty('--red-bg', '#ffe0e0');
  } else {
    r.style.setProperty('--bg', '#0f1117');
    r.style.setProperty('--bg2', '#161b27');
    r.style.setProperty('--bg3', '#1e2535');
    r.style.setProperty('--bg4', '#252d3f');
    r.style.setProperty('--border', '#2a3348');
    r.style.setProperty('--border2', '#3a4a66');
    r.style.setProperty('--text', '#e8edf5');
    r.style.setProperty('--text2', '#8a9bb8');
    r.style.setProperty('--text3', '#4a5a78');
    r.style.setProperty('--accent', '#4f9cf9');
    r.style.setProperty('--green', '#2ecc8a');
    r.style.setProperty('--green-bg', '#0d2e1f');
    r.style.setProperty('--amber', '#f0a030');
    r.style.setProperty('--amber-bg', '#2a1f0a');
    r.style.setProperty('--red', '#e05555');
    r.style.setProperty('--red-bg', '#2a1010');
  }
  localStorage.setItem('fd_tema', mod);
  const btn = document.getElementById('fd-tema-btn');
  if (btn) btn.textContent = mod === 'light' ? '🌙' : '☀️';
}
function fdTemaInit() {
  const k = localStorage.getItem('fd_tema') || 'dark';
  fdTemaUygula(k);
}
function fdTemaDegistir() {
  const m = localStorage.getItem('fd_tema') || 'dark';
  fdTemaUygula(m === 'dark' ? 'light' : 'dark');
}
