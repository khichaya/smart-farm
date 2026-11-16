/* المزرعة الذكية - واجهة المنصة
 * © جميع الحقوق محفوظة - المهندس خيشة يحي - نسخة أكاديمية */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- الأيقونات (SVG) ---------- */
const ICONS = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  sprout: '<path d="M12 22V11"/><path d="M12 11c0-4 3-6 8-6 0 4-3 6-8 6z"/><path d="M12 15c0-3-2.5-5-7-5 0 3 2.500 5 7 5z"/>',
  droplet: '<path d="M12 3s6.500 6.500 6.500 11.200a6.500 6.500 0 0 1-13 0C5.500 9.500 12 3 12 3z"/><path d="M9 14.500a3 3 0 0 0 3 3"/>',
  wind: '<path d="M3 8h10a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h7a2.500 2.500 0 1 1-2.500 2.500"/>',
  tank: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M5 13c2-1.500 4 1.500 7 0s5 1.500 7 0"/>',
  power: '<path d="M12 3v8"/><path d="M7 6.500a8 8 0 1 0 10 0"/>',
  notes: '<rect x="5" y="3" width="14" height="18" rx="2.500"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.500"/>',
  settings: '<path d="M5 6h14M5 12h14M5 18h14"/><circle cx="9" cy="6" r="2" fill="var(--surface)"/><circle cx="15" cy="12" r="2" fill="var(--surface)"/><circle cx="8" cy="18" r="2" fill="var(--surface)"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2.500" fill="currentColor"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  trash: '<path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="2.500"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.500a10 10 0 0 1 14 0M8.500 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.500" r=".8" fill="currentColor"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/>',
  alert: '<path d="M12 3L2 20h20z"/><path d="M12 10v5M12 17.500v.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.500v.5"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.500 11c.6.6 1 1.400 1 2.200h5c0-.8.4-1.600 1-2.200A6 6 0 0 0 12 3z"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  box: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  chart: '<path d="M4 4v16h16"/><path d="M8 15l3-4 3 3 5-7"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 3 3 3 0 0 0 1 5 3 3 0 0 0 4 4z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 3 3 3 0 0 1-1 5 3 3 0 0 1-4 4z"/><path d="M12 4v16"/>',
  chevL: '<path d="M15 5l-7 7 7 7"/>', chevR: '<path d="M9 5l7 7-7 7"/>',
  field: '<path d="M3 20h18"/><path d="M6 20v-5M6 15c0-2 1-3 3-3M6 15c0-2-1-3-3-3M12 20V9M12 9c0-2 1.500-3.500 3.500-3.500M12 9C12 7 10.500 5.500 8.500 5.500M18 20v-5M18 15c0-2 1-3 3-3M18 15c0-2-1-3-3-3"/>',
  greenhouse: '<path d="M3 20v-7a9 7 0 0 1 18 0v7z"/><path d="M12 6v14M3 14h18"/>',
  pivot: '<path d="M2 19h20"/><path d="M3 11l18-3"/><path d="M6 10.500V19M12 9.500V19M18 8.500V19"/><path d="M8 5c0 1-1 2-1 3M13 4c0 1-1 2-1 3.500" opacity=".7"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.500-5.800M20 4v5h-5"/>',
  shield: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  db: '<ellipse cx="12" cy="5.500" rx="8" ry="3"/><path d="M4 5.500v6c0 1.700 3.600 3 8 3s8-1.300 8-3v-6M4 11.500v6c0 1.700 3.600 3 8 3s8-1.300 8-3v-6"/>',
  up: '<path d="M7 11v9H4v-9zM7 11l4-8c2 0 3 1 3 3v3h5a2 2 0 0 1 2 2l-1 6a2 2 0 0 1-2 2H7"/>',
  down: '<path d="M7 13V4H4v9zM7 13l4 8c2 0 3-1 3-3v-3h5a2 2 0 0 0 2-2l-1-6a2 2 0 0 0-2-2H7"/>',
  fan: '<circle cx="12" cy="12" r="1.800"/><path d="M12 10c0-4 1-7 4-7 2 0 3 2 2 4s-3 3-6 3z"/><path d="M14 12c4 0 7 1 7 4 0 2-2 3-4 2s-3-3-3-6z"/><path d="M12 14c0 4-1 7-4 7-2 0-3-2-2-4s3-3 6-3z"/><path d="M10 12c-4 0-7-1-7-4 0-2 2-3 4-2s3 3 3 6z"/>',
  hand: '<path d="M8 12V5.500a1.500 1.500 0 0 1 3 0V11M11 10V4a1.500 1.500 0 0 1 3 0v7M14 10V5.500a1.500 1.500 0 0 1 3 0V13M17 9.500a1.500 1.500 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-3-5a1.500 1.500 0 0 1 2.500-1.500L8 14"/>',
  leaf: '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-15 14z"/><path d="M5 19l8-8"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.500"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.500h.01M7 16.500h.01"/>',
  star: '<path d="M12 3l2.700 5.600 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.9z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7M8 11h5"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.500 6.500a8 8 0 0 1 0 11"/>',
  volumeOff: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
};
const CROP_COLOR = {tomato: '#dc2626', potato: '#a16207', pepper: '#ea580c', cucumber: '#16a34a', onion: '#c026d3', wheat: '#ca8a04', barley: '#8a9a12', date: '#92400e',
  watermelon: '#e11d48', lettuce: '#22c55e', carrot: '#f97316', corn: '#d9a406', alfalfa: '#15803d', zucchini: '#65a30d', eggplant: '#7c3aed', peanut: '#b45309'};
const cropBadge = k => `<span class="cbadge" style="background:${CROP_COLOR[k] || '#15803d'}">${ic('leaf')}</span>`;
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------- الحالة العامة ---------- */
let PIN = localStorage.getItem('pin') || '';
let LIVE = null, ZONES = [], CROPS = [], PAGE = '', chartHours = 24, notesZone = '';
let IRR = JSON.parse(localStorage.getItem('irr') || '{"zone":1,"minutes":10,"force":false}');
let maxRemain = 0, lastRecSig = '', TIMERS = [];
const DAYS = ['الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت','الأحد'];
const NOTE_CATS = ['عام','آفات','أمراض','تسميد','ري','تقليم','حصاد','طقس'];
const ZONE_IMG = {open: 'img3.jpg', greenhouse: 'img6.jpg', pivot: 'img4.jpg'};
const ZONE_ICON = {open: 'field', greenhouse: 'greenhouse', pivot: 'pivot'};
const NAV = [['home', 'الرئيسية', 'home'], ['zones', 'المزارع', 'sprout'], ['irrigation', 'السقي', 'droplet'], ['notes', 'الملاحظات', 'notes'],
  ['cameras', 'الكاميرات', 'camera'], ['ai', 'الذكاء', 'brain'], ['guide', 'شرح النظام', 'book'], ['settings', 'الإعدادات', 'settings']];
const PMSG = {off: '', blocked_no_water: 'ممنوعة: الخزان فارغ', stopped_empty: 'أُوقفت: نفد الماء', timer_done: 'انتهى زمن السقي',
  manual_off: 'أوقفها المستخدم', manual_on: 'تعمل', manual_force: 'تشغيل يدوي', test_3s: 'اختبار', test_done: 'انتهى الاختبار'};

/* ---------- أدوات ---------- */
async function api(path, opt = {}) {
  const r = await fetch(path, {method: opt.method || 'GET', headers: {'X-Pin': PIN, 'Content-Type': 'application/json'}, body: opt.body ? JSON.stringify(opt.body) : undefined});
  if (r.status === 401) { showLogin(); throw new Error('unauthorized'); }
  return r.json();
}
function toast(msg, bad) {
  const t = document.createElement('div'); t.innerHTML = ic(bad ? 'alert' : 'check') + `<span>${esc(msg)}</span>`; if (bad) t.className = 'bad';
  $('#toast').appendChild(t); setTimeout(() => t.remove(), 3800);
}
const fmtTime = ts => new Date(ts * 1000).toLocaleTimeString('ar-u-nu-latn', {hour: '2-digit', minute: '2-digit'});
const fmtDT = ts => new Date(ts * 1000).toLocaleString('ar-u-nu-latn', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'});
const zname = id => (ZONES.find(z => z.id == id) || {}).name || (id ? 'منطقة ' + id : '—');
const zkind = id => (ZONES.find(z => z.id == id) || {}).kind;
function openModal(html) { $('#modalBody').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }
async function busy(btn, fn) {           // يعرض دوّامة التحميل على الزر أثناء العملية
  if (btn) btn.classList.add('loading');
  try { return await fn(); } finally { if (btn) btn.classList.remove('loading'); }
}
document.addEventListener('pointerdown', e => {      // تأثير الموجة عند الضغط
  const b = e.target.closest('.btn,.bigbtn,.ztile'); if (!b || b.disabled) return;
  const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height), span = document.createElement('span');
  span.className = 'rip'; span.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
  if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
  b.style.overflow = 'hidden'; b.appendChild(span); setTimeout(() => span.remove(), 600);
});

/* ---------- الدخول ---------- */
function showLogin() { $('#login').classList.remove('hidden'); }
async function doLogin(e) {
  e.preventDefault();
  const pin = $('#pin').value.trim();
  const r = await fetch('/api/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({pin})}).then(r => r.json());
  if (r.ok) { PIN = pin; localStorage.setItem('pin', pin); $('#login').classList.add('hidden'); $('#loginErr').textContent = ''; boot(); }
  else $('#loginErr').textContent = 'رمز غير صحيح';
  return false;
}

/* ---------- التوجيه ---------- */
const PAGES = {home: pageHome, zones: pageZones, irrigation: pageIrrigation, notes: pageNotes, cameras: pageCameras, ai: pageAI, guide: () => pageGuide(), settings: pageSettings};
function route() {
  PAGE = (location.hash.replace('#/', '') || 'home'); if (!PAGES[PAGE]) PAGE = 'home';
  TIMERS.forEach(clearInterval); TIMERS = [];
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#/' + PAGE));
  const gb = $('#guideBtn'); if (gb) gb.innerHTML = ic('book');
  PAGES[PAGE](); window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
function buildChrome() {
  $('#navIn').innerHTML = NAV.map(([id, label, icon]) => `<a href="#/${id}" ${id === 'guide' ? 'class="deskonly"' : ''}>${ic(icon)}<span>${label}</span></a>`).join('');
  $('#brandLogo').innerHTML = ic('sprout', 'lg'); $('#loginLogo').innerHTML = ic('sprout', 'xl');
  updateBell();
}
async function boot() {
  try { [ZONES, CROPS] = await Promise.all([api('/api/zones'), api('/api/crops')]); await refreshLive(); route(); } catch (e) { /* شاشة الدخول */ }
}

/* ---------- البيانات الحية ---------- */
async function refreshLive() {
  try { LIVE = await api('/api/live'); } catch (e) { return; }
  const c = $('#conn'); c.className = 'pill ' + (LIVE.online ? 'on' : 'off');
  c.innerHTML = `<i></i><span>${LIVE.online ? 'المتحكم متصل' : 'المتحكم غير متصل'}</span>`;
  $('#clock').textContent = LIVE.now;
  checkAlerts();
  if (PAGE === 'home') updateLive();
}
setInterval(refreshLive, 2000);
const soilStage = () => { const z = ZONES.find(z => z.id == (LIVE && LIVE.soil_zone)); return z && z.stage; };
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/* ---------- عدّادات SVG ---------- */
const ARC = 'M 20 100 A 80 80 0 0 1 180 100';
function gaugeHTML(id, label, icon) {
  return `<div class="gauge"><div style="position:relative;max-width:230px;margin:0 auto">
    <svg class="arc" viewBox="0 0 200 112"><path class="trk" d="${ARC}" pathLength="100"/><path class="bnd" id="${id}Band" d="${ARC}" pathLength="100" stroke-dasharray="0 100"/>
    <path class="val" id="${id}Val" d="${ARC}" pathLength="100" stroke="var(--green)" stroke-dasharray="100" stroke-dashoffset="100"/>
    <path id="${id}Lim" d="${ARC}" pathLength="100" fill="none" stroke="var(--red)" stroke-width="18" stroke-dasharray="0 100" opacity="0"/></svg>
    <div class="num" id="${id}Num" style="position:absolute;inset-inline:0;bottom:2px">--</div></div>
    <div class="lbl">${ic(icon)} ${label}</div><div class="sub" id="${id}Sub"></div></div>`;
}
function setArc(id, frac, color) { const v = $('#' + id + 'Val'); if (!v) return; v.style.strokeDashoffset = 100 - Math.max(0, Math.min(1, frac)) * 100; if (color) v.style.stroke = color; }
function tankHTML() {
  return `<svg class="tank" viewBox="0 0 120 140"><defs><clipPath id="tc"><rect x="20" y="10" width="80" height="120" rx="16"/></clipPath>
    <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#0284c7"/></linearGradient></defs>
    <rect x="20" y="10" width="80" height="120" rx="16" fill="var(--soft)"/>
    <g clip-path="url(#tc)"><g class="w" id="tankW" style="transform:translateY(110px)"><g class="wave"><path d="M-40 6q10-8 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0V150H-40z" fill="url(#wg)" opacity=".9"/></g></g></g>
    <rect x="20" y="10" width="80" height="120" rx="16" fill="none" stroke="var(--line)" stroke-width="4"/></svg>`;
}

/* ---------- الرئيسية ---------- */
function pageHome() {
  const z = ZONES.find(z => z.id == IRR.zone) ? IRR.zone : (ZONES[0] || {}).id; IRR.zone = z;
  $('#view').innerHTML = `<div class="page">
  <section class="card irr">
    <div class="irr-head"><div class="title" style="margin:0"><div class="ico blue">${ic('droplet')}</div><h2>تشغيل السقي</h2></div><span class="tag" id="irrState">جاهز</span></div>
    <div class="ztiles" role="radiogroup" aria-label="اختر المنطقة">${ZONES.map(zz => `<button class="ztile ${zz.id == IRR.zone ? 'sel' : ''}" role="radio" aria-checked="${zz.id == IRR.zone}" onclick="pickZone(${zz.id})">
      ${ic(ZONE_ICON[zz.kind] || 'field')}<b>${esc(zz.name)}</b><small>${zz.crop_name ? cropBadge(zz.crop) + ' ' + esc(zz.crop_name) : 'بدون محصول'}</small></button>`).join('')}</div>
    <div class="irr-ctrl">
      <div class="stepper"><button onclick="stepMin(-1)" aria-label="أنقص">${ic('minus')}</button><div class="val"><span id="minV">${IRR.minutes}</span><small>دقيقة</small></div><button onclick="stepMin(1)" aria-label="زِد">${ic('plus')}</button></div>
      <div class="chips" id="minChips">${[5, 10, 20, 30, 45, 60].map(m => `<button class="chip ${IRR.minutes == m ? 'sel' : ''}" onclick="setMin(${m})">${m}</button>`).join('')}</div>
      <label class="switch"><input type="checkbox" id="forceChk" ${IRR.force ? 'checked' : ''} onchange="IRR.force=this.checked;saveIrr();updateLive()"><span class="track"></span>
        <span>${ic('hand')} تشغيل يدوي <small>(يتجاوز حماية الخزان والرياح)</small></span></label>
    </div>
    <button class="bigbtn" id="bigBtn" onclick="bigAction(this)"></button>
    <div class="hint" id="irrHint"></div>
  </section>
  <div class="sp"></div>
  <div class="grid g4">
    <div class="card hov">${gaugeHTML('soil', 'رطوبة التربة', 'droplet')}</div>
    <div class="card hov">${gaugeHTML('wind', 'سرعة الرياح', 'wind')}</div>
    <div class="card hov gauge"><div style="max-width:130px;margin:0 auto">${tankHTML()}</div><div class="lbl">${ic('tank')} خزان الماء <span class="tag" id="tankTag">--</span></div><div class="sub" id="tankSub"></div></div>
    <div class="card hov gauge"><div class="pump-ic" id="pumpIc">${ic('fan')}</div><div class="lbl" style="margin-top:10px">${ic('power')} المضخة</div><div class="big-num" id="pumpV">--</div><div class="sub" id="pumpNote"></div></div>
  </div>
  <div class="sp"></div>
  <div class="grid g2">
    <div class="card"><div class="row between"><div class="title" style="margin:0"><div class="ico">${ic('chart')}</div><h3>رطوبة التربة</h3></div>${rangeChips()}</div><div class="sp s"></div>
      <canvas id="chSoil"></canvas><div class="legend"><span><i style="background:#0284c7"></i>الرطوبة %</span><span><i style="background:rgba(21,128,61,.35)"></i>المدى المطلوب</span></div></div>
    <div class="card"><div class="title"><div class="ico amber">${ic('wind')}</div><h3>سرعة الرياح (كم/س)</h3></div>
      <canvas id="chWind"></canvas><div class="legend"><span><i style="background:#15803d"></i>المتوسط</span><span><i style="background:#d97706"></i>الأعلى</span></div></div>
  </div>
  <div class="sp"></div>
  <section class="card"><div class="row between"><div class="title" style="margin:0"><div class="ico amber">${ic('bulb')}</div><h2>توصيات اليوم</h2></div><span class="muted" id="recCount"></span></div><div class="sp s"></div>
    <div id="recs"><div class="empty">جارٍ التحليل...</div></div></section>
  <div class="sp"></div>
  <section class="card"><div class="title"><div class="ico violet">${ic('calendar')}</div><h2>ملخص اليوم</h2></div><div id="sum" class="mrow"></div></section>
  </div>`;
  lastRecSig = ''; updateLive(); loadCharts(); loadRecs(); loadSummary();
  TIMERS.push(setInterval(() => { loadRecs(); loadSummary(); loadCharts(); }, 30000));
}
const rangeChips = () => `<div class="chips">${[6, 24, 72].map(h => `<button class="chip ${chartHours == h ? 'sel' : ''}" onclick="chartHours=${h};pageHome()">${h} س</button>`).join('')}</div>`;
const saveIrr = () => localStorage.setItem('irr', JSON.stringify(IRR));
function pickZone(id) { IRR.zone = id; saveIrr(); document.querySelectorAll('.ztile').forEach(t => { const on = t.getAttribute('onclick') === `pickZone(${id})`; t.classList.toggle('sel', on); t.setAttribute('aria-checked', on); }); updateLive(); }
function setMin(m) { IRR.minutes = m; saveIrr(); $('#minV').textContent = m; document.querySelectorAll('#minChips .chip').forEach(c => c.classList.toggle('sel', +c.textContent === m)); }
function stepMin(dir) { const m = IRR.minutes, s = (dir > 0 ? m >= 10 : m > 10) ? 5 : 1; setMin(Math.max(1, Math.min(60, m + dir * s))); }

function updateLive() {
  if (!LIVE || !$('#bigBtn')) return;
  const d = LIVE.data || {}, on = LIVE.online, st = soilStage(), running = on && !!d.pump;
  /* التربة */
  const pct = on && d.pct != null ? d.pct : null;
  $('#soilNum').innerHTML = pct == null ? '--' : `${pct}<small>%</small>`;
  let col = 'var(--blue)';
  if (st) { $('#soilBand').style.strokeDasharray = `${st.max - st.min} 100`; $('#soilBand').style.strokeDashoffset = -st.min;
    col = pct < st.min ? 'var(--amber)' : pct > st.max ? 'var(--blue)' : 'var(--green)';
    $('#soilSub').innerHTML = `المطلوب ${st.min}–${st.max}% ` + (pct == null ? '' : pct < st.min ? '<span class="tag warn">جافة</span>' : pct > st.max ? '<span class="tag blue">رطبة</span>' : '<span class="tag">مناسبة</span>'); }
  else { $('#soilBand').style.strokeDasharray = '0 100'; $('#soilSub').textContent = 'اختر محصولاً لتحديد المدى'; }
  setArc('soil', (pct || 0) / 100, col);
  /* الرياح */
  const w = d.kmh ?? 0, lim = LIVE.wind_limit, hot = w > lim;
  $('#windNum').innerHTML = on ? `${w}<small> كم/س</small>` : '--';
  setArc('wind', w / 60, hot ? 'var(--red)' : w > 15 ? 'var(--amber)' : 'var(--green)');
  $('#windLim').style.strokeDasharray = '1.4 100'; $('#windLim').style.strokeDashoffset = -(Math.min(60, lim) / 60 * 100); $('#windLim').style.opacity = 1;
  $('#windSub').innerHTML = !on ? '' : hot ? `<span class="tag bad">قوية (الحد ${lim})</span>` : w > 15 ? '<span class="tag warn">معتدلة</span>' : '<span class="tag">هادئة</span>';
  /* الخزان */
  const lv = d.level; $('#tankW').style.transform = `translateY(${!on ? 110 : lv === 1 ? 24 : lv === 0 ? 108 : 66}px)`;
  const tt = $('#tankTag'); tt.className = 'tag ' + (lv === 1 ? '' : lv === 0 ? 'bad' : 'warn'); tt.textContent = !on ? '--' : lv === 1 ? 'ممتلئ' : lv === 0 ? 'فارغ' : 'جارٍ التأكد';
  $('#tankSub').textContent = !on ? '' : lv === 1 ? 'آمن لتشغيل المضخة' : lv === 0 ? 'أضف ماءً للخزان' : `تحقق ${d.wcount}/${d.wconfirm}`;
  /* المضخة */
  const pi = $('#pumpIc'); pi.className = 'pump-ic' + (running ? (d.force ? ' on force' : ' on') : '');
  $('#pumpV').textContent = !on ? '--' : running ? 'تعمل' : 'متوقفة';
  $('#pumpNote').textContent = !on ? '' : running ? `${zname(d.zone)}${d.remain ? ' — متبقي ' + mmss(d.remain) : ''}` : (PMSG[d.pmsg] || '');
  /* الزر الكبير */
  if (!running) maxRemain = 0; else maxRemain = Math.max(maxRemain, d.remain || 0);
  const b = $('#bigBtn'), state = running ? 'run' : 'idle';
  if (b.dataset.state !== state) {
    b.dataset.state = state; b.className = 'bigbtn' + (running ? ' run' : '');
    b.innerHTML = running ? `<span class="ring">${ic('stop')}</span><span><span id="bbT">إيقاف السقي</span><small id="bbS"></small></span><span class="bar"><i id="bbBar" style="width:0"></i></span>`
      : `<span class="ring">${ic('droplet')}</span><span><span id="bbT">ابدأ السقي</span><small id="bbS"></small></span>`;
  }
  b.disabled = !on;
  if (running) { $('#bbS').textContent = `${zname(d.zone)}${d.remain ? ' — متبقي ' + mmss(d.remain) : ''}`; $('#bbBar').style.width = (maxRemain ? (100 - (d.remain || 0) / maxRemain * 100) : 100) + '%'; }
  else $('#bbS').textContent = `${zname(IRR.zone)} — ${IRR.minutes} دقيقة${IRR.force ? ' (يدوي)' : ''}`;
  /* التلميح */
  const h = $('#irrHint'), tagEl = $('#irrState'); let msg = '', cls = '', tg = 'جاهز', tc = 'tag';
  if (!on) { msg = 'المتحكم غير متصل — تحقق من التغذية والواي فاي'; cls = 'bad'; tg = 'غير متصل'; tc = 'tag bad'; }
  else if (running) { msg = d.force ? 'تشغيل يدوي: حماية الخزان متجاوزة' : 'المضخة تعمل — اضغط الزر لإيقافها'; cls = d.force ? 'warn' : ''; tg = 'قيد السقي'; tc = 'tag blue'; }
  else if (lv !== 1 && !IRR.force) { msg = 'الخزان ليس ممتلئاً — فعّل «تشغيل يدوي» لتجاوز الحماية إن أردت'; cls = 'warn'; tg = 'الخزان'; tc = 'tag warn'; }
  else if (hot && zkind(IRR.zone) !== 'greenhouse' && !IRR.force) { msg = 'الرياح قوية والرش يضيع الماء — فعّل «تشغيل يدوي» للتجاوز'; cls = 'warn'; tg = 'رياح'; tc = 'tag warn'; }
  else msg = 'كل شيء جاهز للسقي';
  h.className = 'hint ' + cls; h.innerHTML = ic(cls === 'bad' ? 'alert' : cls === 'warn' ? 'info' : 'shield') + `<span>${msg}</span>`;
  tagEl.className = tc; tagEl.textContent = tg;
}
async function bigAction(btn) {
  const running = LIVE && LIVE.online && LIVE.data.pump;
  await busy(btn, async () => {
    const r = running ? await api('/api/irrigate', {method: 'POST', body: {stop: true}})
      : await api('/api/irrigate', {method: 'POST', body: {zone_id: IRR.zone, minutes: IRR.minutes, force: IRR.force}});
    toast(r.message, !r.ok); await refreshLive();
  });
}
async function irrigate(zone, minutes) { const r = await api('/api/irrigate', {method: 'POST', body: {zone_id: zone, minutes}}); toast(r.message, !r.ok); refreshLive(); return r; }

/* ---------- التوصيات (شرائح) ---------- */
const REC_ICON = {critical: 'alert', warn: 'alert', info: 'info', tip: 'bulb', ai: 'brain'};
const REC_LABEL = {critical: 'عاجل', warn: 'تنبيه', info: 'معلومة', tip: 'نصيحة', ai: 'ذكاء اصطناعي'};
function slideHTML(r) {
  return `<article class="slide ${r.level}"><div class="hd"><span class="badge">${ic(REC_ICON[r.level] || 'info', 'lg')}</span><div><div>${esc(r.title)}</div><span class="tag ${r.level === 'critical' ? 'bad' : r.level === 'warn' ? 'warn' : r.level === 'ai' ? 'violet' : r.level === 'info' ? 'blue' : ''}">${REC_LABEL[r.level] || ''}</span></div></div>
    <div class="tx">${esc(r.text)}</div>
    <div class="ft"><span class="muted">${r.zone ? esc(zname(r.zone)) : 'عام'}${r.confidence ? ' · ثقة ' + Math.round(r.confidence * 100) + '%' : ''}</span>
      <span class="row" style="gap:4px"><button class="btn icon sm" title="مفيدة" onclick="vote(this,'${r.key || ''}',1,'${esc(r.title).replace(/'/g, '')}','${r.level}',${r.zone || 'null'})">${ic('up')}</button>
      <button class="btn icon sm" title="غير مفيدة" onclick="vote(this,'${r.key || ''}',-1,'${esc(r.title).replace(/'/g, '')}','${r.level}',${r.zone || 'null'})">${ic('down')}</button></span></div></article>`;
}
function sliderHTML(id, recs) {
  if (!recs.length) return `<div class="empty">${ic('check')}<div>لا توصيات الآن</div></div>`;
  return `<div class="slides-wrap"><div class="slides" id="${id}">${recs.map(slideHTML).join('')}</div>
    <div class="sl-nav"><button class="btn icon sm" onclick="slideTo('${id}',1)" aria-label="التالي">${ic('chevR')}</button><div class="dots" id="${id}Dots">${recs.map((_, i) => `<i onclick="slideTo('${id}',0,${i})"></i>`).join('')}</div>
    <button class="btn icon sm" onclick="slideTo('${id}',-1)" aria-label="السابق">${ic('chevL')}</button></div></div>`;
}
function slideIndex(el) { const c = el.getBoundingClientRect(), mid = c.left + c.width / 2; let best = 0, bd = 1e9; [...el.children].forEach((s, i) => { const r = s.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = i; } }); return best; }
function slideTo(id, dir, abs) {   // يحرّك حاوية الشرائح فقط (scrollIntoView كان يحرّك الصفحة كلها عمودياً)
  const el = $('#' + id); if (!el) return; const n = el.children.length; const i = abs != null ? abs : (slideIndex(el) + dir + n) % n;
  const c = el.getBoundingClientRect(), s = el.children[i].getBoundingClientRect();
  el.scrollTo({left: el.scrollLeft + (s.left + s.width / 2) - (c.left + c.width / 2), behavior: 'smooth'});
}
const inView = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
function initSlider(id, auto) {
  const el = $('#' + id); if (!el) return; const dots = $('#' + id + 'Dots');
  const upd = () => { const i = slideIndex(el); [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i)); };
  el.addEventListener('scroll', () => requestAnimationFrame(upd)); upd();
  let paused = false; ['pointerenter', 'touchstart', 'focusin'].forEach(e => el.addEventListener(e, () => paused = true)); ['pointerleave', 'touchend'].forEach(e => el.addEventListener(e, () => paused = false));
  if (auto) TIMERS.push(setInterval(() => { if (!paused && document.hasFocus() && inView(el)) slideTo(id, 1); }, 7000));
}
async function vote(btn, key, v, title, level, zone) {
  const r = await api('/api/ai/feedback', {method: 'POST', body: {key, vote: v, title, level, zone}});
  btn.parentNode.querySelectorAll('button').forEach(b => b.disabled = true); btn.classList.add(v > 0 ? 'primary' : 'danger');
  toast(r.ok ? 'شكراً! سُجّل تقييمك لتحسين النموذج الذكي' : 'سُجّل تقييمك (خدمة الذكاء متوقفة حالياً)');
}
async function loadRecs() {
  const r = await api('/api/recommendations'); const el = $('#recs'); if (!el) return;
  const sig = JSON.stringify(r.map(x => x.key)); $('#recCount').textContent = r.length ? r.length + ' توصية' : '';
  if (sig === lastRecSig) return; lastRecSig = sig;
  el.innerHTML = sliderHTML('recSl', r); initSlider('recSl', true);
}
async function loadSummary() {
  const s = await api('/api/summary'); const el = $('#sum'); if (!el) return; const v = x => x == null ? '—' : x;
  el.innerHTML = `<div class="mini"><b>${v(s.wind_max_today)}</b><span>أقصى رياح (كم/س)</span></div><div class="mini"><b>${v(s.soil_min)}–${v(s.soil_max)}</b><span>مدى الرطوبة %</span></div>
    <div class="mini"><b>${v(s.soil_avg)}</b><span>متوسط الرطوبة %</span></div><div class="mini"><b>${s.irrigations_today}</b><span>مرات السقي</span></div><div class="mini"><b>${s.minutes_today}</b><span>دقائق السقي</span></div>`;
}

/* ---------- الرسوم البيانية ---------- */
async function loadCharts() {
  const h = await api('/api/history?hours=' + chartHours); if (!$('#chSoil')) return; const st = soilStage();
  drawChart($('#chSoil'), h, [{k: 'soil', c: '#0284c7'}], 0, 100, st ? [st.min, st.max] : null);
  drawChart($('#chWind'), h, [{k: 'wind_max', c: '#d97706'}, {k: 'wind', c: '#15803d'}], 0, null, null);
}
function drawChart(cv, data, series, ymin, ymax, band) {
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const css = getComputedStyle(document.body), ink = css.getPropertyValue('--muted').trim() || '#666', line = css.getPropertyValue('--line').trim() || '#ddd';
  const pad = {l: 8, r: 34, t: 8, b: 22};
  if (ymax == null) ymax = Math.max(10, ...data.map(d => d[series[0].k] || 0)) * 1.15;
  const x = i => pad.l + (W - pad.l - pad.r) * (data.length < 2 ? .5 : i / (data.length - 1));
  const y = v => pad.t + (H - pad.t - pad.b) * (1 - (v - ymin) / (ymax - ymin));
  g.font = '11px Cairo,sans-serif'; g.fillStyle = ink; g.strokeStyle = line; g.textAlign = 'left';
  for (let i = 0; i <= 4; i++) { const v = ymin + (ymax - ymin) * i / 4, yy = y(v); g.beginPath(); g.moveTo(pad.l, yy); g.lineTo(W - pad.r, yy); g.stroke(); g.fillText(Math.round(v), W - pad.r + 4, yy + 4); }
  if (band) { g.fillStyle = 'rgba(21,128,61,.18)'; g.fillRect(pad.l, y(band[1]), W - pad.l - pad.r, y(band[0]) - y(band[1])); }
  if (!data.length) { g.fillStyle = ink; g.textAlign = 'center'; g.fillText('لا توجد قراءات بعد (تُسجَّل كل دقيقة)', W / 2, H / 2); return; }
  series.forEach(s => { g.strokeStyle = s.c; g.lineWidth = 2.2; g.lineJoin = 'round'; g.beginPath(); data.forEach((d, i) => { const v = d[s.k]; if (v == null) return; i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v)); }); g.stroke(); });
  g.fillStyle = ink; g.textAlign = 'center'; [0, .33, .66, 1].forEach(f => { const i = Math.round((data.length - 1) * f); g.fillText(fmtTime(data[i].t), x(i), H - 6); });
  data.forEach((d, i) => { if (d.pump) { g.fillStyle = 'rgba(2,132,199,.55)'; g.fillRect(x(i) - 1.5, H - pad.b - 5, 3, 5); } });
}

/* ---------- المزارع ---------- */
async function pageZones() {
  ZONES = await api('/api/zones');
  $('#view').innerHTML = `<div class="page"><div class="title"><div class="ico">${ic('sprout')}</div><h2>مزارعي</h2></div><div class="grid g3">${ZONES.map(zoneCard).join('')}</div></div>`;
}
function zoneCard(z) {
  const st = z.stage, pct = st ? Math.min(100, Math.round(st.day / st.total_days * 100)) : 0, exp = z.expected_yield || 0, yp = exp ? Math.min(100, Math.round(z.total_yield / exp * 100)) : 0;
  return `<div class="card zone hov"><div class="pic" style="background-image:url(img/${ZONE_IMG[z.kind] || 'img1.jpg'})"><div class="nm">${ic(ZONE_ICON[z.kind] || 'field')}<span>${esc(z.name)}</span>${z.has_soil_sensor ? `<span class="tag blue">${ic('droplet')} حساس الرطوبة</span>` : ''}</div></div>
    <div class="body">
      ${z.crop ? `<div class="row between"><b style="font-size:1.1rem">${cropBadge(z.crop)} ${esc(z.crop_name)}</b><span class="tag">${st ? esc(st.name) : 'أدخل تاريخ الزراعة'}</span></div>
        ${st ? `<div class="progress"><i style="width:${pct}%"></i></div><div class="muted">اليوم ${st.day} من ${st.total_days} — الحصاد بعد ${st.days_to_harvest} يوماً</div><div class="kv"><span>الرطوبة المستهدفة</span><b>${st.min}–${st.max}%</b></div>` : ''}` : `<div class="muted">لم يُحدَّد محصول بعد.</div>`}
      <div class="kv"><span>المساحة</span><b>${z.area_m2 || '—'} م²</b></div>
      <div class="kv"><span>الحصاد المسجَّل</span><b>${z.total_yield} ${esc(z.unit)}${exp ? ` (${yp}% من ${exp})` : ''}</b></div>
      <div class="kv"><span>الملاحظات</span><b>${z.notes_count}</b></div>
      ${z.has_soil_sensor ? `<div class="kv"><span>سقي تلقائي حسب الرطوبة</span><b>${z.auto_mode ? 'مفعّل (' + z.auto_minutes + ' د)' : 'متوقف'}</b></div>` : ''}
      <div class="sp"></div>
      <div class="row">
        <button class="btn sm primary" onclick="editZone(${z.id})">${ic('edit')} تعديل / المحصول</button>
        <button class="btn sm blue" onclick="IRR.zone=${z.id};saveIrr();location.hash='#/home'">${ic('droplet')} اسقِ</button>
        <button class="btn sm" onclick="notesZone=${z.id};location.hash='#/notes'">${ic('notes')} ملاحظة</button>
        <button class="btn sm" onclick="notesZone=${z.id};location.hash='#/notes'">${ic('box')} محصول</button>
        ${z.kind === 'pivot' ? `<button class="btn sm" onclick="auxToggle(true,this)">${ic('play')} تشغيل البيفو</button><button class="btn sm" onclick="auxToggle(false,this)">${ic('stop')} إيقاف البيفو</button>` : ''}
      </div></div></div>`;
}
async function auxToggle(state, btn) { await busy(btn, async () => { const r = await api('/api/aux', {method: 'POST', body: {ch: 'pivot', state}}); toast(r.message, !r.ok); }); }
function editZone(id) {
  const z = ZONES.find(z => z.id == id);
  openModal(`<div class="title"><div class="ico">${ic('edit')}</div><h3>${esc(z.name)}</h3></div>
  <div class="form2">
    <div class="full"><label>الاسم</label><input id="zName" value="${esc(z.name)}"></div>
    <div><label>المحصول</label><select id="zCrop" onchange="cropPreview()"><option value="">— اختر —</option>${CROPS.map(c => `<option value="${c.key}" ${z.crop === c.key ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
    <div><label>تاريخ الزراعة</label><input id="zPlant" type="date" value="${esc(z.planted_on || '')}"></div>
    <div><label>المساحة (م²)</label><input id="zArea" type="number" min="0" value="${z.area_m2 || ''}"></div>
    <div><label>الإنتاج المتوقع</label><div class="row" style="flex-wrap:nowrap"><input id="zExp" type="number" min="0" value="${z.expected_yield || ''}"><input id="zUnit" value="${esc(z.unit)}" style="width:90px"></div></div>
    <div class="full" id="cropInfo"></div>
    <div class="full"><label class="switch" style="margin:0"><input type="checkbox" id="zAuto" ${z.auto_mode ? 'checked' : ''} ${z.has_soil_sensor ? '' : 'disabled'}><span class="track"></span><span>سقي تلقائي عند جفاف التربة <small>(5–10 صباحاً و17–21 مساءً)</small></span></label>
      ${z.has_soil_sensor ? '' : '<div class="muted" style="margin-top:4px">متاح للمنطقة التي فيها حساس الرطوبة فقط (يُحدَّد من الإعدادات)</div>'}</div>
    <div><label>مدة السقي التلقائي (دقائق)</label><input id="zAutoMin" type="number" min="1" max="60" value="${z.auto_minutes}"></div>
  </div>
  <div class="row" style="margin-top:16px"><button class="btn primary" onclick="saveZone(${id},this)">${ic('check')} حفظ</button><button class="btn" onclick="closeModal()">إلغاء</button></div>`);
  cropPreview();
}
function cropPreview() {
  const c = CROPS.find(c => c.key === $('#zCrop').value), el = $('#cropInfo');
  el.innerHTML = c ? `<div class="card" style="background:var(--green-l);box-shadow:none"><b>${cropBadge(c.key)} ${esc(c.name)}</b> — الموسم نحو ${c.total_days} يوماً
    <table><tr><th>المرحلة</th><th>أيام</th><th>الرطوبة %</th></tr>${c.stages.map(s => `<tr><td>${esc(s.name)}</td><td>${s.days}</td><td>${s.min}–${s.max}</td></tr>`).join('')}</table><div class="muted">${esc(c.tip)}</div></div>` : '';
}
async function saveZone(id, btn) {
  await busy(btn, async () => {
    const r = await api('/api/zones', {method: 'POST', body: {id, name: $('#zName').value, crop: $('#zCrop').value, planted_on: $('#zPlant').value, area_m2: +$('#zArea').value || 0,
      expected_yield: +$('#zExp').value || 0, unit: $('#zUnit').value || 'كغ', auto_mode: $('#zAuto').checked ? 1 : 0, auto_minutes: +$('#zAutoMin').value || 5}});
    if (r.error) return toast(r.error, true); ZONES = r; closeModal(); toast('تم الحفظ'); route();
  });
}

/* ---------- السقي ---------- */
async function pageIrrigation() {
  const [sch, log] = await Promise.all([api('/api/schedules'), api('/api/irrigation_log')]);
  $('#view').innerHTML = `<div class="page"><div class="title"><div class="ico blue">${ic('droplet')}</div><h2>السقي</h2></div>
  <div class="grid g2">
    <div class="card"><div class="title"><div class="ico">${ic('clock')}</div><h3>جدول السقي التلقائي</h3></div>
      <div class="muted">تُشغَّل المضخة تلقائياً في الوقت المحدد، ويتخطى الجدول السقي إن كانت التربة رطبة أصلاً أو الرياح قوية.</div>
      <div class="form2">
        <div><label>المنطقة</label><select id="sZone">${ZONES.map(z => `<option value="${z.id}">${esc(z.name)}</option>`).join('')}</select></div>
        <div><label>الوقت</label><input id="sTime" type="time" value="06:00"></div>
        <div><label>المدة (دقائق)</label><input id="sMin" type="number" min="1" max="60" value="10"></div>
        <div class="full"><label>الأيام</label><div class="days" id="sDays">${DAYS.map((d, i) => `<button class="chip sel" data-d="${i}" onclick="this.classList.toggle('sel')">${d}</button>`).join('')}</div></div>
      </div><div class="sp"></div><button class="btn primary" onclick="addSchedule(this)">${ic('plus')} إضافة جدول</button><div class="sp"></div>
      ${sch.length ? `<table><tr><th>المنطقة</th><th>الوقت</th><th>مدة</th><th>الأيام</th><th></th></tr>${sch.map(s => `<tr><td>${esc(zname(s.zone_id))}</td><td><b>${s.time}</b></td><td>${s.minutes} د</td>
        <td class="muted">${s.days.length === 7 ? 'كل يوم' : [...s.days].map(d => DAYS[d].slice(0, 3)).join('، ')}</td>
        <td style="white-space:nowrap"><button class="btn sm icon ${s.enabled ? 'primary' : ''}" title="${s.enabled ? 'إيقاف' : 'تفعيل'}" onclick="toggleSch(${s.id},${s.enabled ? 0 : 1})">${ic(s.enabled ? 'check' : 'clock')}</button>
        <button class="btn sm icon danger" onclick="delSch(${s.id})">${ic('trash')}</button></td></tr>`).join('')}</table>` : `<div class="empty">${ic('clock')}<div>لا توجد جداول بعد</div></div>`}
    </div>
    <div class="card"><div class="title"><div class="ico violet">${ic('notes')}</div><h3>سجل السقي</h3></div>
      ${log.length ? `<table><tr><th>الوقت</th><th>المنطقة</th><th>المصدر</th><th>النتيجة</th></tr>${log.map(l => `<tr><td>${fmtDT(l.ts)}</td><td>${esc(zname(l.zone_id))}</td><td>${{manual: 'يدوي', schedule: 'جدول', auto: 'تلقائي'}[l.source] || l.source}</td><td>${esc(logResult(l))}</td></tr>`).join('')}</table>` : `<div class="empty">${ic('notes')}<div>لا سجلات بعد</div></div>`}
    </div></div></div>`;
}
function logResult(l) {
  const r = l.result;
  if (r.startsWith('started')) return `بدأ ${l.minutes} د${r.includes('يدوي') ? ' (يدوي)' : ''}`; if (r === 'stopped') return 'أُوقف'; if (r.startsWith('skipped: wind')) return 'تأجّل: رياح قوية';
  if (r.startsWith('skipped: already')) return 'تخطّى: التربة رطبة'; if (r.startsWith('blocked')) return 'ممنوع: الخزان فارغ'; if (r.startsWith('failed: offline')) return 'فشل: المتحكم غير متصل';
  return r;
}
async function addSchedule(btn) {
  const days = [...document.querySelectorAll('#sDays .chip.sel')].map(c => c.dataset.d).join(''); if (!days) return toast('اختر يوماً واحداً على الأقل', true);
  await busy(btn, async () => { const r = await api('/api/schedules', {method: 'POST', body: {zone_id: +$('#sZone').value, time: $('#sTime').value, minutes: +$('#sMin').value, days}}); if (r.error) return toast(r.error, true); toast('أُضيف الجدول'); pageIrrigation(); });
}
async function toggleSch(id, en) { await api('/api/schedules', {method: 'PATCH', body: {id, enabled: en}}); pageIrrigation(); }
async function delSch(id) { if (confirm('حذف هذا الجدول؟')) { await api('/api/schedules?id=' + id, {method: 'DELETE'}); pageIrrigation(); } }

/* ---------- الملاحظات والمحصول ---------- */
async function pageNotes() {
  const [notes, yields] = await Promise.all([api('/api/notes' + (notesZone ? '?zone=' + notesZone : '')), api('/api/yields')]);
  const ys = yields.filter(y => !notesZone || y.zone_id == notesZone), totals = {}; yields.forEach(y => totals[y.zone_id] = (totals[y.zone_id] || 0) + y.qty);
  const zsel = id => ZONES.map(z => `<option value="${z.id}" ${notesZone == z.id ? 'selected' : ''}>${esc(z.name)}</option>`).join('');
  $('#view').innerHTML = `<div class="page"><div class="title"><div class="ico">${ic('notes')}</div><h2>الملاحظات والمحصول</h2></div>
  <div class="chips" style="margin-bottom:14px"><button class="chip ${!notesZone ? 'sel' : ''}" onclick="notesZone='';pageNotes()">الكل</button>${ZONES.map(z => `<button class="chip ${notesZone == z.id ? 'sel' : ''}" onclick="notesZone=${z.id};pageNotes()">${esc(z.name)}</button>`).join('')}</div>
  <div class="grid g2">
    <div class="card"><div class="title"><div class="ico amber">${ic('edit')}</div><h3>ملاحظات المحصول</h3></div>
      <div class="form2"><div><label>المنطقة</label><select id="nZone">${zsel()}</select></div><div><label>النوع</label><select id="nCat">${NOTE_CATS.map(c => `<option>${c}</option>`).join('')}</select></div>
        <div class="full"><label>الملاحظة</label><textarea id="nText" rows="3" placeholder="مثال: ظهور حشرات على الأوراق السفلية، تم الرش بالزيت..."></textarea></div></div>
      <div class="sp"></div><button class="btn primary" onclick="addNote(this)">${ic('check')} حفظ الملاحظة</button><div class="sp"></div>
      ${notes.length ? notes.map(n => `<div class="note"><div class="row between"><b>${esc(zname(n.zone_id))} <span class="tag">${esc(n.category)}</span></b><span class="muted">${fmtDT(n.ts)}</span></div><div>${esc(n.text)}</div>
        <div style="margin-top:6px"><button class="btn sm" onclick="delNote(${n.id})">${ic('trash')} حذف</button></div></div>`).join('') : `<div class="empty">${ic('notes')}<div>لا ملاحظات بعد</div></div>`}
    </div>
    <div class="card"><div class="title"><div class="ico">${ic('box')}</div><h3>كمية المحصول</h3></div>
      <div class="form2"><div><label>المنطقة</label><select id="yZone">${zsel()}</select></div>
        <div><label>الكمية</label><div class="row" style="flex-wrap:nowrap"><input id="yQty" type="number" min="0" step="any"><input id="yUnit" value="كغ" style="width:90px"></div></div>
        <div class="full"><label>ملاحظة (اختياري)</label><input id="yNote" placeholder="مثال: قطفة أولى"></div></div>
      <div class="sp"></div><button class="btn primary" onclick="addYield(this)">${ic('check')} تسجيل الكمية</button><div class="sp"></div>
      <div class="chips">${ZONES.map(z => `<span class="tag">${esc(z.name)}: ${totals[z.id] || 0}</span>`).join('')}</div><div class="sp"></div>
      ${ys.length ? `<table><tr><th>التاريخ</th><th>المنطقة</th><th>الكمية</th><th></th></tr>${ys.map(y => `<tr><td>${fmtDT(y.ts)}</td><td>${esc(zname(y.zone_id))}</td><td><b>${y.qty} ${esc(y.unit)}</b> <span class="muted">${esc(y.note)}</span></td><td><button class="btn sm icon" onclick="delYield(${y.id})">${ic('trash')}</button></td></tr>`).join('')}</table>` : `<div class="empty">${ic('box')}<div>لا سجلات</div></div>`}
    </div></div></div>`;
}
async function addNote(btn) { await busy(btn, async () => { const r = await api('/api/notes', {method: 'POST', body: {zone_id: +$('#nZone').value, category: $('#nCat').value, text: $('#nText').value}}); if (r.error) return toast(r.error, true); toast('تم الحفظ'); pageNotes(); }); }
async function delNote(id) { if (confirm('حذف الملاحظة؟')) { await api('/api/notes?id=' + id, {method: 'DELETE'}); pageNotes(); } }
async function addYield(btn) { const qty = +$('#yQty').value; if (!qty) return toast('أدخل الكمية', true);
  await busy(btn, async () => { await api('/api/yields', {method: 'POST', body: {zone_id: +$('#yZone').value, qty, unit: $('#yUnit').value || 'كغ', note: $('#yNote').value}}); toast('تم التسجيل'); pageNotes(); }); }
async function delYield(id) { if (confirm('حذف السجل؟')) { await api('/api/yields?id=' + id, {method: 'DELETE'}); pageNotes(); } }

/* ---------- الكاميرات ---------- */
async function pageCameras() {
  const cams = await api('/api/cameras');
  $('#view').innerHTML = `<div class="page"><div class="title"><div class="ico violet">${ic('camera')}</div><h2>الكاميرات</h2></div><div class="grid g2">${cams.map(c => `<div class="card"><div class="row between"><b>${esc(c.name)}</b>
    <button class="btn sm" onclick='editCam(${JSON.stringify(c).replace(/'/g, '&#39;')})'>${ic('settings')} ضبط</button></div><div class="sp s"></div>
    <div class="cam">${c.url ? `<img data-url="${esc(c.url)}" src="${esc(c.url)}" alt="" onerror="this.parentNode.textContent='تعذّر عرض الكاميرا'">` : `<div>${ic('camera', 'xl')}<div>لم يُضبط رابط الكاميرا بعد</div></div>`}</div></div>`).join('')}</div>
  <div class="sp"></div><div class="card muted">${ic('info')} الكاميرات تُعرض عبر رابط <b>MJPEG</b> أو <b>لقطة (snapshot)</b> على شبكة المزرعة، مثل <code dir="ltr">http://192.168.1.50/video</code>. روابط RTSP لا يعرضها المتصفح مباشرة؛ نضيف لها محوّلاً لاحقاً.</div></div>`;
  TIMERS.push(setInterval(() => document.querySelectorAll('.cam img[data-url]').forEach(i => { const u = i.dataset.url; if (/\.(jpg|jpeg)|snapshot/i.test(u)) i.src = u + (u.includes('?') ? '&' : '?') + 't=' + Date.now(); }), 3000));
}
function editCam(c) { openModal(`<div class="title"><div class="ico violet">${ic('camera')}</div><h3>ضبط الكاميرا ${c.id}</h3></div><label>الاسم</label><input id="cName" value="${esc(c.name)}">
  <label>رابط البث (MJPEG أو لقطة)</label><input id="cUrl" dir="ltr" value="${esc(c.url)}" placeholder="http://192.168.1.50/video">
  <div class="row" style="margin-top:16px"><button class="btn primary" onclick="saveCam(${c.id},this)">${ic('check')} حفظ</button><button class="btn" onclick="closeModal()">إلغاء</button></div>`); }
async function saveCam(id, btn) { await busy(btn, async () => { await api('/api/cameras', {method: 'POST', body: {id, name: $('#cName').value, url: $('#cUrl').value}}); closeModal(); pageCameras(); }); }

/* ---------- الذكاء الاصطناعي (واجهة الخدمة المعزولة) ---------- */
async function pageAI() {
  $('#view').innerHTML = `<div class="page"><div class="card" style="text-align:center;padding:30px">${ic('brain', 'xl')}<div class="muted">جارٍ الاتصال بخدمة الذكاء...</div></div></div>`;
  const [s, rec] = await Promise.all([api('/api/ai/status'), api('/api/ai/recommend')]);
  const pct = s.online ? Math.min(100, Math.round(s.samples / s.target_rows * 100)) : 0;
  const fmtD = t => t ? new Date(t * 1000).toLocaleDateString('ar-u-nu-latn') : '—';
  const job = s.last_job;
  $('#view').innerHTML = `<div class="page">
  <div class="card" style="background:linear-gradient(135deg,var(--violet-l),var(--blue-l))"><div class="row between"><div class="title" style="margin:0"><div class="ico violet">${ic('brain')}</div><div><h2>الذكاء الاصطناعي</h2><div class="muted">خدمة معزولة: عملية مستقلة وقاعدة بيانات خاصة. إن توقفت تستمر المنصة بالعمل كاملة.</div></div></div>
    <span class="tag ${s.online ? '' : 'bad'}">${ic('server')} ${s.online ? 'الخدمة تعمل' : 'الخدمة متوقفة'}</span></div></div>
  <div class="sp"></div>
  ${!s.online ? `<div class="card"><div class="empty">${ic('server')}<h3>خدمة الذكاء غير مشغّلة</h3><div class="muted">شغّلها بالأمر:</div><code dir="ltr" style="display:inline-block;margin-top:8px;padding:6px 12px;background:var(--soft);border-radius:8px">python platform\\ai\\ai_service.py</code><div class="muted" style="margin-top:8px">أو شغّل الملف <b>start_farm.bat</b> الذي يشغّل كل شيء.</div></div></div>` : `
  <div class="grid g2">
    <div class="card"><div class="row between"><div class="title" style="margin:0"><div class="ico">${ic('db')}</div><h3>جمع البيانات</h3></div>
      <label class="switch" style="margin:0"><input type="checkbox" ${s.collecting ? 'checked' : ''} onchange="aiCollect(this.checked)"><span class="track"></span><span>${s.collecting ? 'يجمع' : 'متوقف'}</span></label></div><div class="sp s"></div>
      <div class="mrow"><div class="mini"><b>${s.samples}</b><span>عيّنة حساسات</span></div><div class="mini"><b>${s.events}</b><span>حدث سقي</span></div><div class="mini"><b>${s.feedback_up + s.feedback_down}</b><span>تقييم</span></div><div class="mini"><b>${s.db_kb}</b><span>KB حجم</span></div></div>
      <div class="sp"></div><div class="kv"><span>جاهزية البيانات للتدريب</span><b>${pct}% (${s.samples}/${s.target_rows})</b></div><div class="progress"><i style="width:${pct}%"></i></div>
      <div class="kv"><span>أول عيّنة</span><b>${fmtD(s.first_ts)}</b></div><div class="kv"><span>آخر عيّنة</span><b>${fmtD(s.last_ts)}</b></div>
      <div class="kv"><span>تقييمات التوصيات</span><b>${ic('up')} ${s.feedback_up} &nbsp; ${ic('down')} ${s.feedback_down}</b></div>
      ${s.zones.length ? `<div class="sp s"></div><div class="muted">تغطية المحاصيل:</div>${s.zones.map(z => `<div class="kv"><span>${esc(zname(z.zone_id))} ${z.crop ? '— ' + esc((CROPS.find(c => c.key === z.crop) || {}).name || z.crop) : ''}</span><b>${z.n}</b></div>`).join('')}` : ''}
      <div class="muted" style="margin-top:8px">تُرسَل عيّنة كل 5 دقائق (رطوبة، رياح، خزان، مضخة، محصول ومرحلة) إضافة إلى أحداث السقي وتقييماتك للتوصيات.</div>
    </div>
    <div class="card"><div class="title"><div class="ico violet">${ic('star')}</div><h3>النموذج</h3></div>
      <div class="kv"><span>الحالة</span><b>${s.model_ready ? '<span class="tag">جاهز: ' + esc(s.active_model) + '</span>' : '<span class="tag warn">لم يُدرَّب بعد</span>'}</b></div>
      <div class="kv"><span>إصدار الخدمة</span><b>${esc(s.version)}</b></div>
      <div class="kv"><span>نماذج محفوظة</span><b>${s.models.length}</b></div>
      ${job ? `<div class="kv"><span>آخر عملية تدريب</span><b>${esc(job.status)}</b></div>` : ''}
      <div class="sp"></div><div class="row"><button class="btn violet" onclick="aiTrain(this)">${ic('play')} ابدأ التدريب</button></div><div id="aiMsg" class="muted" style="margin-top:8px"></div>
      <div class="sp"></div><div class="title"><div class="ico">${ic('download')}</div><h3>تصدير البيانات</h3></div>
      <div class="row"><button class="btn sm" onclick="aiExport('samples',this)">${ic('download')} العيّنات</button><button class="btn sm" onclick="aiExport('events',this)">${ic('download')} أحداث السقي</button><button class="btn sm" onclick="aiExport('feedback',this)">${ic('download')} التقييمات</button></div>
      <div class="muted" style="margin-top:8px">ملفات CSV جاهزة للتدريب خارجياً أيضاً (Excel / Python).</div>
    </div>
  </div><div class="sp"></div>`}
  <section class="card"><div class="title"><div class="ico violet">${ic('bulb')}</div><h2>توصيات النموذج الذكي</h2></div>
    ${rec.items && rec.items.length ? sliderHTML('aiSl', rec.items.map(r => ({...r, level: 'ai', key: r.key || 'ai' + r.title}))) : `<div class="empty">${ic('brain')}<div>${rec.offline ? 'الخدمة متوقفة' : 'لا يوجد نموذج مُدرَّب بعد'}</div><div class="muted">عندما تُبرمج النموذج في <b dir="ltr">platform/ai/model.py</b> وتُدرّبه ستظهر توصياته هنا كشرائح.</div></div>`}</section>
  <div class="sp"></div>
  <div class="card"><div class="title"><div class="ico">${ic('shield')}</div><h3>كيف يتعلّم النظام؟</h3></div><div class="grid g3">
    <div class="mini" style="text-align:right"><b>1 · جمع</b><span>كل 5 دقائق تُحفظ حالة المزرعة مع المحصول ومرحلته، وكل عملية سقي.</span></div>
    <div class="mini" style="text-align:right"><b>2 · تقييم</b><span>اضغط ${ic('up')} أو ${ic('down')} على أي توصية؛ ردودك تعلّم النموذج ما يناسب مزرعتك.</span></div>
    <div class="mini" style="text-align:right"><b>3 · تدريب</b><span>عند اكتمال البيانات يُدرَّب النموذج وتظهر توصياته هنا دون المساس بباقي المنصة.</span></div></div></div></div>`;
  initSlider('aiSl', true);
}
async function aiCollect(en) { const r = await api('/api/ai/collect', {method: 'POST', body: {enabled: en}}); toast(r.ok ? (en ? 'تم تفعيل جمع البيانات' : 'تم إيقاف جمع البيانات') : (r.message || 'تعذّر'), !r.ok); pageAI(); }
async function aiTrain(btn) { await busy(btn, async () => { const r = await api('/api/ai/train', {method: 'POST'}); $('#aiMsg').innerHTML = (r.ok ? ic('check') : ic('info')) + ' ' + esc(r.message || r.status || ''); toast(r.ok ? 'اكتمل التدريب' : (r.message || 'لم يُنفَّذ التدريب'), !r.ok); }); }
async function aiExport(t, btn) {
  await busy(btn, async () => {
    const r = await fetch('/api/ai/export?table=' + t, {headers: {'X-Pin': PIN}});
    if (!r.ok) return toast('تعذّر التصدير', true);
    const a = document.createElement('a'); a.href = URL.createObjectURL(await r.blob()); a.download = t + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
}

/* ---------- الإعدادات ---------- */
async function pageSettings() {
  const s = await api('/api/settings'); const d = (LIVE && LIVE.data) || {};
  $('#view').innerHTML = `<div class="page"><div class="title"><div class="ico">${ic('settings')}</div><h2>الإعدادات</h2></div><div class="grid g2">
  <div class="card"><div class="title"><div class="ico">${ic('sprout')}</div><h3>عام</h3></div>
    <label>عنوان المتحكم (اللوحة)</label><input id="sDev" dir="ltr" value="${esc(s.device_url)}">
    <label>حد الرياح لإيقاف السقي بالرش (كم/س)</label><input id="sWind" type="number" value="${s.wind_limit_kmh}">
    <label>المنطقة التي فيها حساس الرطوبة</label><select id="sSoil">${ZONES.map(z => `<option value="${z.id}" ${s.soil_zone == z.id ? 'selected' : ''}>${esc(z.name)}</option>`).join('')}</select>
    <label>أقصى مدة سقي يدوي (دقائق)</label><input id="sMax" type="number" value="${s.max_manual_minutes}">
    <label>رمز دخول جديد (اتركه فارغاً للإبقاء)</label><input id="sPin" inputmode="numeric" placeholder="4 إلى 12 رقماً">
    <div class="sp"></div><button class="btn primary" onclick="saveSettings(this)">${ic('check')} حفظ</button></div>
  <div class="card"><div class="title"><div class="ico blue">${ic('wifi')}</div><h3>شبكة الواي فاي للمتحكم</h3></div>
    <div class="kv"><span>الشبكة الحالية</span><b>${esc(d.ssid || '—')}</b></div><div class="kv"><span>قوة الإشارة</span><b>${d.rssi ? d.rssi + ' dBm' : '—'}</b></div>
    <div class="sp"></div><button class="btn blue" onclick="scanWifi(this)">${ic('search')} بحث عن الشبكات</button><div id="wifiList"></div>
    <div class="muted" style="margin-top:10px">عند نقل المتحكم إلى مكان آخر: إن لم يجد شبكته خلال 30 ثانية يفتح شبكة باسم <b>SmartFarm-Setup</b> (كلمتها <b>smartfarm</b>). صِل بها من هاتفك وافتح <b dir="ltr">192.168.4.1</b> لاختيار الشبكة الجديدة وإدخال كلمة المرور.</div></div>
  <div class="card"><div class="title"><div class="ico amber">${ic('bell')}</div><h3>التنبيهات الصوتية والإشعارات</h3></div>
    <label class="switch"><input type="checkbox" ${AL.sound ? 'checked' : ''} onchange="AL.sound=this.checked;saveAL();updateBell()"><span class="track"></span><span>${ic('volume')} أصوات التنبيه</span></label>
    <div class="sp s"></div>
    <label class="switch"><input type="checkbox" id="notifyChk" ${AL.notify ? 'checked' : ''} onchange="setNotify(this.checked)"><span class="track"></span><span>${ic('bell')} إشعارات المتصفح <small>(بدل الصفحة مفتوحة)</small></span></label>
    <label>مستوى الصوت</label><input type="range" min="0.1" max="1" step="0.1" value="${AL.volume}" oninput="AL.volume=+this.value;saveAL()" style="padding:0">
    <div class="sp"></div><div class="row"><button class="btn sm danger" onclick="testAlert('critical')">${ic('alert')} عاجل</button><button class="btn sm" onclick="testAlert('warn')">${ic('alert')} تنبيه</button><button class="btn sm primary" onclick="testAlert('success')">${ic('check')} نجاح</button><button class="btn sm blue" onclick="testAlert('info')">${ic('info')} معلومة</button></div>
    <div class="sp s"></div>
    <div class="muted">تُطلق التنبيهات عند: انقطاع المتحكم، الخزان الفارغ، الرياح القوية، بدء السقي وانتهائه، جفاف التربة، والتوصيات العاجلة. الصوت يعمل بعد أول لمسة في الصفحة (قيد من المتصفح). إشعارات الهاتف خارج التطبيق تتطلب تطبيق أندرويد أو اتصالاً مشفّراً (HTTPS).</div></div>
  <div class="card"><div class="title"><div class="ico violet">${ic('shield')}</div><h3>حول المنصة</h3></div>
    <div class="kv"><span>المنصة</span><b>المزرعة الذكية</b></div><div class="kv"><span>الإصدار</span><b>نسخة أكاديمية</b></div>
    <div class="kv"><span>تصميم وتطوير</span><b>المهندس خيشة يحي</b></div>
    <div class="muted" style="margin-top:10px">جميع الحقوق محفوظة © ${new Date().getFullYear()} المهندس خيشة يحي — نسخة أكاديمية.</div></div></div></div>`;
}
async function saveSettings(btn) {
  await busy(btn, async () => {
    const body = {device_url: $('#sDev').value, wind_limit_kmh: +$('#sWind').value, soil_zone: +$('#sSoil').value, max_manual_minutes: +$('#sMax').value}; if ($('#sPin').value) body.new_pin = $('#sPin').value;
    await api('/api/settings', {method: 'POST', body}); if (body.new_pin) { PIN = body.new_pin; localStorage.setItem('pin', PIN); }
    toast('تم الحفظ'); ZONES = await api('/api/zones'); refreshLive();
  });
}
async function scanWifi(btn) {
  $('#wifiList').innerHTML = '<div class="muted">جارٍ البحث (قد يستغرق ثواني)...</div>';
  await busy(btn, async () => {
    const r = await api('/api/wifi/scan'); if (r.error) { $('#wifiList').innerHTML = `<div class="err">${esc(r.error)}</div>`; return; }
    $('#wifiList').innerHTML = r.sort((a, b) => b.rssi - a.rssi).map(n => `<div class="wifi-item" data-n="${esc(n.ssid)}" onclick="pickWifi(this.dataset.n, ${n.open})"><span>${ic(n.open ? 'wifi' : 'lock')} ${esc(n.ssid)}</span><span class="muted">${n.rssi} dBm</span></div>`).join('') || '<div class="muted">لا شبكات.</div>';
  });
}
function pickWifi(ssid, open) {
  openModal(`<div class="title"><div class="ico blue">${ic('wifi')}</div><h3>${esc(ssid)}</h3></div>${open ? '<div class="muted">شبكة مفتوحة</div>' : '<label>كلمة المرور</label><input id="wPass" type="password" dir="ltr">'}
  <div class="muted" style="margin-top:8px">بعد الحفظ تُعيد اللوحة التشغيل وتتصل بالشبكة الجديدة. تأكد أن الحاسوب/الهاتف على نفس الشبكة.</div>
  <div class="row" style="margin-top:16px"><button class="btn primary" data-n="${esc(ssid)}" onclick="saveWifi(this.dataset.n,this)">${ic('check')} حفظ وإعادة التشغيل</button><button class="btn" onclick="closeModal()">إلغاء</button></div>`);
}
async function saveWifi(ssid, btn) { await busy(btn, async () => { const r = await api('/api/wifi/save', {method: 'POST', body: {ssid, pass: ($('#wPass') || {}).value || ''}}); closeModal(); toast(r.ok ? 'تم الحفظ. اللوحة تعيد الاتصال...' : r.message, !r.ok); }); }

/* ---------- التنبيهات: صوت + إشعارات + سجل ---------- */
const AL = JSON.parse(localStorage.getItem('alerts') || '{"sound":true,"notify":false,"volume":0.7}');
let ALOG = JSON.parse(localStorage.getItem('alog') || '[]'), ALSEEN = +localStorage.getItem('alseen') || 0, PREV = null, ACOOL = {}, ACTX = null;
const saveAL = () => localStorage.setItem('alerts', JSON.stringify(AL));
function audio() { if (!ACTX) { try { ACTX = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (ACTX.state === 'suspended') ACTX.resume(); return ACTX; }
['pointerdown', 'keydown'].forEach(e => document.addEventListener(e, () => audio(), {once: false, passive: true}));   // المتصفح لا يسمح بالصوت قبل أول لمسة
function beep(freq, t0, dur, vol, type = 'sine') {
  const c = audio(); if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, c.currentTime + t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * AL.volume), c.currentTime + t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur); o.connect(g); g.connect(c.destination); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.05);
}
function playSound(level) {
  if (!AL.sound) return;
  if (level === 'critical') { for (let r = 0; r < 2; r++) [0, .22, .44].forEach(t => beep(920, r * .9 + t, .16, .6, 'square')); }   // إنذار عاجل: 3 نبضات × 2
  else if (level === 'warn') { beep(660, 0, .22, .5, 'triangle'); beep(660, .3, .22, .5, 'triangle'); }
  else if (level === 'success') { beep(523, 0, .14, .45); beep(659, .14, .14, .45); beep(784, .28, .22, .45); }
  else { beep(740, 0, .12, .4); beep(988, .13, .18, .4); }
}
function alertNow(key, level, title, text, cooldownMs = 60000) {
  const now = Date.now(); if (ACOOL[key] && now - ACOOL[key] < cooldownMs) return; ACOOL[key] = now;
  ALOG.unshift({ts: Math.floor(now / 1000), level, title, text}); ALOG = ALOG.slice(0, 60); localStorage.setItem('alog', JSON.stringify(ALOG));
  playSound(level); toast(title + (text ? ' — ' + text : ''), level === 'critical' || level === 'warn');
  if (AL.notify && 'Notification' in window && Notification.permission === 'granted') {
    try { new Notification('المزرعة الذكية — ' + title, {body: text || '', tag: key, dir: 'rtl', lang: 'ar', requireInteraction: level === 'critical'}); } catch (e) { /* بعض الأجهزة تتطلب Service Worker */ }
  }
  updateBell();
}
function checkAlerts() {
  if (!LIVE) return; const d = LIVE.data || {}, on = LIVE.online, p = PREV; PREV = {on, level: d.level, pump: d.pump, kmh: d.kmh, pmsg: d.pmsg, zone: d.zone, force: d.force};
  if (!p) return;                               // أول قراءة: لا تنبيه
  if (p.on && !on) alertNow('offline', 'critical', 'انقطع الاتصال بالمتحكم', 'السقي التلقائي متوقف حتى يعود الاتصال', 120000);
  if (!p.on && on) alertNow('online', 'success', 'عاد الاتصال بالمتحكم', '', 30000);
  if (!on) return;
  if (p.level !== 0 && d.level === 0) alertNow('tank0', 'critical', 'الخزان فارغ', 'أضف ماءً — المضخة محمية ولن تعمل', 300000);
  if (p.level === 0 && d.level === 1) alertNow('tank1', 'success', 'تم ملء الخزان', 'المضخة جاهزة للعمل', 60000);
  if (!(p.kmh > LIVE.wind_limit) && d.kmh > LIVE.wind_limit) alertNow('wind', 'warn', 'رياح قوية', `${d.kmh} كم/س — أجّل السقي بالرش`, 600000);
  if (!p.pump && d.pump) alertNow('pstart', d.force ? 'warn' : 'info', d.force ? 'بدأ سقي يدوي (يتجاوز الحماية)' : 'بدأ السقي', zname(d.zone), 5000);
  if (p.pump && !d.pump) {
    if (d.pmsg === 'stopped_empty') alertNow('pstop', 'critical', 'أُوقفت المضخة: نفد الماء', zname(p.zone), 5000);
    else if (d.pmsg === 'timer_done') alertNow('pstop', 'success', 'انتهى السقي', zname(p.zone), 5000);
    else alertNow('pstop', 'info', 'توقفت المضخة', zname(p.zone), 5000);
  }
  const st = soilStage(); if (st && d.pct != null && d.pct < st.min && !(PREV.dry)) { PREV.dry = true; alertNow('dry', 'warn', 'التربة جافة', `الرطوبة ${d.pct}% والمطلوب ${st.min}–${st.max}%`, 1800000); }
  if (st && d.pct >= st.min) PREV.dry = false;
}
async function pollRecAlerts() {      // توصيات عاجلة جديدة (حتى لو لم تكن في الصفحة الرئيسية)
  try { const r = await api('/api/recommendations'); r.filter(x => x.level === 'critical' && x.key).forEach(x => alertNow('rec' + x.key, 'critical', x.title, x.text, 6 * 3600000)); } catch (e) { /* تجاهل */ }
}
setInterval(pollRecAlerts, 60000);
function updateBell() {
  const unread = ALOG.filter(a => a.ts > ALSEEN).length, b = $('#bell'), m = $('#muteBtn'); if (!b) return;
  b.innerHTML = ic('bell') + (unread ? `<span class="badge">${unread > 9 ? '9+' : unread}</span>` : ''); b.classList.toggle('has', unread > 0);
  m.innerHTML = ic(AL.sound ? 'volume' : 'volumeOff'); m.title = AL.sound ? 'كتم الصوت' : 'تشغيل الصوت';
}
function toggleMute() { AL.sound = !AL.sound; saveAL(); updateBell(); toast(AL.sound ? 'تم تشغيل الصوت' : 'تم كتم الصوت'); if (AL.sound) playSound('info'); if (PAGE === 'settings') pageSettings(); }
function openAlerts() {
  ALSEEN = Math.floor(Date.now() / 1000); localStorage.setItem('alseen', ALSEEN); updateBell();
  const col = {critical: 'bad', warn: 'warn', success: '', info: 'blue'}, ico = {critical: 'alert', warn: 'alert', success: 'check', info: 'info'};
  openModal(`<div class="row between"><div class="title" style="margin:0"><div class="ico amber">${ic('bell')}</div><h3>سجل التنبيهات</h3></div>${ALOG.length ? `<button class="btn sm" onclick="ALOG=[];localStorage.setItem('alog','[]');openAlerts()">${ic('trash')} مسح</button>` : ''}</div><div class="sp s"></div>
  ${ALOG.length ? ALOG.map(a => `<div class="note"><div class="row between"><b><span class="tag ${col[a.level]}">${ic(ico[a.level])} ${esc(a.title)}</span></b><span class="muted">${fmtDT(a.ts)}</span></div>${a.text ? `<div class="muted" style="margin-top:4px">${esc(a.text)}</div>` : ''}</div>`).join('') : `<div class="empty">${ic('bell')}<div>لا توجد تنبيهات</div></div>`}
  <div class="row" style="margin-top:12px"><button class="btn" onclick="closeModal()">إغلاق</button></div>`);
}
async function setNotify(on) {
  if (!on) { AL.notify = false; saveAL(); return; }
  if (!('Notification' in window)) { toast('هذا المتصفح لا يدعم الإشعارات', true); $('#notifyChk').checked = false; return; }
  const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  AL.notify = p === 'granted'; saveAL(); $('#notifyChk').checked = AL.notify;
  toast(AL.notify ? 'تم تفعيل الإشعارات' : 'تم رفض إذن الإشعارات من المتصفح', !AL.notify);
}
function testAlert(level) { alertNow('test' + Date.now(), level, 'تنبيه تجريبي', 'هكذا يبدو التنبيه ويُسمَع', 0); }

/* ---------- تشغيل ---------- */
buildChrome(); $('#yr').textContent = new Date().getFullYear();
if (PIN) boot(); else showLogin();
