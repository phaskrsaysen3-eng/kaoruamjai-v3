// ก้าวรวมใจ — แต้ม เลเวล ขั้นการเติบโต และคะแนนก๊วนแบบยุติธรรม (รองรับเกราะป้องกันคะแนนก๊วนช่วงพักฟื้น)

export const XP_PER_MISSION = 40;
export const XP_PER_LEVEL = 100;

export const STAGES = Object.freeze([
  { stage: 1, name: 'เริ่มก้าว', fromLevel: 1 },
  { stage: 2, name: 'นักเดินหน้าใหม่', fromLevel: 3 },
  { stage: 3, name: 'นักเดินประจำ', fromLevel: 6 },
  { stage: 4, name: 'ขาแกร่ง', fromLevel: 10 },
  { stage: 5, name: 'ตำนานแห่งก๊วน', fromLevel: 15 },
]);

export function levelFromXp(xp) { return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1; }
export function xpIntoLevel(xp) { return Math.max(0, xp) % XP_PER_LEVEL; }
export function stageFromLevel(level) {
  let s = STAGES[0];
  for (const st of STAGES) if (level >= st.fromLevel) s = st;
  return s;
}

/** คะแนนรายคน = min(100, นาทีที่เดินจริง ÷ เป้าของคนนั้น × 100) */
export function memberScore(minutes, goalMinutes) {
  if (!goalMinutes || goalMinutes <= 0) return 0;
  return Math.min(100, (minutes / goalMinutes) * 100);
}

/**
 * คะแนนก๊วน = ค่าเฉลี่ยคะแนนรายคนของสมาชิกที่ไม่ได้อยู่ในโหมดพักฟื้น (คนเดินช้าและคนพักฟื้นไม่ถ่วงก๊วน)
 * [ออกแบบเอง] กรองสมาชิกที่ frozen === true ออกจากตัวหาร · หากสมาชิกพักฟื้นทุกคนคืน null ("ก๊วนกำลังพักผ่อน")
 */
export function teamScore(members) {
  if (!Array.isArray(members) || !members.length) return 0;
  const active = members.filter((m) => !m?.frozen);
  if (!active.length) return null;
  const sum = active.reduce((s, m) => s + memberScore(m.minutes, m.goal), 0);
  return sum / active.length;
}

/**
 * เป้าเดินต่อสัปดาห์จากผลลุกนั่งเก้าอี้ 30 วินาที (ค่าตั้งต้นของทีม ต้องให้ผู้เชี่ยวชาญยืนยัน)
 * ทำได้ 12 ครั้งขึ้นไป → 70 นาที/สัปดาห์ · น้อยกว่านั้น → 50 นาที/สัปดาห์
 */
export function weeklyGoalFromChairStand(reps) { return reps >= 12 ? 70 : 50; }

/**
 * ปรับเป้าภารกิจรายวันจากความรู้สึก: กด "เหนื่อย" 2 ครั้งติด ลดลง 2 นาที
 * แก้บั๊ก Tier 0: ห้ามดันเป้าให้สูงขึ้น (เช่น 5 นาทีห้ามดีดเป็น 8 นาที) และไม่ต่ำกว่า 5 นาที [ออกแบบเอง]
 */
export function adjustDailyGoal(goal, recentFeelings) {
  const last2 = (recentFeelings || []).slice(-2);
  if (last2.length === 2 && last2.every((f) => f === 'tired')) {
    return Math.min(goal, Math.max(5, goal - 2));
  }
  return goal;
}
