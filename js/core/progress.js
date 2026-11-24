// ก้าวรวมใจ — สรุปความก้าวหน้าจากประวัติการเดิน (ใช้ได้ทั้งเบราว์เซอร์และเทสต์ ไม่แตะ DOM)

/** นาทีที่เดินจริงรายวันย้อนหลัง `days` วัน (เก่า → ใหม่) · `keys` คือรายการวันที่ YYYY-MM-DD เรียงเก่าไปใหม่ */
export function minutesByDay(log, keys) {
  return keys.map((day) => ({
    day,
    minutes: log.filter((s) => s.day === day && s.counted).reduce((t, s) => t + s.minutes, 0),
  }));
}

/** จำนวนวันที่เดินติดกันจนถึงวันนี้ (ถ้าวันนี้ยังไม่เดิน นับถึงเมื่อวาน ไม่ลงโทษวันนี้) */
export function streak(perDay) {
  let n = 0, i = perDay.length - 1;
  if (i >= 0 && perDay[i].minutes === 0) i -= 1;
  for (; i >= 0 && perDay[i].minutes > 0; i--) n += 1;
  return n;
}

/** ท่าทางของตัวละครที่ปลดล็อกตามเลเวล (ภาพอยู่ใน web/assets/character/) */
export const POSES = Object.freeze([
  { id: 'greet', name: 'ทักทาย', level: 1, motion: 'm-hop' },
  { id: 'main', name: 'ยืนยิ้ม', level: 1, motion: 'm-pop' },
  { id: 'sleep', name: 'งีบหลับ', level: 1, motion: 'm-breathe' },
  { id: 'happy', name: 'ดีใจ', level: 2, motion: 'm-hop' },
  { id: 'think', name: 'ครุ่นคิด', level: 3, motion: 'm-breathe' },
  { id: 'cute', name: 'น่ารัก', level: 4, motion: 'm-squash' },
  { id: 'run', name: 'วิ่งเหยาะ', level: 5, motion: 'm-run' },
  { id: 'sad', name: 'คิดถึง', level: 6, motion: 'm-breathe' },
  { id: 'angry', name: 'กอดอก', level: 7, motion: 'm-shake' },
  { id: 'read', name: 'อ่านหนังสือ', level: 9, motion: 'm-breathe' },
  { id: 'work', name: 'ขยันสุด', level: 12, motion: 'm-squash' },
]);

/** เหรียญความสำเร็จ — คำนวณจากข้อมูลจริงในเครื่อง ไม่มีการซื้อ */
export function badges({ log, perDay, togetherCount, feelings, level, stage }) {
  const walkedDays = perDay.filter((d) => d.minutes > 0).length;
  const counted = log.filter((s) => s.counted);
  const longest = counted.reduce((m, s) => Math.max(m, s.minutes), 0);
  const fun = feelings.filter((f) => f === 'fun').length;
  return [
    { id: 'first', icon: 'feet', name: 'ก้าวแรก', how: 'เดินจริงครั้งแรก', got: counted.length > 0 },
    { id: 'week5', icon: 'sun', name: 'ขยันทั้งสัปดาห์', how: 'เดิน 5 วันใน 7 วัน', got: walkedDays >= 5, prog: `${walkedDays}/5` },
    { id: 'long', icon: 'clock', name: 'เดินยาว', how: 'เดินติดกัน 20 นาที', got: longest >= 20, prog: `${longest}/20` },
    { id: 'buddy', icon: 'team', name: 'เพื่อนร่วมทาง', how: 'เดินด้วยกัน 3 ครั้ง', got: togetherCount >= 3, prog: `${Math.min(togetherCount, 3)}/3` },
    { id: 'joy', icon: 'heart', name: 'ใจสดใส', how: 'รู้สึกสนุก 5 ครั้ง', got: fun >= 5, prog: `${Math.min(fun, 5)}/5` },
    { id: 'stage3', icon: 'star', name: 'นักเดินประจำ', how: 'ถึงเลเวล 6', got: level >= 6, prog: `${Math.min(level, 6)}/6` },
    { id: 'legend', icon: 'flag', name: 'ตำนานแห่งก๊วน', how: 'ถึงเลเวล 15', got: stage >= 5, prog: `${Math.min(level, 15)}/15` },
  ];
}
