// ก้าวรวมใจ — ชิ้นส่วนหน้าจอที่ใช้ซ้ำ: ไอคอน วงแหวนสุขภาพ ตัวละคร เสียงอ่าน ข้อความแจ้ง

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const P = {
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  sprout: '<path d="M12 21v-9"/><path d="M12 12C12 7 8.5 4.5 4 5c0 4.5 3 7 8 7Z"/><path d="M12 14c0-4 3-6.5 8-6 0 4-3 6-8 6Z"/>',
  team: '<circle cx="8.5" cy="8" r="3.3"/><circle cx="16.5" cy="9" r="2.8"/><path d="M2.5 20c.6-3.8 3-5.8 6-5.8s5.4 2 6 5.8"/><path d="M15 14.4c3.2-.3 5.8 1.5 6.5 5.6"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"/>',
  pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  speaker: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  feet: '<path d="M8 3.5c2 0 3 2.5 3 5.5s-1.2 4-3 4-3-1.5-3-4.5S6 3.5 8 3.5Z"/><path d="M6 15.5h4.5c0 2.5-1 4-2.3 4s-2.2-1.6-2.2-4Z"/><path d="M16 6.5c2 0 3 2.5 3 5s-1.2 4-3 4-3-1.4-3-4.2 1-4.8 3-4.8Z"/><path d="M14 18h4.5c0 2.3-1 3.5-2.3 3.5S14 20.3 14 18Z"/>',
  check: '<path d="M5 12.5l4.3 4.3L19 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>', chev: '<path d="M9 5l7 7-7 7"/>', back: '<path d="M15 5l-7 7 7 7"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  clip: '<rect x="6" y="3" width="12" height="18" rx="6"/><circle cx="12" cy="11" r="3"/>',
  nolink: '<path d="M4 4l16 16"/><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>', pause: '<path d="M9 5v14M15 5v14"/>',
  flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  bt: '<path d="M7 7l10 10-5 4V3l5 4L7 17"/>',
  home: '<path d="M4 11l8-6.5 8 6.5"/><path d="M6 10v9.5h12V10"/><rect x="9.5" y="13" width="5" height="4" rx="1"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.2" r="1"/>',
  server: '<rect x="4" y="4" width="16" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/><path d="M8 7.5h.01M8 16.5h.01"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  lock: '<rect x="5" y="11" width="14" height="9.5" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
  chair: '<path d="M7 3v9h10V3"/><path d="M6 12h12v3H6zM7 15v6M17 15v6"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  fire: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.2 2.3-5 3.6-7.6.5 1.7 1.5 2.7 2.6 3.2C11.6 7 13 4.6 15 3c.3 3.2 3.5 6 3.5 11 0 4-2.6 7-6.5 7Z"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  award: '<circle cx="12" cy="8.5" r="5.5"/><path d="M8.5 13.2L7 21l5-2.7L17 21l-1.5-7.8"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M5 3v3M3.5 4.5h3M19 17v3M17.5 18.5h3"/>',
  calendar: '<rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M8 3v3M16 3v3M3.5 9.5h17"/>',
  smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14c.9 1.4 2.1 2 3.5 2s2.6-.6 3.5-2"/><path d="M9 9.5h.01M15 9.5h.01"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.5h.01"/>',
  refresh: '<path d="M19.5 8A8 8 0 0 0 5 7.5M4.5 16a8 8 0 0 0 14.5.5"/><path d="M19.5 3.5V8H15M4.5 20.5V16H9"/>',
  alert: '<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  scale: '<path d="M12 4v16M6 20h12M5 8h14"/><path d="M5 8l-2.5 6a2.5 2.5 0 0 0 5 0zM19 8l-2.5 6a2.5 2.5 0 0 0 5 0z"/>',
  tree: '<path d="M12 21v-5"/><path d="M12 3c3.5 0 6 2.8 6 6.3 0 3-2.4 5.7-6 5.7s-6-2.7-6-5.7C6 5.8 8.5 3 12 3Z"/>',
  more: '<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>',
};
export function ic(name, size = 26, color = 'currentColor', w = 2.4) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none;display:block">${P[name] || ''}</svg>`;
}

let ringSeq = 0;
export function ring(pct, size, sw, color, inner) {
  const r = (size - sw) / 2, C = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  const gid = `rg-${++ringSeq}`;
  const isBlue = color === '#2F6BFF' || color === '#2563EB';
  const c1 = isBlue ? '#60A5FA' : '#34D399';
  const c2 = isBlue ? '#1D4ED8' : '#15803D';
  const trackColor = isBlue ? '#DBEAFE' : '#DCFCE7';
  const angle = p * 2 * Math.PI - Math.PI / 2;
  const dotX = (size / 2 + r * Math.cos(angle)).toFixed(1);
  const dotY = (size / 2 + r * Math.sin(angle)).toFixed(1);
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" aria-hidden="true" style="transform:none">
      <defs>
        <linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </linearGradient>
      </defs>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${trackColor}" stroke-width="${sw}" fill="none"/>
      ${p > 0 ? `<circle class="ring-arc" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="url(#${gid})" stroke-width="${sw}" fill="none" stroke-linecap="round" transform="rotate(-90 ${size / 2} ${size / 2})" stroke-dasharray="${(C * p).toFixed(1)} ${C.toFixed(1)}"/>` : ''}
      ${p > 0.05 ? `<circle cx="${dotX}" cy="${dotY}" r="${Math.max(3, sw * 0.34)}" fill="#FFFFFF"/>` : ''}
    </svg>
    <div class="in" style="padding:${sw + 6}px">${inner}</div>
  </div>`;
}

export const ART = 'assets/character/';
const HEIGHT = { sleep: 0.62, cute: 0.82, read: 0.84, work: 0.84, sad: 0.82, run: 0.9 };
export function sprite(name, height, extra = '') {
  return `<img src="${ART}${name}.png" alt="" style="height:${Math.round(height * (HEIGHT[name] || 1))}px;${extra}">`;
}
export function head(name, size = 40) {
  return `<span class="head" style="width:${size}px;height:${size}px"><img src="${ART}${name}.png" alt=""></span>`;
}

let toastTimer;
export function toast(text) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = text; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2800);
}

export function confetti(host, n = 36) {
  if (document.documentElement.dataset.motion === 'off' || !host) return;
  const cs = ['#FF9F1C', '#2F6BFF', '#E5486B', '#16A34A', '#FFC531', '#10B981'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i'); c.className = 'conf'; c.style.background = cs[i % cs.length];
    const a = Math.random() * Math.PI * 2, r = 90 + Math.random() * 160;
    c.style.setProperty('--x', `${Math.cos(a) * r}px`); c.style.setProperty('--y', `${Math.sin(a) * r - 70}px`);
    host.appendChild(c); setTimeout(() => c.remove(), 1350);
  }
}

// เสียงอ่านภาษาไทย: เรียกจากการกดปุ่มเท่านั้น (iOS ต้องการ) · ถ้าเครื่องไม่มีเสียงไทย บอกวิธีเพิ่มแทนการอ่านเป็นภาษาอื่น
export function speak(text, enabled = true) {
  if (!enabled) { toast('เสียงอ่านปิดอยู่ เปิดได้ที่หน้าตั้งค่า'); return; }
  if (!('speechSynthesis' in window)) { toast('เบราว์เซอร์นี้อ่านออกเสียงไม่ได้ ลองเปิดด้วย Chrome หรือ Safari'); return; }
  const voices = speechSynthesis.getVoices();
  const th = voices.find((v) => v.lang?.toLowerCase().replace('_', '-').startsWith('th'));
  if (voices.length && !th) {
    toast('เครื่องนี้ยังไม่มีเสียงภาษาไทย · เพิ่มได้ที่ การตั้งค่าเครื่อง → ภาษา → เพิ่มภาษาไทย (เสียงพูด)');
    return;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'th-TH'; u.rate = 0.9;
  if (th) u.voice = th;
  const btns = document.querySelectorAll('[data-act="speak"]');
  btns.forEach((b) => b.classList.add('speaking'));
  const done = () => btns.forEach((b) => b.classList.remove('speaking'));
  u.onend = done; u.onerror = done;
  speechSynthesis.speak(u);
  toast('กำลังอ่านออกเสียง');
}
// บางเบราว์เซอร์โหลดรายชื่อเสียงช้า: แตะ getVoices ไว้ก่อนให้พร้อมตอนกดปุ่ม
try { if ('speechSynthesis' in window) { speechSynthesis.getVoices(); speechSynthesis.addEventListener?.('voiceschanged', () => speechSynthesis.getVoices()); } } catch { /* ไม่เป็นไร */ }

/** กราฟเรดาร์ค่าพลัง 4 ด้าน (STR STA AGI BAL) · เลเวล 1–10 · แถบ 4–7 = ช่วงปกติของวัย */
export function radar(items, size = 240) {
  const n = items.length, c = size / 2, R = size / 2 - 36;
  const pt = (i, r) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / n; return [c + r * Math.cos(a), c + r * Math.sin(a)]; };
  const ringPts = (k) => items.map((_, i) => pt(i, (R * k) / 10).map((v) => v.toFixed(1)).join(',')).join(' ');
  const poly = items.map((it, i) => pt(i, (R * (it.level ?? 0)) / 10).map((v) => v.toFixed(1)).join(',')).join(' ');
  const label = items.map((it, i) => {
    const [x, y] = pt(i, R + 22);
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="17" font-weight="700" fill="currentColor">${it.id} ${it.level ?? '–'}</text>`;
  }).join('');
  const aria = items.map((it) => `${it.name} ${it.level ?? 'ยังไม่ทดสอบ'}`).join(' · ');
  return `<svg class="radar" viewBox="-40 0 ${size + 80} ${size}" width="100%" style="max-width:${size + 80}px" role="img" aria-label="ค่าพลัง: ${esc(aria)}">
    ${[10, 7, 3].map((k) => `<polygon points="${ringPts(k)}" fill="${k === 7 ? '#EAF6EE' : 'none'}" stroke="#D5DED7" stroke-width="1"/>`).join('')}
    ${items.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#D5DED7"/>`; }).join('')}
    <polygon points="${poly}" fill="rgba(22,163,74,.28)" stroke="#15803D" stroke-width="2.5" stroke-linejoin="round"/>
    ${items.map((it, i) => { const [x, y] = pt(i, (R * (it.level ?? 0)) / 10); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${it.level ? '#15803D' : '#fff'}" stroke="#15803D" stroke-width="2"/>`; }).join('')}
    ${label}</svg>`;
}

export function mmss(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
export const nf = (n) => Number(n).toLocaleString('th-TH');
