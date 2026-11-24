// ก้าวรวมใจ — ส่วนกลางของ PWA ใช้ทั้งหน้าเว็บและหน้าแอป
// P5 แถบแนะนำเมื่อเปิดในแอป LINE/Facebook · P16 คำแนะนำติดตั้งบน iOS (ครั้งเดียว) · P17 แจ้งเมื่อมีเวอร์ชันใหม่
import { ic } from './ui.js';

const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* โหมดส่วนตัว/ถูกบล็อก ก็ทำงานต่อได้ */ } },
};
const UA = navigator.userAgent || '';
export const IN_APP = /\bLine\/|FBAN|FBAV|FB_IAB|Instagram/i.test(UA);
export const IS_IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const STANDALONE = (() => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch { return false; } })();

function bar(id, html, onAct) {
  if (document.getElementById(id)) return;
  const el = document.createElement('div');
  el.id = id; el.className = 'sysbar'; el.setAttribute('role', 'status');
  el.innerHTML = html;
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sys]');
    if (!b) return;
    if (b.dataset.sys === 'close') el.remove(); else onAct?.(b.dataset.sys, el);
  });
  document.body.appendChild(el);
}
const closeBtn = `<button data-sys="close" aria-label="ปิด">${ic('x', 20)}</button>`;

export function initPwa() {
  if (IN_APP) {
    bar('sys-inapp', `${ic('alert', 22)}<span><b>เปิดในเบราว์เซอร์หลัก เพื่อเก็บข้อมูลไว้</b><br>แตะ ${ic('more', 18)} มุมขวาบน แล้วเลือก "เปิดในเบราว์เซอร์"</span>${closeBtn}`);
  } else if (IS_IOS && !STANDALONE && !ls.get('krj.iosHint')) {
    bar('sys-ios', `${ic('phone', 22)}<span>ติดตั้งเป็นแอป: แตะปุ่ม <b>แชร์</b> แล้วเลือก <b>"เพิ่มไปยังหน้าจอโฮม"</b></span>${closeBtn}`);
    ls.set('krj.iosHint', '1');
  }
  if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) location.reload(); });
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const offer = (w) => bar('sys-update', `${ic('refresh', 22)}<span><b>มีเวอร์ชันใหม่</b> แตะเพื่อโหลด</span><button class="sys-go" data-sys="update">โหลดใหม่</button>`,
      (k) => { if (k === 'update') { reloading = true; w.postMessage({ type: 'SKIP_WAITING' }); } });
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); });
    });
  }).catch(() => { /* ไม่มี service worker ก็ใช้งานออนไลน์ได้ */ });
}
