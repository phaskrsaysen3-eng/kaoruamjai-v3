// ก้าวรวมใจ — ค่าพลังแบบเกม 6 ค่า (เลเวล 1–10)
//
// ค่าร่างกาย 4 ค่า (STR STA AGI BAL) มาจาก "การทดสอบ" ทุก 4 สัปดาห์ เทียบเกณฑ์ตามอายุและเพศ
// ค่าพฤติกรรม 2 ค่า (MND SOC) คำนวณจาก 7–14 วันล่าสุด
// การทำภารกิจรายวันเติม "แถบฝึก" ของค่าที่เกี่ยวข้อง แต่ไม่เปลี่ยนเลเวลร่างกายจนกว่าจะทดสอบซ้ำ
// → ผู้ใช้เห็นความพยายามทุกวัน ส่วนเลเวลยังซื่อตรงกับร่างกายจริง
//
// เกณฑ์ทุกชุดมาจาก Senior Fitness Test (Rikli & Jones) ยกเว้น BAL ที่ใช้ 4-Stage Balance Test (CDC STEADI)
// ส่วนที่ออกแบบเอง: สูตรแปลงเป็นเลเวล 1–10 · การแบ่งเลเวล BAL · สูตร MND/SOC · แถบฝึก — ใช้ในเกมเท่านั้น ไม่ใช้ตัดสินความปลอดภัย

import { NORMS, normKey } from './assess.js';

export const STAT_DEFS = Object.freeze([
  { id: 'STR', name: 'พลังกล้ามเนื้อ', group: 'body', test: 'ลุก-นั่ง 30 วิ (70%) + งอแขน 30 วิ (30%)', train: ['strength'] },
  { id: 'STA', name: 'ความอึด', group: 'body', test: 'ย่ำเท้าอยู่กับที่ 2 นาที (นับครั้งที่เข่าขวายกถึงเส้น)', train: ['walk'] },
  { id: 'AGI', name: 'ความคล่องแคล่ว', group: 'body', test: 'ลุก-เดินอ้อมกรวย 2.44 ม.-กลับมานั่ง (วินาที ยิ่งน้อยยิ่งดี)', train: ['agility'] },
  { id: 'BAL', name: 'การทรงตัว', group: 'body', test: 'ยืน 4 ท่า ท่าละ 10 วิ (ต้องมีคนยืนข้างๆ)', train: ['balance'] },
  { id: 'MND', name: 'สมอง', group: 'behavior', test: 'ความแม่นยำมินิเกม 10 เกมล่าสุดใน 14 วัน (อย่างน้อย 3 เกม)', train: ['brain'] },
  { id: 'SOC', name: 'มิตรภาพ', group: 'behavior', test: 'ทำภารกิจกับก๊วนกี่วัน + ส่งกำลังใจกี่ครั้ง ใน 7 วัน', train: ['social'] },
]);

// ย่ำเท้า 2 นาที: ช่วงปกติ = P25–P75 [ต่ำ, สูง] ครั้ง · Rikli & Jones 1999 (ตารางเปอร์เซ็นไทล์ใน Shirley Ryan AbilityLab RehabMeasures)
export const STEP_NORMS = Object.freeze({
  F: { 60: [75, 107], 65: [73, 107], 70: [68, 101], 75: [68, 100], 80: [60, 91], 85: [55, 85], 90: [44, 72] },
  M: { 60: [87, 115], 65: [86, 116], 70: [80, 110], 75: [73, 109], 80: [71, 103], 85: [59, 91], 90: [52, 86] },
});
// ลุก-เดิน-กลับ 2.44 ม.: ช่วงปกติ = P25–P75 [เร็ว, ช้า] วินาที · Senior Fitness Test Manual 2013
// หมายเหตุ: ชาย 65–69, 70–74, 85–89 มีสองฉบับในเอกสารที่เผยแพร่ (4.3–5.7 / 4.2–6.0 / 5.3–8.9)
// เลือกฉบับที่ค่ากลางตรงกับค่ามัธยฐานของ Rikli & Jones 1999 (5.1 / 5.3 / 7.2 วิ) ตามที่รายงานใน systematic review ปี 2024
export const UPGO_NORMS = Object.freeze({
  F: { 60: [4.4, 6.0], 65: [4.8, 6.4], 70: [4.9, 7.1], 75: [5.2, 7.4], 80: [5.7, 8.7], 85: [6.2, 9.6], 90: [7.3, 11.5] },
  M: { 60: [3.8, 5.6], 65: [4.3, 5.9], 70: [4.4, 6.2], 75: [4.6, 7.2], 80: [5.2, 7.6], 85: [5.5, 8.9], 90: [6.2, 10.0] },
});

const clampLv = (x) => Math.max(1, Math.min(10, Math.round(x)));

/**
 * แปลงผลทดสอบเป็นเลเวล 1–10 โดยให้ขอบเลเวลตรงกับขอบช่วงปกติของวัย (P25 และ P75 จากงานวิจัย)
 *   เลเวล 1–3  = ต่ำกว่าช่วงปกติ (สำหรับลุก-นั่ง = CDC STEADI ถือว่าเสี่ยงหกล้ม)
 *   เลเวล 4–7  = อยู่ในช่วงปกติ (แบ่งช่วงปกติเป็น 4 ส่วนเท่ากัน)
 *   เลเวล 8–10 = ดีกว่าช่วงปกติ
 * นอกช่วงปกติ ไล่ลง/ขึ้นทีละเลเวลทุก 1/3 ของครึ่งช่วงปกติ (d = (สูง − ต่ำ)/2) — เป็นค่าออกแบบ
 * @param {number[]} range [ต่ำ, สูง] ของช่วงปกติ (สำหรับเวลาคือ [เร็ว, ช้า])
 * @param {boolean} higherIsBetter false = ค่าที่เป็นเวลา ยิ่งน้อยยิ่งดี
 * @param {number} unit ความละเอียดของผล (จำนวนครั้ง = 1, เวลา = 0.1)
 */
export function levelFromRange(x, [a, b], higherIsBetter = true, unit = higherIsBetter ? 1 : 0.1) {
  const lo = Math.min(a, b), hi = Math.max(a, b), d = (hi - lo) / 2;
  const eps = 1e-9;
  // แปลงให้ "ยิ่งมากยิ่งดี" เสมอ
  const v = higherIsBetter ? x : -x, L = higherIsBetter ? lo : -hi, H = higherIsBetter ? hi : -lo;
  if (v < L - eps) { const q = (L - v - unit) / d; return Math.max(1, 3 - Math.floor(q * 3 + eps)); }
  if (v > H + eps) { const q = (v - H - unit) / d; return Math.min(10, 8 + Math.floor(q * 3 + eps)); }
  const p = (v - L) / (H - L);
  return 4 + Math.min(3, Math.floor(p * 4 + eps));
}

/** หมวดตามงานวิจัย: -1 ต่ำกว่าช่วงปกติ · 0 ปกติ · 1 ดีกว่าช่วงปกติ */
export function categoryOf(level) { return level <= 3 ? -1 : level >= 8 ? 1 : 0; }

/**
 * 4-Stage Balance (CDC STEADI): วินาทีที่ยืนได้ในแต่ละท่า (0–10) · ท่าใดไม่ถึง 10 วิ ท่าถัดไปไม่นับ
 *   ยืนต่อเท้า (ท่า 3) ไม่ถึง 10 วิ = เสี่ยงหกล้ม (CDC) → เลเวล 1–3
 *   ผ่านท่า 3 แล้ว ยืนขาเดียว 0–9 วิ → เลเวล 4–7 · ครบ 10 วิ → เลเวล 8
 *   เลเวล 9–10 ต้องใช้การทดสอบยืนขาเดียวที่นานกว่า 10 วิ ซึ่งยังไม่ได้ใส่
 */
export function balanceLevel(secs) {
  const s = [0, 1, 2, 3].map((i) => Math.max(0, Math.min(10, Number(secs?.[i]) || 0)));
  for (let i = 1; i < 4; i++) if (s[i - 1] < 10) s[i] = 0;
  const fallRisk = s[2] < 10;
  let level;
  if (fallRisk) level = s[0] < 10 ? 1 : s[1] < 10 ? 2 : 3;   // ผ่านได้ถึงท่าไหน
  else level = s[3] >= 10 ? 8 : 4 + Math.min(3, Math.floor(s[3] / 2.5));
  return { level, fallRisk, secs: s };
}

/**
 * คำนวณค่าพลังร่างกายจากผลทดสอบ
 * @param {{age:number, sex:'F'|'M'}} who
 * @param {{chairStand?:number, armCurl?:number, armStdWeight?:boolean, step2min?:number, upGoSec?:number, balanceSecs?:number[]}} t
 */
export function bodyStats(who, t = {}) {
  const k = normKey(who.age), sx = who.sex;
  const out = {};
  if (Number.isFinite(t.chairStand)) {
    const chair = levelFromRange(t.usedArms === true ? 0 : t.chairStand, NORMS.chair[sx][k]); // STEADI: ใช้มือดัน = 0
    let arm = Number.isFinite(t.armCurl) ? levelFromRange(t.armCurl, NORMS.arm[sx][k]) : null;
    if (arm !== null && t.armStdWeight !== true) arm = Math.min(arm, 5); // ขวดน้ำเบากว่ามาตรฐาน → ไม่เกิน 5
    out.STR = { level: arm === null ? chair : clampLv(0.7 * chair + 0.3 * arm), parts: { chair, arm } };
  }
  if (Number.isFinite(t.step2min)) out.STA = { level: levelFromRange(t.step2min, STEP_NORMS[sx][k]) };
  if (Number.isFinite(t.upGoSec)) out.AGI = { level: levelFromRange(t.upGoSec, UPGO_NORMS[sx][k], false) };
  if (Array.isArray(t.balanceSecs)) out.BAL = balanceLevel(t.balanceSecs);
  return out;
}

/** สมอง: ความแม่นยำ 0–1 ของมินิเกมใน 14 วันล่าสุด (ใช้ 10 เกมล่าสุด ต้องมีอย่างน้อย 3 เกม) */
export function mindStat(games, today) {
  const recent = (games || []).filter((g) => daysBetween(g.date, today) <= 13 && Number.isFinite(g.accuracy)).slice(-10);
  if (recent.length < 3) return { level: null, reason: 'เล่นมินิเกมให้ครบ 3 เกมใน 14 วันก่อน' };
  const acc = recent.reduce((a, g) => a + Math.max(0, Math.min(1, g.accuracy)), 0) / recent.length;
  return { level: clampLv(1 + 9 * acc), accuracy: Math.round(acc * 100) / 100, games: recent.length };
}

/** มิตรภาพ: 7 วันล่าสุด วันที่ทำภารกิจกับก๊วน (0–7) และกำลังใจที่ส่ง (นับไม่เกิน 7) */
export function socialStat(teamDays, cheersSent) {
  const td = Math.max(0, Math.min(7, teamDays | 0));
  const ch = Math.max(0, Math.min(7, cheersSent | 0));
  return { level: clampLv(1 + 9 * (0.6 * td / 7 + 0.4 * ch / 7)), teamDays: td, cheers: ch };
}

// ---------- แถบฝึก (เติมจากภารกิจรายวัน) ----------
export const TRAIN = Object.freeze({ perQuest: 5, dailyCap: 10, weekFull: 50 });
const QUEST_STAT = { walk: 'STA', strength: 'STR', agility: 'AGI', balance: 'BAL', brain: 'MND', social: 'SOC' };

/**
 * บันทึกภารกิจที่ทำสำเร็จ — ได้แต้มฝึกเฉพาะภารกิจที่ "ครบเป้า" และไม่เกิน 10 แต้ม/ค่า/วัน
 * ทำเกินเป้า (เช่น เดินเป็นสองเท่า) ไม่ได้แต้มเพิ่ม เพื่อไม่ให้เกมชวนฝืนร่างกาย
 */
export function addTraining(log, { type, date, metGoal }) {
  const stat = QUEST_STAT[type];
  if (!stat) throw new Error(`ไม่รู้จักภารกิจประเภท "${type}"`);
  if (!metGoal) return { log, gained: 0, stat, reason: 'ยังไม่ครบเป้าของวันนี้' };
  const today = log.filter((e) => e.stat === stat && e.date === date).reduce((a, e) => a + e.pts, 0);
  const pts = Math.max(0, Math.min(TRAIN.perQuest, TRAIN.dailyCap - today));
  if (!pts) return { log, gained: 0, stat, reason: 'วันนี้ฝึกค่านี้ครบแล้ว พักบ้างก็ดี' };
  return { log: [...log, { stat, date, pts }], gained: pts, stat };
}

/** แต้มฝึก 7 วันล่าสุดของแต่ละค่า (เต็ม 50) */
export function trainingWeek(log, today) {
  const out = Object.fromEntries(STAT_DEFS.map((s) => [s.id, 0]));
  for (const e of log) if (daysBetween(e.date, today) <= 6 && e.stat in out) out[e.stat] += e.pts;
  for (const k in out) out[k] = Math.min(out[k], TRAIN.weekFull);
  return out;
}

// ---------- ทดสอบซ้ำ: เทียบรอบก่อน (ไม่โชว์ตัวแดงเมื่อลด) ----------
export function compareRetest(prev, next) {
  const res = {};
  for (const id of ['STR', 'STA', 'AGI', 'BAL']) {
    const a = prev?.[id]?.level, b = next?.[id]?.level;
    if (!Number.isFinite(b)) continue;
    const best = Math.max(b, prev?.[id]?.best ?? a ?? b);
    const label = !Number.isFinite(a) ? 'ครั้งแรก' : b > a ? `เพิ่มขึ้น ${b - a} เลเวล` : b === a ? 'คงที่' : 'ช่วงพักฟื้น · สถิติสูงสุดยังอยู่';
    res[id] = { level: b, best, label, trend: !Number.isFinite(a) ? 0 : Math.sign(b - a) };
  }
  return res;
}

function daysBetween(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }
