// ก้าวรวมใจ — ข้อความแบบสอบถามและวิธีทดสอบที่แสดงในแอป
// PAR-Q+: ต้นฉบับภาษาอังกฤษจาก PAR-Q+ Collaboration (ฉบับลงวันที่ 01-11-2024 · © 2025) ห้ามแก้ข้อความต้นฉบับ
//         ยังไม่พบฉบับแปลไทยทางการ → ข้อความไทยด้านล่างเป็น "คำแปลใช้งานชั่วคราว" ต้องให้ผู้เชี่ยวชาญตรวจก่อนใช้จริง
//         ในวันทดลอง ให้ผู้ช่วยถามจากแบบฟอร์มกระดาษ แล้วกรอกคำตอบในแอป

export const PARQ_SRC = 'PAR-Q+ (PAR-Q+ Collaboration · ฉบับ 01-11-2024 · © 2025) · eparmedx.com';
export const PARQ_NOTE = 'คำแปลไทยใช้งานชั่วคราว ยังไม่ใช่ฉบับแปลทางการ แตะ "ต้นฉบับ" เพื่อดูข้อความภาษาอังกฤษ';

export const PARQ = Object.freeze([
  { th: 'แพทย์เคยบอกไหมว่าท่านเป็นโรคหัวใจ หรือความดันโลหิตสูง',
    en: 'Has your doctor ever said that you have a heart condition OR high blood pressure?' },
  { th: 'ท่านเจ็บหน้าอกไหม ตอนพัก ตอนทำกิจวัตรประจำวัน หรือตอนออกกำลังกาย',
    en: 'Do you feel pain in your chest at rest, during your daily activities of living, OR when you do physical activity?' },
  { th: 'ใน 12 เดือนที่ผ่านมา ท่านเสียการทรงตัวเพราะเวียนหัว หรือเคยหมดสติไหม',
    hint: 'ตอบ "ไม่ใช่" ถ้าเวียนหัวเพราะหายใจหอบ รวมถึงตอนออกกำลังกายหนัก',
    en: 'Do you lose balance because of dizziness OR have you lost consciousness in the last 12 months? Please answer NO if your dizziness was associated with over-breathing (including during vigorous exercise).' },
  { th: 'แพทย์เคยวินิจฉัยว่าท่านเป็นโรคเรื้อรังอื่นไหม (นอกจากโรคหัวใจและความดันสูง)',
    en: 'Have you ever been diagnosed with another chronic medical condition (other than heart disease or high blood pressure)?' },
  { th: 'ตอนนี้ท่านกินยาที่แพทย์สั่งสำหรับโรคเรื้อรังอยู่ไหม',
    en: 'Are you currently taking prescribed medications for a chronic medical condition?' },
  { th: 'ตอนนี้ (หรือใน 12 เดือนที่ผ่านมา) ท่านมีปัญหากระดูก ข้อ กล้ามเนื้อ หรือเอ็น ที่อาจแย่ลงถ้าออกกำลังกายมากขึ้นไหม',
    hint: 'ตอบ "ไม่ใช่" ถ้าเคยมีปัญหา แต่ตอนนี้ไม่ได้ทำให้ออกกำลังกายได้น้อยลง',
    en: 'Do you currently have (or have had within the past 12 months) a bone, joint, or soft tissue (muscle, ligament, or tendon) problem that could be made worse by becoming more physically active? Please answer NO if you had a problem in the past, but it does not limit your current ability to be physically active.' },
  { th: 'แพทย์เคยบอกไหมว่าท่านควรออกกำลังกายภายใต้การดูแลทางการแพทย์เท่านั้น',
    en: 'Has your doctor ever said that you should only do medically supervised physical activity?' },
]);

// วิธีทดสอบแบบย่อ (ฉบับเต็มอยู่ในชุดเอกสารวันทดลอง)
export const TESTS = Object.freeze({
  chairStand: { name: 'ลุก-นั่ง 30 วินาที', unit: 'ครั้ง', required: true, src: 'Rikli & Jones · CDC STEADI',
    how: 'เก้าอี้สูง 17 นิ้ว (43 ซม.) ไม่มีที่วางแขน พิงผนัง · ไขว้แขนแนบอก · ลุกยืนให้ตรงแล้วนั่งลง นับให้ได้มากที่สุดใน 30 วินาที · ถ้าต้องใช้มือดันจึงลุกได้ บันทึก 0' },
  armCurl: { name: 'งอแขน 30 วินาที', unit: 'ครั้ง', src: 'Rikli & Jones (Senior Fitness Test)',
    how: 'นั่งเก้าอี้ ถือดัมเบลด้วยมือข้างถนัด (หญิง 5 ปอนด์ = 2.27 กก. · ชาย 8 ปอนด์ = 3.63 กก.) งอแขนขึ้นจนสุดแล้วเหยียดลง นับให้ได้มากที่สุดใน 30 วินาที · ถ้าใช้ขวดน้ำแทน ให้ติ๊กว่า "ไม่ใช่น้ำหนักมาตรฐาน" (เลเวลจะไม่เกิน 5)' },
  step2min: { name: 'ย่ำเท้าอยู่กับที่ 2 นาที', unit: 'ครั้ง', src: 'Rikli & Jones (Senior Fitness Test)',
    how: 'ติดเทปที่ผนังระดับกึ่งกลางระหว่างลูกสะบ้ากับสันกระดูกสะโพก · ย่ำเท้ายกเข่าให้ถึงเส้น นับครั้งที่เข่าขวาถึงเส้นใน 2 นาที · มีเก้าอี้หรือผนังให้จับได้' },
  upGoSec: { name: 'ลุก-เดินอ้อมกรวย 8 ฟุต', unit: 'วินาที', src: 'Rikli & Jones (Senior Fitness Test)',
    how: 'วางกรวยห่างจากขอบหน้าเก้าอี้ 8 ฟุต (2.44 ม.) · ลุกขึ้น เดินเร็วที่สุดแต่ห้ามวิ่ง อ้อมกรวย กลับมานั่ง · ทำ 2 ครั้ง ใช้เวลาที่ดีที่สุด' },
  balanceSecs: { name: 'ยืนทรงตัว 4 ท่า', unit: 'วินาที/ท่า', src: 'CDC STEADI 4-Stage Balance Test',
    how: 'ท่าละ 10 วินาที ห้ามใช้มือจับ ต้องมีคนยืนข้างๆ เสมอ · 1 เท้าชิด · 2 ครึ่งต่อเท้า · 3 ต่อเท้า (ส้นชนปลายเท้า) · 4 ยืนขาเดียว · ท่าไหนไม่ถึง 10 วินาที หยุดที่ท่านั้น' },
  gait4mSec: { name: 'เดิน 4 เมตร (ไม่บังคับ)', unit: 'วินาที', src: 'SPPB (Guralnik 1994) · เกณฑ์ 0.8 ม./วินาที EWGSOP2',
    how: 'เดินด้วยความเร็วปกติบนทางราบ 4 เมตร จับเวลาตั้งแต่ก้าวแรก' },
});

export const BAL_STAGES = ['เท้าชิด', 'ครึ่งต่อเท้า', 'ต่อเท้า', 'ขาเดียว'];

// สัญญาณที่ต้องหยุดทันที (ตรงกับกฎข้อ "หยุดทันที" ใน exercises.js)
export const STOP_SIGNS = 'หยุดทันทีถ้าเจ็บหน้าอก เวียนหัว หายใจไม่ทัน หรือปวดมาก · ฉุกเฉินโทร 1669';
