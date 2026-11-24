// ก้าวรวมใจ — รูบริกประเมินก่อนจัดเควส v2 (ใช้ทั้งเบราว์เซอร์และเซิร์ฟเวอร์)
//
// หลักการ v2: ทุกการตัดสินด้านความปลอดภัยใช้เครื่องมือที่มีงานวิจัยรองรับ ไม่มีคะแนนที่ตั้งเอง
//   ชั้น 1 คัดกรองก่อนออกกำลังกาย   PAR-Q+ (PAR-Q+ Collaboration; Warburton et al.)
//   ชั้น 2 ความเสี่ยงหกล้ม           CDC STEADI + Stay Independent (Rubenstein 2011; ฉบับไทย Loonlawong 2019)
//                                    + เกณฑ์ความรุนแรงของ World Falls Guidelines (Montero-Odasso 2022)
//   ชั้น 3 ระดับเริ่มต้น              ลุก-นั่ง 30 วิ เทียบเกณฑ์ตามอายุ/เพศ (Rikli & Jones 1999; CDC STEADI)
//                                    + ทำกิจกรรมถึงเป้า WHO 150 นาที/สัปดาห์หรือยัง (WHO 2020)
//   ชั้น 4 ตัวกรองตามโรค              แนวทางเวชปฏิบัติของแต่ละโรค (ดู RULE_SOURCES)
//
// ค่าที่ "ออกแบบเอง" (ไม่มีงานวิจัยกำหนดตัวเลขนี้) ระบุไว้ใน DESIGN ทุกตัว และไม่ใช้ตัดสินว่าใครปลอดภัยหรือไม่

// ---------- เกณฑ์มาตรฐาน Senior Fitness Test: ช่วงปกติ = เปอร์เซ็นไทล์ 25–75 ----------
// Rikli RE, Jones CJ. J Aging Phys Act 1999;7(2):162–181 · Senior Fitness Test Manual 2nd ed. 2013
// แถว = อายุเริ่มต้นของช่วง 5 ปี (60 = 60–64 … 90 = 90–94)
export const NORMS = Object.freeze({
  chair: {
    F: { 60: [12, 17], 65: [11, 16], 70: [10, 15], 75: [10, 15], 80: [9, 14], 85: [8, 13], 90: [4, 11] },
    M: { 60: [14, 19], 65: [12, 18], 70: [12, 17], 75: [11, 17], 80: [10, 15], 85: [8, 14], 90: [7, 12] },
  },
  arm: { // ดัมเบลมาตรฐาน: หญิง 5 ปอนด์ (2.3 กก.) · ชาย 8 ปอนด์ (3.6 กก.)
    F: { 60: [13, 19], 65: [12, 18], 70: [12, 17], 75: [11, 17], 80: [10, 16], 85: [10, 15], 90: [8, 13] },
    M: { 60: [16, 22], 65: [15, 21], 70: [14, 21], 75: [13, 19], 80: [13, 19], 85: [11, 17], 90: [10, 14] },
  },
});
// CDC STEADI "below average = risk for falls" คือค่าต่ำกว่าขอบล่างของช่วงปกติข้างบนทุกช่อง (ตรวจในเทสต์)

export const CONDITIONS = Object.freeze({
  hypertension: { label: 'ความดันโลหิตสูง' }, diabetes: { label: 'เบาหวาน' }, heart: { label: 'โรคหัวใจ' },
  asthma: { label: 'หอบหืด/โรคปอด' }, dementia: { label: 'สมองเสื่อม' }, knee: { label: 'ข้อเข่าเสื่อม' },
  osteo: { label: 'กระดูกพรุน' }, kidney: { label: 'ไตเรื้อรัง' },
  neuropathy: { label: 'เท้าชา (ปลายประสาทเสื่อม)' }, foot_ulcer: { label: 'แผลที่เท้ายังไม่หาย' }, retinopathy: { label: 'เบาหวานขึ้นจอตา' },
  dialysis: { label: 'ฟอกไต / ล้างไตทางช่องท้อง' }, dysphagia: { label: 'กลืนลำบาก' }, fdeia: { label: 'แพ้อาหารร่วมกับออกกำลังกาย (แพทย์วินิจฉัย)' }, other: { label: 'โรคอื่นๆ' },
});
export const SURGERY = Object.freeze({ eye: { label: 'ตา' }, joint: { label: 'ข้อ' }, back: { label: 'หลัง' }, heart: { label: 'หัวใจ' }, abdomen: { label: 'ช่องท้อง' }, other: { label: 'อื่นๆ' } });
export const AIDS = Object.freeze({ glasses: { label: 'แว่นตา' }, hearing: { label: 'เครื่องช่วยฟัง' }, cane: { label: 'ไม้เท้า' }, walker: { label: 'วอล์กเกอร์' }, wheelchair: { label: 'รถเข็น (ใช้เป็นหลัก)' } });
export const MEDS = Object.freeze({
  anticoagulant: { label: 'ยาต้านการแข็งตัวของเลือด (เช่น วาร์ฟาริน)' }, insulin_su: { label: 'อินซูลิน หรือยาเม็ดกระตุ้นอินซูลิน' },
  polypharmacy: { label: 'กินยาประจำตั้งแต่ 5 ชนิด' }, sedative: { label: 'ยานอนหลับ ยาคลายกังวล หรือยาที่ทำให้ง่วง' },
  bp_diuretic: { label: 'ยาลดความดัน หรือยาขับปัสสาวะ' }, unknown: { label: 'ไม่แน่ใจว่ากินยาอะไรบ้าง' },
});

// Stay Independent (CDC STEADI) 12 ข้อ — คะแนนตามต้นฉบับ · รวม ≥ 4 = อาจเสี่ยงหกล้ม
// ในแอปต้องใช้ข้อความฉบับไทยที่ผ่านการตรวจความตรง (Loonlawong et al. 2019, Clin Interv Aging) ห้ามแปลเอง
export const STAY_INDEPENDENT = Object.freeze([
  { pts: 2, text: 'ล้มในรอบ 1 ปีที่ผ่านมา' },
  { pts: 2, text: 'ใช้ หรือเคยได้รับคำแนะนำให้ใช้ไม้เท้าหรือวอล์กเกอร์' },
  { pts: 1, text: 'บางครั้งรู้สึกไม่มั่นคงตอนเดิน' },
  { pts: 1, text: 'ต้องเกาะเฟอร์นิเจอร์ตอนเดินในบ้าน' },
  { pts: 1, text: 'กังวลว่าจะล้ม' },
  { pts: 1, text: 'ต้องใช้มือดันตัวเวลาลุกจากเก้าอี้' },
  { pts: 1, text: 'ก้าวขึ้นขอบฟุตบาทลำบาก' },
  { pts: 1, text: 'มักต้องรีบไปห้องน้ำ' },
  { pts: 1, text: 'เท้าชาหรือรับความรู้สึกน้อยลง' },
  { pts: 1, text: 'กินยาที่บางครั้งทำให้มึนหรือเพลียกว่าปกติ' },
  { pts: 1, text: 'กินยาช่วยนอนหลับหรือยาปรับอารมณ์' },
  { pts: 1, text: 'มักรู้สึกเศร้าหรือหดหู่' },
]);
export const SI_CUTOFF = 4;

// ---------- ค่าที่ออกแบบเอง (ไม่มีงานวิจัยกำหนดตัวเลขนี้ ต้องให้ผู้เชี่ยวชาญตรวจ) ----------
export const DESIGN = Object.freeze({
  tierLadder: 'นาที/สัปดาห์ 30 · 50 · 70 · 100 · 150 เป็นบันไดที่ออกแบบเอง ปลายทาง 150 มาจาก WHO 2020',
  tierFromChair: 'ต่ำกว่าช่วงปกติ → 1 · ในช่วงปกติ → 2 · สูงกว่าช่วงปกติ → 3 · ถึงเป้า WHO แล้ว +1',
  capHighFallRisk: 'เสี่ยงหกล้มสูง (WFG) → ไม่เกินระดับ 1 จนได้รับการประเมินจากบุคลากรสาธารณสุข',
  capAtRiskDeficit: 'STEADI เสี่ยง + ผลทดสอบต่ำกว่าเกณฑ์ → ไม่เกินระดับ 2 และเน้นทรงตัว-กล้ามเนื้อ',
  capAfterConsult: 'PAR-Q+ ต้องปรึกษาแล้วได้รับอนุญาต → ไม่เกินระดับ 2 ในรอบแรก (เริ่มน้อย ค่อยเพิ่ม ตาม WHO)',
});

export const TIERS = Object.freeze([
  { tier: 0, name: 'เตรียมพร้อม', weekly: 30, daily: 5, note: 'ท่านั่งเท่านั้น จนกว่าจะได้รับคำแนะนำจากผู้เชี่ยวชาญ' },
  { tier: 1, name: 'เริ่มเบา', weekly: 50, daily: 10 },
  { tier: 2, name: 'สร้างพื้นฐาน', weekly: 70, daily: 15 },
  { tier: 3, name: 'แข็งแรงขึ้น', weekly: 100, daily: 20 },
  { tier: 4, name: 'ตามเป้า WHO', weekly: 150, daily: 30 },
]);
export const WHO_WEEKLY = 150;
export const GAIT_SLOW = 0.8; // ม./วินาที · EWGSOP2 (Cruz-Jentoft 2019) และ World Falls Guidelines 2022

export function ageBand(age) { return age >= 80 ? '80+' : age >= 70 ? '70-79' : '60-69'; }

// แผนเควส (ค่าออกแบบ) — ทุกระดับมีแอโรบิก กล้ามเนื้อ ทรงตัว ตามโครงของ WHO 2020 สำหรับผู้สูงอายุ
export const PLAN = Object.freeze({
  0: { all: { aerobic: 'ย่ำเท้าท่านั่ง 5 นาที', strength: 'ยกแขน-เหยียดขาท่านั่ง 2×8', balance: 'นั่งตัวตรง ยกเท้าสลับ 2×10', stretch: 'หายใจลึก + ยืดคอบ่า' } },
  1: {
    '60-69': { aerobic: 'เดิน 10 นาที (แบ่ง 2×5 ได้)', strength: 'ลุก-นั่งเก้าอี้ 2×6', balance: 'ยืนเท้าชิด มือจับเก้าอี้ 3×20 วิ', stretch: 'ยืดน่อง-ต้นขา' },
    '70-79': { aerobic: 'เดิน 2×5 นาที', strength: 'ลุก-นั่ง ใช้มือดันช่วย 2×5', balance: 'ยืนเท้าชิด สองมือจับ 3×15 วิ', stretch: 'ยืดน่อง-ต้นขา' },
    '80+': { aerobic: 'ย่ำเท้าข้างเก้าอี้ 3×3 นาที', strength: 'ลุก-นั่ง ใช้มือช่วย 2×4', balance: 'ยืนสองมือจับเก้าอี้ 3×10 วิ', stretch: 'ยืดท่านั่ง' },
  },
  2: {
    '60-69': { aerobic: 'เดิน 15 นาที', strength: 'ลุก-นั่ง 2×8 + ดันผนัง 2×8', balance: 'ยืนเท้าชิด มือเดียวจับ 3×30 วิ', stretch: 'ยืดน่อง-ต้นขา-อก' },
    '70-79': { aerobic: 'เดิน 2×8 นาที', strength: 'ลุก-นั่ง 2×8 + ยกส้นเท้า 2×10', balance: 'ยืนเท้าชิด มือเดียวจับ 3×20 วิ', stretch: 'ยืดน่อง-ต้นขา' },
    '80+': { aerobic: 'เดินหรือย่ำเท้า 3×5 นาที', strength: 'ลุก-นั่ง 2×6 (มือช่วยได้)', balance: 'ยืนเท้าชิด มือเดียวจับ 3×15 วิ', stretch: 'ยืดท่านั่ง' },
  },
  3: {
    '60-69': { aerobic: 'เดินเร็ว 20 นาที', strength: 'ลุก-นั่ง 3×10 + ดันผนัง 2×10', balance: 'ยืนต่อเท้า มีเก้าอี้ข้างตัว 3×20 วิ', stretch: 'ยืดทั้งตัว' },
    '70-79': { aerobic: 'เดิน 2×10 นาที', strength: 'ลุก-นั่ง 3×8 + ดันผนัง 2×8', balance: 'ยืนเท้าชิด ไม่จับ มีเก้าอี้ข้างตัว 3×20 วิ', stretch: 'ยืดทั้งตัว' },
    '80+': { aerobic: 'เดิน 2×10 นาที', strength: 'ลุก-นั่ง 3×6', balance: 'ยืนต่อเท้า มือจับเก้าอี้ 3×15 วิ', stretch: 'ยืดท่านั่ง' },
  },
  4: {
    '60-69': { aerobic: 'เดินเร็ว 30 นาที (แบ่ง 3×10 ได้)', strength: 'ลุก-นั่ง 3×12 + ดันผนัง 3×10', balance: 'ยืนขาเดียว จับเก้าอี้ 3×15 วิ/ข้าง', stretch: 'ยืดทั้งตัว' },
    '70-79': { aerobic: 'เดิน 3×10 นาที', strength: 'ลุก-นั่ง 3×10 + ดันผนัง 2×10', balance: 'ยืนต่อเท้า มีเก้าอี้ข้างตัว 3×30 วิ', stretch: 'ยืดทั้งตัว' },
    '80+': { aerobic: 'เดิน 3×10 นาที', strength: 'ลุก-นั่ง 3×8', balance: 'ยืนต่อเท้า มือจับเก้าอี้ 3×20 วิ', stretch: 'ยืดท่านั่ง' },
  },
});

// ---------- ฟังก์ชันย่อย ----------
const between = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const isBoolArr = (a, n) => Array.isArray(a) && a.length === n && a.every((x) => typeof x === 'boolean');

export function normKey(age) {
  const a = Math.max(60, Math.min(90, age)); // อายุ 50–59 ใช้แถว 60–64 · 95 ขึ้นไปใช้ 90–94 (นอกช่วงที่เก็บข้อมูลจริง)
  return Math.floor(a / 5) * 5;
}
/** -1 ต่ำกว่าช่วงปกติ (< P25) · 0 ในช่วงปกติ (P25–P75) · 1 สูงกว่าช่วงปกติ (> P75) */
export function band3(x, [lo, hi]) { return x < lo ? -1 : x > hi ? 1 : 0; }
export const BAND_TEXT = { '-1': 'ต่ำกว่าช่วงปกติของวัย', 0: 'อยู่ในช่วงปกติของวัย', 1: 'สูงกว่าช่วงปกติของวัย' };

export function bmiOf(heightCm, weightKg) { const m = heightCm / 100; return Math.round((weightKg / (m * m)) * 10) / 10; }
/** เกณฑ์ BMI สำหรับผู้ใหญ่ชาวเอเชีย (WHO WPRO/IASO/IOTF 2000 "The Asia-Pacific perspective") + ข้อสังเกตผู้สูงอายุ (Winter 2014)
 *  ใช้แสดงผลเท่านั้น ไม่ใช้กำหนดระดับ (WHO Expert Consultation, Lancet 2004 ยืนยันว่าไม่มีจุดตัดเดียวสำหรับคนเอเชียทุกกลุ่ม) */
export function bmiInfo(bmi, age) {
  const cls = bmi < 18.5 ? 'น้ำหนักน้อย' : bmi < 23 ? 'ปกติ (เกณฑ์คนเอเชีย)' : bmi < 25 ? 'น้ำหนักเกิน (เกณฑ์คนเอเชีย)' : 'อ้วน (เกณฑ์คนเอเชีย)';
  const note = age >= 65 && bmi < 23 ? 'อายุ 65 ปีขึ้นไปที่ BMI ต่ำกว่า 23 มีความเสี่ยงเสียชีวิตสูงขึ้น ควรติดตามน้ำหนัก ไม่ควรมีเควสลดน้ำหนัก' : null;
  return { bmi, cls, note, noWeightLoss: age >= 65 && bmi < 23 };
}

export function siScore(answers) { return answers.reduce((a, yes, i) => a + (yes ? STAY_INDEPENDENT[i].pts : 0), 0); }

export function validateInput(p) {
  const e = [];
  if (!between(p.age, 50, 110)) e.push('อายุต้องอยู่ระหว่าง 50–110 ปี');
  if (p.sex !== 'F' && p.sex !== 'M') e.push('ต้องเลือกเพศ (ใช้เลือกเกณฑ์มาตรฐาน)');
  if (!between(p.heightCm, 120, 210)) e.push('ส่วนสูงต้องอยู่ระหว่าง 120–210 ซม.');
  if (!between(p.weightKg, 25, 200)) e.push('น้ำหนักต้องอยู่ระหว่าง 25–200 กก.');
  if (!isBoolArr(p.parq, 7)) e.push('ต้องตอบ PAR-Q+ หน้า 1 ครบ 7 ข้อ');
  if (!['not_needed', 'all_no', 'any_yes', null, undefined].includes(p.parqFollowUp)) e.push('ผล PAR-Q+ หน้า 2–3 ไม่ถูกต้อง');
  if (!isBoolArr(p.stayIndependent, 12)) e.push('ต้องตอบแบบประเมินความเสี่ยงหกล้ม (Stay Independent) ครบ 12 ข้อ');
  if (!Number.isInteger(p.falls) || !between(p.falls, 0, 2)) e.push('จำนวนครั้งที่ล้มต้องเป็น 0, 1 หรือ 2 (2 = 2 ครั้งขึ้นไป)');
  if (isBoolArr(p.stayIndependent, 12) && Number.isInteger(p.falls) && (p.falls > 0) !== p.stayIndependent[0]) e.push('จำนวนครั้งที่ล้มไม่ตรงกับข้อ "ล้มในรอบ 1 ปี" ของแบบประเมินความเสี่ยงหกล้ม');
  if (!between(p.activityMin, 0, 2000)) e.push('นาทีที่ทำกิจกรรมปานกลางต่อสัปดาห์ต้องอยู่ระหว่าง 0–2000');
  for (const c of p.conditions || []) if (!CONDITIONS[c]) e.push(`ไม่รู้จักโรค "${c}"`);
  for (const s of p.surgery || []) if (!SURGERY[s]) e.push(`ไม่รู้จักการผ่าตัด "${s}"`);
  for (const x of p.aids || []) if (!AIDS[x]) e.push(`ไม่รู้จักอุปกรณ์ "${x}"`);
  for (const x of p.meds || []) if (!MEDS[x]) e.push(`ไม่รู้จักกลุ่มยา "${x}"`);
  if (p.test && p.test.skipped !== true) {
    if (!Number.isInteger(p.test.chairStand) || !between(p.test.chairStand, 0, 60)) e.push('จำนวนลุก-นั่งต้องเป็นจำนวนเต็ม 0–60');
    if (p.test.armCurl !== undefined && (!Number.isInteger(p.test.armCurl) || !between(p.test.armCurl, 0, 60))) e.push('จำนวนงอแขนต้องเป็นจำนวนเต็ม 0–60');
    if (p.test.gait4mSec !== undefined && !between(p.test.gait4mSec, 1, 60)) e.push('เวลาเดิน 4 เมตรต้องอยู่ระหว่าง 1–60 วินาที');
  }
  return e;
}

// ---------- ประเมินหลัก ----------
export function assess(p) {
  if (!p || p.consent !== true) return { status: 'no_consent', message: 'ต้องยินยอมให้เก็บข้อมูลก่อน จึงจะประเมินได้' };
  const errors = validateInput(p);
  if (errors.length) return { status: 'invalid', errors };

  const conditions = [...new Set(p.conditions || [])];
  const surgery = [...new Set(p.surgery || [])];
  const aids = [...new Set(p.aids || [])];
  const band = ageBand(p.age);
  const steps = []; // เหตุผลทีละขั้น พร้อมที่มา
  const base = { status: 'ok', ageBand: band, normAge: `${normKey(p.age)}–${normKey(p.age) + 4}`, bmi: bmiInfo(bmiOf(p.heightCm, p.weightKg), p.age) };
  Object.assign(base, filtersOf(p, { conditions, surgery, aids, band }));

  // ชั้น 1: PAR-Q+
  const p1Yes = p.parq.map((y, i) => (y ? i + 1 : 0)).filter(Boolean);
  const cleared = p.doctorCleared === true;
  let parq;
  if (!p1Yes.length) parq = { result: 'cleared', text: 'PAR-Q+ ตอบ "ไม่ใช่" ทุกข้อ → พร้อมออกกำลังกาย' };
  else if (p.parqFollowUp === 'all_no') parq = { result: 'cleared', text: `PAR-Q+ หน้า 1 ตอบ "ใช่" ข้อ ${p1Yes.join(', ')} แต่หน้า 2–3 ตอบ "ไม่ใช่" ทุกข้อ → พร้อมออกกำลังกาย` };
  else if (p.parqFollowUp === 'any_yes') parq = { result: cleared ? 'cleared_after_consult' : 'consult', text: `PAR-Q+ หน้า 2–3 มีข้อที่ตอบ "ใช่" → ต้องปรึกษาผู้เชี่ยวชาญด้านการออกกำลังกายหรือแพทย์ก่อน${cleared ? ' (ได้รับอนุญาตแล้ว)' : ''}` };
  else parq = { result: 'need_followup', text: `PAR-Q+ หน้า 1 ตอบ "ใช่" ข้อ ${p1Yes.join(', ')} → ต้องทำหน้า 2–3 ต่อ` };
  steps.push({ layer: 1, src: 'PAR-Q+ 2025', text: parq.text });
  base.parq = parq;

  if (parq.result === 'consult' || parq.result === 'need_followup') {
    const t = TIERS[0];
    return { ...base, tier: 0, tierName: t.name, weeklyMin: t.weekly, dailyMin: t.daily, plan: PLAN[0].all, caps: [], steps,
      fall: null, message: parq.result === 'consult' ? 'แนะนำให้ปรึกษาแพทย์หรือนักกายภาพก่อนเริ่ม ระหว่างนี้เปิดเฉพาะเควสท่านั่ง' : 'ทำ PAR-Q+ หน้า 2–3 ให้ครบก่อน (ลูกหลานหรือ อสม. ช่วยได้) ระหว่างนี้เปิดเฉพาะเควสท่านั่ง' };
  }

  // ชั้น 2: ความเสี่ยงหกล้ม
  const si = siScore(p.stayIndependent);
  const fell = p.falls > 0;
  const steadiAtRisk = si >= SI_CUTOFF || fell;
  const severe = [];
  if (p.falls >= 2) severe.push('ล้ม 2 ครั้งขึ้นไปในรอบ 12 เดือน');
  if (p.fallInjury) severe.push('ล้มจนบาดเจ็บต้องรักษา');
  if (p.unableToGetUp) severe.push('ล้มแล้วลุกเองไม่ได้');
  if (p.syncope) severe.push('หมดสติหรือเกือบหมดสติ');
  const wfgHigh = severe.length > 0;
  steps.push({ layer: 2, src: 'CDC STEADI / Stay Independent', text: `ความเสี่ยงหกล้ม ${si} คะแนน${si >= SI_CUTOFF ? ` (≥ ${SI_CUTOFF} = อาจเสี่ยง)` : ''}${fell && si < SI_CUTOFF ? ' · เคยล้มในรอบปี = เสี่ยง' : ''}${!steadiAtRisk ? ' → ยังไม่พบความเสี่ยง' : ''}` });
  if (wfgHigh) steps.push({ layer: 2, src: 'World Falls Guidelines 2022', text: `เสี่ยงสูง: ${severe.join(' · ')} → ควรได้รับการประเมินปัจจัยเสี่ยงหกล้มโดยบุคลากรสาธารณสุข` });

  if (!p.test) return { ...base, status: 'need_test', steps, fall: { si, steadiAtRisk, wfgHigh, severe },
    message: 'ผ่านการคัดกรองแล้ว ขั้นต่อไปคือทดสอบลุก-นั่ง 30 วินาที (ห้ามใช้มือดัน)' };

  // ชั้น 3: ยังทดสอบไม่ได้อย่างปลอดภัย (ไม่ผ่านด่านก่อนทดสอบ) → ระดับ 1 · ไม่เดาค่าความสามารถจากสูตร
  if (p.test.skipped === true) {
    steps.push({ layer: 3, src: 'ด่านก่อนทดสอบ (ออกแบบเอง) · WFG 2022', text: `ยังไม่ทดสอบร่างกาย: ${p.test.skipReason || 'วันนี้ยังไม่ปลอดภัยที่จะทดสอบเอง'} → เริ่มระดับ 1 (ท่านั่ง/จับที่จับ) และนัดทดสอบเมื่อพร้อม · ไม่ใช้ค่าประมาณจากอายุแทนผลทดสอบ` });
    const t1 = TIERS[1];
    return { ...base, steps, fall: { si, steadiAtRisk, wfgHigh, severe, deficits: [] }, chair: null, untested: true,
      meetsWho: p.activityMin >= WHO_WEEKLY, tierByTest: 1, caps: [], tier: 1, tierName: t1.name, weeklyMin: t1.weekly, dailyMin: t1.daily, plan: PLAN[1][band],
      message: 'ยังไม่ได้ทดสอบร่างกาย จึงเริ่มระดับ 1 อย่างปลอดภัย ทดสอบเมื่อมีผู้ช่วยแล้วระบบจะปรับให้' };
  }

  // ชั้น 3: ระดับเริ่มต้น
  const k = normKey(p.age);
  const chairNorm = NORMS.chair[p.sex][k];
  const chairUsedArms = p.test.usedArms === true;
  const chair = chairUsedArms ? 0 : p.test.chairStand; // STEADI: ต้องใช้แขนช่วยลุก = บันทึก 0
  const chairBand = band3(chair, chairNorm);
  steps.push({ layer: 3, src: 'Rikli & Jones 1999 · CDC STEADI', text: `ลุก-นั่ง 30 วิ ได้ ${chair} ครั้ง${chairUsedArms ? ' (ใช้มือดัน จึงบันทึก 0)' : ''} · ช่วงปกติของ${p.sex === 'F' ? 'หญิง' : 'ชาย'} ${k}–${k + 4} ปี คือ ${chairNorm[0]}–${chairNorm[1]} → ${BAND_TEXT[chairBand]}${chairBand < 0 ? ' (STEADI: เสี่ยงหกล้ม)' : ''}` });
  let byTest = chairBand < 0 ? 1 : chairBand === 0 ? 2 : 3;
  const meetsWho = p.activityMin >= WHO_WEEKLY;
  if (meetsWho) byTest = Math.min(4, byTest + 1);
  steps.push({ layer: 3, src: 'WHO 2020', text: `ทำกิจกรรมปานกลาง ${p.activityMin} นาที/สัปดาห์ → ${meetsWho ? 'ถึงเป้า 150 แล้ว (+1 ระดับ)' : 'ยังไม่ถึงเป้า 150 · เริ่มน้อยแล้วค่อยเพิ่ม'}` });

  // ข้อบกพร่องจากการทดสอบอื่นที่มี (ถ้าทำ) — ใช้เฉพาะเกณฑ์ที่มีที่มา
  const deficits = [];
  if (chairBand < 0) deficits.push('ลุก-นั่งต่ำกว่าเกณฑ์ของวัย');
  if (Array.isArray(p.test.balanceSecs) && (Number(p.test.balanceSecs[0]) < 10 || Number(p.test.balanceSecs[1]) < 10 || Number(p.test.balanceSecs[2]) < 10)) deficits.push('ยืนต่อเท้าไม่ถึง 10 วินาที (CDC)');
  // เดิน 4 เมตรด้วยความเร็วปกติ (ทางเลือก): ≤ 0.8 ม./วินาที = สมรรถภาพทางกายต่ำ (EWGSOP2 2019 · World Falls Guidelines 2022)
  if (Number.isFinite(p.test.gait4mSec) && p.test.gait4mSec > 0) {
    const speed = Math.round((4 / p.test.gait4mSec) * 100) / 100;
    base.gaitSpeed = speed;
    steps.push({ layer: 3, src: 'EWGSOP2 2019 · World Falls Guidelines 2022', text: `เดิน 4 เมตร ${p.test.gait4mSec} วินาที = ${speed} ม./วินาที → ${speed <= GAIT_SLOW ? `ช้า (≤ ${GAIT_SLOW})` : `ไม่ช้า (> ${GAIT_SLOW})`}` });
    if (speed <= GAIT_SLOW) deficits.push(`เดินช้า ${speed} ม./วินาที (≤ ${GAIT_SLOW})`);
  }

  // เพดาน (ตัวกระตุ้นทุกข้อมาจากเครื่องมือที่มีที่มา · ตัวเลขเพดานเป็นค่าออกแบบ)
  const caps = [];
  if (wfgHigh) caps.push({ max: 1, src: 'World Falls Guidelines 2022', reason: 'เสี่ยงหกล้มสูง → เน้นทรงตัว-กล้ามเนื้อแบบมีคนดูแล และควรได้รับการประเมินจากบุคลากรสาธารณสุข' });
  if (steadiAtRisk && deficits.length) caps.push({ max: 2, src: 'CDC STEADI', reason: `คัดกรองพบความเสี่ยงหกล้ม และ${deficits.join(' · ')} → เน้นทรงตัว-กล้ามเนื้อ แนะนำโปรแกรมป้องกันการล้มหรือนักกายภาพ` });
  if (parq.result === 'cleared_after_consult') caps.push({ max: 2, src: 'PAR-Q+ · WHO 2020', reason: 'ผ่านการปรึกษาแล้ว เริ่มน้อยแล้วค่อยเพิ่ม และทำตามคำแนะนำของผู้เชี่ยวชาญ' });
  const tier = Math.min(byTest, ...caps.map((c) => c.max));
  for (const c of caps) if (c.max < byTest) steps.push({ layer: 3, src: c.src, text: `จำกัดไว้ไม่เกินระดับ ${c.max}: ${c.reason}` });

  const t = TIERS[tier];
  return { ...base, steps, fall: { si, steadiAtRisk, wfgHigh, severe, deficits }, chair: { value: chair, norm: chairNorm, band: chairBand },
    meetsWho, tierByTest: byTest, caps, tier, tierName: t.name, weeklyMin: t.weekly, dailyMin: t.daily, plan: PLAN[tier][band],
    message: tier < byTest ? `ผลทดสอบอยู่ระดับ ${byTest} แต่จำกัดไว้ที่ระดับ ${tier} เพื่อความปลอดภัย` : `ระดับ ${tier} ${t.name}` };
}

// ---------- ชั้น 4: ตัวกรองตามโรค (แต่ละข้อมีที่มาใน RULE_SOURCES · ข้อที่ไม่มีที่มาระบุว่า "ออกแบบ") ----------
export const RULE_SOURCES = Object.freeze({
  knee: 'ACR/AF 2019 (Kolasinski 2020): การออกกำลังกายและไทเก๊กแนะนำอย่างยิ่งสำหรับข้อเข่าเสื่อม · กฎ "ปวดเพิ่ม → ลดระดับ" เป็นค่าออกแบบ',
  osteo: 'Too Fit To Fracture (Giangregorio 2014): เลี่ยงก้มหรือบิดลำตัวสุดช่วง บิดตัวขณะเท้าติดพื้น ก้มยกของ · ฝึกทรงตัวทุกวัน · ฝึกกล้ามเนื้อ ≥ 2 วัน/สัปดาห์',
  hypertension: 'AHA 2023 (Paluch 2024): ความดันที่ควบคุมได้ ฝึกแรงต้านเบา-ปานกลางได้อย่างปลอดภัยด้วยการหายใจที่ถูกวิธี',
  diabetes: 'ADA 2016 (Colberg 2016): ผู้ใช้อินซูลินหรือยากระตุ้นอินซูลินเสี่ยงน้ำตาลต่ำ · ผู้มีปลายประสาทเสื่อมต้องดูแลเท้า',
  asthma: 'ATS 2013 (Parsons 2013): แนะนำอบอุ่นร่างกายก่อนออกกำลังกาย และใช้ยาพ่นขยายหลอดลมก่อนออกกำลังกายตามที่แพทย์สั่ง',
  kidney: 'อาหารของผู้ป่วยไตต้องกำหนดรายบุคคลโดยแพทย์หรือนักกำหนดอาหาร → ระบบไม่ให้คำแนะนำอาหารทั่วไป (ค่าออกแบบ)',
  dementia: 'ให้ผู้ดูแลทำด้วย (ค่าออกแบบเพื่อความปลอดภัย) · PAR-Q+ มีคำถามติดตามหมวดนี้',
});

function filtersOf(p, { conditions, surgery, aids, band }) {
  const rules = [];
  const ui = [];
  const ai = new Set();
  const has = (c) => conditions.includes(c);
  const add = (id, text) => rules.push({ id, text });

  if (has('knee')) { add('knee', 'ข้อเข่าเสื่อม: ออกกำลังกายช่วยได้ (เป็นคำแนะนำหลัก) · ใช้เก้าอี้ที่สูงพอ ไม่กระโดด · ปวดเพิ่มหลังทำ → ลดระดับ'); ai.add('no_floor'); }
  if (has('osteo')) { add('osteo', 'กระดูกพรุน: ไม่ก้มหรือบิดลำตัวสุดช่วง · หมุนตัวด้วยการก้าวเท้า · ยกของให้ย่อเข่า-สะโพก ถือของชิดตัว · ฝึกทรงตัวทุกวัน'); ai.add('no_floor'); ai.add('no_lift'); }
  if (has('hypertension')) add('hypertension', 'ความดันสูง: หายใจตามจังหวะ ไม่กลั้นหายใจ ระบบให้นับออกเสียงขณะออกแรง');
  if (has('diabetes')) add('diabetes', 'เบาหวาน: ถ้าใช้อินซูลินหรือยาลดน้ำตาลบางชนิด ให้มีของว่างใกล้ตัว · ตรวจเท้าหลังเดิน ใส่รองเท้าหุ้มส้น');
  if (has('asthma')) add('asthma', 'หอบหืด: อบอุ่นร่างกายก่อนทุกครั้ง · ใช้ยาพ่นก่อนออกกำลังกายตามที่แพทย์สั่ง · พกยาไว้ใกล้ตัว');
  if (has('kidney')) { add('kidney', 'ไตเรื้อรัง: ปิดเควสอาหารทั่วไป ทำตามที่แพทย์หรือนักกำหนดอาหารสั่ง'); ai.add('no_cooking'); }
  if (has('dementia')) { add('dementia', 'สมองเสื่อม: ทำกับผู้ดูแล คำสั่งทีละขั้นพร้อมเสียง'); ui.push('caregiver_required'); ai.add('supervised'); ai.add('no_sharp_fire'); }
  if (has('heart')) add('heart', 'โรคหัวใจ: ทำตามผล PAR-Q+ และคำแนะนำของแพทย์');
  if (has('neuropathy')) add('neuropathy', 'เท้าชา: ตรวจเท้าทุกวัน รองเท้าหุ้มส้นพอดี · ท่ายืนจับที่จับ (ADA 2016)');
  if (has('foot_ulcer')) { add('foot_ulcer', 'แผลที่เท้ายังไม่หาย: งดท่าลงน้ำหนัก ทำท่านั่งจนแผลหาย (ADA 2016)'); ai.add('no_floor'); }
  if (has('retinopathy')) add('retinopathy', 'เบาหวานขึ้นจอตา: งดออกแรงหนัก ก้มศีรษะต่ำ กลั้นหายใจ (ADA 2016)');
  if (has('dysphagia')) { add('dysphagia', 'กลืนลำบาก: อาหารตามที่นักกำหนดอาหารกำหนด · ปิดเควสอาหาร'); ai.add('no_cooking'); }
  if (surgery.length) { add('surgery', `ผ่าตัด${surgery.map((s) => SURGERY[s].label).join(', ')}ในรอบ 6 เดือน: ทำตามคำแนะนำของแพทย์ผู้ผ่าตัดหรือนักกายภาพก่อนเสมอ`); ai.add('no_lift'); if (surgery.some((s) => s === 'joint' || s === 'back')) ai.add('no_floor'); }
  if (p.falls >= 1) { add('falls', 'เคยล้ม: ทุกท่ามีเก้าอี้หรือโต๊ะข้างตัว เน้นทรงตัวและกล้ามเนื้อขา'); ai.add('no_ladder'); }
  if (aids.includes('cane')) { add('cane', 'ใช้ไม้เท้า: เกณฑ์นับก้าวต้องตั้งแยก (ยังไม่มีข้อมูล) ระหว่างนี้นับเป็นเวลาเดิน'); ai.add('no_ladder'); }
  if (aids.includes('wheelchair')) { add('wheelchair', 'ใช้รถเข็นเป็นหลัก: ภารกิจท่านั่ง (Vivifrail) · ไม่นับก้าว'); ai.add('no_ladder'); ai.add('no_floor'); ai.add('no_lift'); }
  if (aids.includes('walker')) { add('walker', 'ใช้วอล์กเกอร์: ไม่นับก้าวจากมือถือ ใช้เวลาเดินแทน'); ai.add('no_ladder'); ai.add('no_floor'); ai.add('no_lift'); }
  if (band === '80+') ai.add('no_ladder');
  if (aids.includes('hearing')) ui.push('visual_alerts');
  if (aids.includes('glasses')) ui.push('large_text');
  if (p.phoneUse === 'helped') ui.push('helper_mode');
  if (p.smoking === 'current') add('smoking', 'สูบบุหรี่: เปิดเควสพิเศษ "วันนี้ลดบุหรี่" ให้เลือก');
  if (p.alcohol === 'regular') add('alcohol', 'ดื่มประจำ: เปิดเควสพิเศษ "วันงดดื่ม" ให้เลือก');
  const allergy = (p.foodAllergy || []).filter(Boolean);
  const diet = [...new Set(p.diet || [])];
  if (allergy.length) { add('allergy', `แพ้อาหาร (${allergy.join(', ')}): ไม่ให้ AI เสนอเควสทำอาหาร`); ai.add('no_cooking'); }
  if (diet.includes('doctor')) { add('diet', 'แพทย์สั่งคุมอาหาร: ปิดเควสอาหารทั่วไป'); ai.add('no_cooking'); }
  if (diet.includes('halal')) ai.add('diet_halal');
  if (diet.includes('vegetarian')) ai.add('diet_vegetarian');
  return { rules, ui, aiTags: [...ai].sort() };
}
