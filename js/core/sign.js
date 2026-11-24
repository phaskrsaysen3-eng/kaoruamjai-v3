// ก้าวรวมใจ — ลายเซ็นข้อมูลจากตัวหนีบนับก้าว (HMAC-SHA256) และการตรวจฝั่งเซิร์ฟเวอร์
// ในระบบจริง กุญแจอยู่ในตัวหนีบและเซิร์ฟเวอร์เท่านั้น เบราว์เซอร์ใช้เซ็นได้เฉพาะ "โหมดจำลอง" เพื่อสาธิต

const enc = new TextEncoder();

/** ข้อความมาตรฐานที่ใช้เซ็น — ลำดับฟิลด์ต้องตรงกับเฟิร์มแวร์ */
export function canonical(s) {
  return [s.deviceId, s.seq, s.startedAt, s.durationSec, s.steps, Number(s.cadence).toFixed(2), Number(s.cv).toFixed(3), s.verdict].join('|');
}

function hex(buf) { return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join(''); }

export async function hmacHex(keyText, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(keyText), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}

export async function signSession(session, keyText) {
  return { ...session, sig: await hmacHex(keyText, canonical(session)) };
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/**
 * ตรวจเซสชันที่ส่งมา — ใช้ที่เซิร์ฟเวอร์เท่านั้น
 * @param {object} s เซสชันที่มี sig
 * @param {string} keyText กุญแจของอุปกรณ์นั้น
 * @param {{lastSeq:number, sessions:Array<{startedAt:number,durationSec:number}>}} prev ข้อมูลเดิมของอุปกรณ์
 */
export async function verifySession(s, keyText, prev = { lastSeq: -1, sessions: [] }) {
  const reasons = [];
  const expect = await hmacHex(keyText, canonical(s));
  if (!safeEqual(expect, s.sig)) reasons.push('ลายเซ็นไม่ถูกต้อง (ข้อมูลถูกแก้ หรือไม่ได้มาจากเครื่องนี้)');
  if (!(Number.isInteger(s.seq) && s.seq > prev.lastSeq)) reasons.push('เลขลำดับซ้ำหรือย้อนหลัง (ส่งข้อมูลเก่าซ้ำ)');
  const perMin = s.durationSec > 0 ? (s.steps / s.durationSec) * 60 : Infinity;
  if (perMin > 150) reasons.push(`ก้าวต่อนาทีสูงเกินจริง (${perMin.toFixed(0)} > 150)`);
  const end = s.startedAt + s.durationSec * 1000;
  const overlap = prev.sessions.some((p) => s.startedAt < p.startedAt + p.durationSec * 1000 && end > p.startedAt);
  if (overlap) reasons.push('ช่วงเวลาทับกับเซสชันเดิม');
  return { ok: reasons.length === 0, reasons, stepsPerMin: perMin };
}
