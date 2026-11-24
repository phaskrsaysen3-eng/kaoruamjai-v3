// ก้าวรวมใจ — คลังท่าออกกำลังกายตามค่าพลัง (รองรับ Recovery Stage Cap + Disable Weights ทุกหมวด)
// โครงตามที่ครูกำหนด: อายุ → เพศ → ค่าพลัง → ท่าออกกำลังกายของค่าพลังนั้น
//   อายุ + เพศ  → เลือกตารางเกณฑ์ (stats.js) → ได้เลเวลค่าพลัง 1–10
//   เลเวล      → ขั้นของท่า A/B/C/D ตามระบบขั้นของ Otago Exercise Programme
//   โหมดพักฟื้น → คุมทั้งระดับเวลา (Tier) และเพดานขั้นท่า (stageCap) ทุกหมวด (รวม STA และท่าแขน) และงดถุงทรายข้อเท้า

export const STAGE_BY_LEVEL = (level) => (level <= 3 ? 'A' : level <= 5 ? 'B' : level <= 7 ? 'C' : 'D');
export const STAGE_TEXT = { A: 'ขั้น A · จับที่จับ', B: 'ขั้น B · ลดการจับ', C: 'ขั้น C · ไม่จับหรือเพิ่มรอบ', D: 'ขั้น D · ไม่จับ + เพิ่มรอบ' };

const STAGE_ORDER = ['A', 'B', 'C', 'D'];
function capStage(stage, cap) {
  if (!cap) return stage;
  const i = STAGE_ORDER.indexOf(stage), c = STAGE_ORDER.indexOf(cap);
  if (i < 0) return cap;
  if (c < 0) return stage;
  return STAGE_ORDER[Math.min(i, c)];
}

export const EXERCISES = Object.freeze([
  // ---------- STR พลังกล้ามเนื้อ ----------
  { id: 'sit_to_stand', stat: 'STR', name: 'ลุก-นั่งเก้าอี้', src: 'otago', cam: true,
    how: 'นั่งกลางเก้าอี้ เท้าวางห่างเท่าสะโพก โน้มตัวมาข้างหน้าเล็กน้อย ลุกขึ้นยืนตรง แล้วนั่งลงช้าๆ',
    levels: { A: 'ลุก 5 ครั้ง ใช้สองมือดัน', B: 'ลุก 5 ครั้ง ใช้มือเดียว หรือ 10 ครั้ง ใช้สองมือ', C: 'ลุก 10 ครั้ง ไม่ใช้มือ', D: 'ลุก 10 ครั้ง ไม่ใช้มือ ทำ 2 รอบ' } },
  { id: 'knee_ext', stat: 'STR', name: 'เหยียดเข่าท่านั่ง', src: 'otago',
    how: 'นั่งหลังพิงเก้าอี้ เหยียดขาข้างหนึ่งให้ตรงช้าๆ ค้างไว้ แล้ววางลงช้าๆ',
    levels: { A: '10 ครั้ง/ข้าง 1 รอบ', B: '10 ครั้ง/ข้าง 2 รอบ', C: '2 รอบ ถ่วงถุงทรายข้อเท้าตามที่ผู้เชี่ยวชาญกำหนด', D: '2 รอบ เพิ่มน้ำหนักถุงทราย' }, weights: true, stageSrc: { A: 'otago_rule', B: 'otago_rule', C: 'otago_rule', D: 'otago_rule' } },
  { id: 'knee_flex', stat: 'STR', name: 'งอเข่าไปด้านหลัง', src: 'otago',
    how: 'ยืนจับพนักเก้าอี้ งอเข่าข้างหนึ่งพาส้นเท้าขึ้นไปด้านหลัง แล้ววางลงช้าๆ',
    levels: { A: '10 ครั้ง/ข้าง 1 รอบ', B: '10 ครั้ง/ข้าง 2 รอบ', C: '2 รอบ ถ่วงถุงทรายข้อเท้าตามที่ผู้เชี่ยวชาญกำหนด', D: '2 รอบ เพิ่มน้ำหนักถุงทราย' }, weights: true, stageSrc: { A: 'otago_rule', B: 'otago_rule', C: 'otago_rule', D: 'otago_rule' } },
  { id: 'hip_abd', stat: 'STR', name: 'กางขาด้านข้าง', src: 'otago',
    how: 'ยืนจับพนักเก้าอี้ ลำตัวตรง กางขาข้างหนึ่งออกด้านข้างช้าๆ แล้วนำกลับ',
    levels: { A: '10 ครั้ง/ข้าง 1 รอบ', B: '10 ครั้ง/ข้าง 2 รอบ', C: '2 รอบ ถ่วงถุงทรายข้อเท้าตามที่ผู้เชี่ยวชาญกำหนด', D: '2 รอบ เพิ่มน้ำหนักถุงทราย' }, weights: true, stageSrc: { A: 'otago_rule', B: 'otago_rule', C: 'otago_rule', D: 'otago_rule' } },
  { id: 'calf_raise', stat: 'STR', name: 'เขย่งปลายเท้า', src: 'otago', cam: true,
    how: 'ยืนตรงจับพนักเก้าอี้ เขย่งขึ้นบนปลายเท้า แล้วลดส้นเท้าลงช้าๆ',
    levels: { A: '10 ครั้ง จับสองมือ', B: '10 ครั้ง จับมือเดียว', C: '10 ครั้ง จับที่จับ ทำ 2 รอบ', D: '10 ครั้ง ไม่จับ ทำ 2 รอบ' }, stageSrc: { A: 'otago_rule', B: 'otago_rule' } },
  { id: 'toe_raise', stat: 'STR', name: 'กระดกปลายเท้า', src: 'otago',
    how: 'ยืนตรงจับพนักเก้าอี้ ยกปลายเท้าขึ้นยืนบนส้นเท้า แล้ววางลงช้าๆ',
    levels: { A: '10 ครั้ง จับสองมือ', B: '10 ครั้ง จับมือเดียว', C: '10 ครั้ง จับที่จับ ทำ 2 รอบ', D: '10 ครั้ง ไม่จับ ทำ 2 รอบ' }, stageSrc: { A: 'otago_rule', B: 'otago_rule' } },
  { id: 'wall_push', stat: 'STR', region: 'arm', name: 'ดันผนัง', src: 'acsm', cam: true,
    how: 'ยืนห่างผนังหนึ่งช่วงแขน วางมือบนผนังระดับไหล่ งอศอกให้ตัวเข้าหาผนัง แล้วดันกลับ',
    levels: { A: '8 ครั้ง ยืนใกล้ผนัง', B: '10 ครั้ง', C: '10 ครั้ง 2 รอบ', D: '15 ครั้ง 2 รอบ' } },
  { id: 'arm_curl', stat: 'STR', region: 'arm', name: 'งอแขนยกขวดน้ำ', src: 'acsm', cam: true, note: 'Vivifrail ใช้ขวดน้ำ 500–2,500 มล. เป็นน้ำหนักฝึก',
    how: 'นั่งหลังตรง ถือขวดน้ำ งอศอกยกขวดขึ้นหาไหล่ แล้ววางลงช้าๆ',
    levels: { A: '10 ครั้ง/ข้าง ขวดเล็ก 600 มล.', B: '10 ครั้ง/ข้าง 2 รอบ ขวดเล็ก', C: '10 ครั้ง/ข้าง 2 รอบ ขวด 1.5 ลิตร', D: '15 ครั้ง/ข้าง 2 รอบ ขวด 1.5 ลิตร' } },
  { id: 'band_row', stat: 'STR', region: 'arm', name: 'ดึงยางยืด', src: 'acsm', equipment: 'ยางยืดออกกำลังกาย',
    how: 'คล้องยางยืดกับที่มั่นคงระดับอก นั่งหรือยืนหลังตรง ดึงยางเข้าหาตัว บีบสะบักเข้าหากัน แล้วคลายช้าๆ',
    levels: { A: '8 ครั้ง ยางเบา', B: '10 ครั้ง', C: '10 ครั้ง 2 รอบ', D: '12 ครั้ง 3 รอบ' } },

  // ---------- STA ความอึด ----------
  { id: 'walk', stat: 'STA', name: 'เดิน', src: 'otago',
    how: 'เดินตามจังหวะปกติ เริ่มในบ้านก่อน แข็งแรงขึ้นแล้วจึงเดินนอกบ้าน แบ่งเป็นช่วงสั้นได้',
    levels: { A: '5–10 นาที/วัน แบ่งช่วงได้', B: '10–15 นาที/วัน', C: '15–20 นาที/วัน', D: 'สูงสุด 30 นาที/วัน' }, stageSrc: { A: 'design', B: 'design', C: 'design' } },
  { id: 'seated_march', stat: 'STA', name: 'ย่ำเท้าท่านั่ง', src: 'design', onlyStage: 'A',
    how: 'นั่งหลังตรงบนเก้าอี้ ยกเข่าสลับซ้าย-ขวาเป็นจังหวะ สำหรับวันที่ยืนนานไม่ไหว',
    levels: { A: '1–2 นาที × 3 รอบ' } },
  { id: 'march', stat: 'STA', name: 'ย่ำเท้าอยู่กับที่', src: 'design', cam: true,
    how: 'ยืนข้างโต๊ะหรือพนักเก้าอี้ ยกเข่าสลับซ้าย-ขวาเป็นจังหวะ หายใจสม่ำเสมอ',
    levels: { A: '1 นาที × 3 รอบ จับที่จับ', B: '2 นาที × 3 รอบ', C: '3 นาที × 3 รอบ', D: '5 นาที × 3 รอบ' } },

  // ---------- AGI ความคล่องแคล่ว ----------
  { id: 'figure8', stat: 'AGI', name: 'เดินเลขแปด', src: 'otago',
    how: 'วางของ 2 ชิ้นห่างกันประมาณ 2 เมตร เดินวนรอบของทั้งสองเป็นรูปเลข 8',
    levels: { A: 'เลขแปด 2 รอบ ใช้อุปกรณ์ช่วยเดิน', B: 'เลขแปด 2 รอบ ไม่ใช้อุปกรณ์' } },
  { id: 'side_walk', stat: 'AGI', name: 'เดินด้านข้าง', src: 'otago',
    how: 'ยืนตรง ก้าวเท้าออกด้านข้าง แล้วนำอีกเท้าตามมาชิด เดินไปทางซ้ายและขวา',
    levels: { A: '10 ก้าว × 4 ใช้อุปกรณ์ช่วยเดินหรือจับโต๊ะ', B: '10 ก้าว × 4 ไม่จับ' } },
  { id: 'back_walk', stat: 'AGI', name: 'เดินถอยหลัง', src: 'otago',
    how: 'ยืนข้างโต๊ะหรือผนัง เดินถอยหลังช้าๆ มองตรงไปข้างหน้า',
    levels: { A: '10 ก้าว × 4 จับที่จับ', B: '10 ก้าว × 4 ไม่จับ' } },
  { id: 'up_go_practice', stat: 'AGI', name: 'ลุก-เดิน-หมุน-กลับมานั่ง', src: 'design', cam: true,
    how: 'ลุกจากเก้าอี้ เดินไปรอบของที่วางห่าง 2.44 เมตร แล้วกลับมานั่ง เดินตามปกติ ห้ามวิ่ง',
    levels: { A: '3 รอบ ใช้อุปกรณ์ช่วยเดินได้', B: '5 รอบ', C: '5 รอบ × 2', D: '5 รอบ × 3' } },

  // ---------- BAL การทรงตัว ----------
  { id: 'tandem_stand', stat: 'BAL', name: 'ยืนต่อเท้า', src: 'otago',
    how: 'ยืนข้างโต๊ะ วางส้นเท้าข้างหนึ่งชิดปลายเท้าอีกข้างเป็นเส้นตรง มองตรงไปข้างหน้า',
    levels: { A: '10 วินาที จับที่จับ', B: '10 วินาที ไม่จับ' } },
  { id: 'tandem_walk', stat: 'BAL', name: 'เดินต่อเท้า', src: 'otago',
    how: 'เดินข้างโต๊ะหรือผนัง วางส้นเท้าชิดปลายเท้าอีกข้างทุกก้าว',
    levels: { A: '10 ก้าว 2 รอบ จับที่จับ', B: '10 ก้าว 2 รอบ ไม่จับ' } },
  { id: 'one_leg', stat: 'BAL', name: 'ยืนขาเดียว', src: 'otago',
    how: 'ยืนข้างโต๊ะ ยกเท้าข้างหนึ่งขึ้นเล็กน้อย ทำทั้งสองข้าง',
    levels: { A: '10 วินาที/ข้าง จับที่จับ', B: '10 วินาที/ข้าง ไม่จับ', C: '30 วินาที/ข้าง ไม่จับ' } },
  { id: 'knee_bend', stat: 'BAL', name: 'ย่อเข่า', src: 'otago', cam: true,
    how: 'ยืนตรงข้างโต๊ะ ย่อเข่าลงเล็กน้อยโดยส้นเท้าติดพื้น แล้วยืดขึ้น',
    levels: { A: '10 ครั้ง จับที่จับ', B: '10 ครั้ง ไม่จับ', C: '10 ครั้ง ไม่จับ ทำ 2 รอบ', D: '10 ครั้ง ไม่จับ ทำ 3 รอบ' } },
  { id: 'heel_walk', stat: 'BAL', name: 'เดินด้วยส้นเท้า', src: 'otago',
    how: 'เดินข้างโต๊ะหรือผนัง ยกปลายเท้าขึ้น เดินบนส้นเท้า',
    levels: { A: '10 ก้าว × 4 จับที่จับ', B: '10 ก้าว × 4 ไม่จับ' } },
  { id: 'toe_walk', stat: 'BAL', name: 'เดินด้วยปลายเท้า', src: 'otago',
    how: 'เดินข้างโต๊ะหรือผนัง เขย่งเดินบนปลายเท้า',
    levels: { A: '10 ก้าว × 4 จับที่จับ', B: '10 ก้าว × 4 ไม่จับ' } },
  { id: 'heel_toe_back', stat: 'BAL', name: 'เดินต่อเท้าถอยหลัง', src: 'otago',
    how: 'เดินถอยหลังโดยวางปลายเท้าชิดส้นเท้าอีกข้าง ข้างโต๊ะหรือผนัง',
    levels: { D: '10 ก้าว 2 รอบ ไม่จับ' } },
]);

export const FREQUENCY = Object.freeze({
  STR: '2–3 วัน/สัปดาห์ เว้นวัน (ICFSR · Otago 3 วัน) · เริ่ม 1–2 รอบ แล้วค่อยเพิ่มเป็น 2–3 รอบ × 8–12 ครั้ง (ICFSR)',
  STA: '3–7 วัน/สัปดาห์ · เริ่มครั้งละ 5–10 นาที แล้วเพิ่มเป็น 15–30 นาที · ความหนัก "ค่อนข้างเหนื่อย" (Borg 12–14) (ICFSR) · รวมให้ถึง 150 นาที/สัปดาห์ (WHO)',
  AGI: '3 วันขึ้นไป/สัปดาห์ ทำรวมกับท่าทรงตัว (Otago · WHO กิจกรรมหลายองค์ประกอบ)',
  BAL: '3 วันขึ้นไป/สัปดาห์ ทำทุกวันได้ (Otago · WHO) · ครั้งละ 4–10 ท่า 1–2 รอบ (ICFSR)',
});

const SEATED = new Set(['knee_ext', 'arm_curl', 'band_row', 'seated_march']);

export const WARMUP = Object.freeze([
  { name: 'หันศีรษะซ้าย-ขวา', dose: 'ข้างละ 5 ครั้ง' },
  { name: 'เก็บคาง', dose: '5 ครั้ง' },
  { name: 'บิดลำตัวช้าๆ (มือเท้าเอว)', dose: 'ข้างละ 5 ครั้ง' },
  { name: 'หมุนข้อเท้า', dose: '10 ครั้ง' },
  { name: 'แอ่นหลังเล็กน้อยท่ายืน', dose: '5 ครั้ง' },
]);

export const RULES = Object.freeze([
  'อบอุ่นร่างกายก่อนทุกครั้ง (Otago)',
  'ขึ้นขั้นเมื่อทำครบ 2 รอบ × 10 ครั้งได้ (Otago)',
  'เลิกจับที่จับได้เมื่อเสียหลักแล้วตั้งหลักด้วยขาได้เอง ไม่ต้องคว้าที่จับ (Otago)',
  'ยกขึ้นช้า 2–3 วินาที ลงช้า 4–5 วินาที หายใจออกตอนออกแรง ห้ามกลั้นหายใจ พักระหว่างรอบ 1–2 นาที (Otago · AHA)',
  'ถ้ายังยืนรับน้ำหนักตัวเองได้ไม่มั่นคง ให้เริ่มจากฝึกกล้ามเนื้อก่อน (ICFSR)',
  'ผู้ที่ทรงตัวไม่ดี ให้ฝึกทรงตัวก่อนเพิ่มเวลาเดิน (ICFSR)',
  'พื้นต้องแห้ง ไม่มีพรมลื่นหรือของกีดขวาง ฝึกข้างโต๊ะหรือพนักเก้าอี้ที่มั่นคงเสมอ (Vivifrail แนะนำให้จัดการสิ่งเสี่ยงในบ้าน)',
  'หยุดทันทีและติดต่อแพทย์ถ้าเวียนหัว เจ็บหน้าอก หายใจไม่ทัน หรือปวดกล้ามเนื้อไม่หาย (Otago)',
  'ห้ามใช้ถุงทรายข้อเท้าก่อนได้รับคำแนะนำจากนักกายภาพหรือผู้เชี่ยวชาญ (Otago)',
  'หลังป่วยหรือหยุดไปนาน ต้องปรึกษาก่อนกลับมาเริ่มใหม่ (Otago)',
  'คุมความหนักด้วยการพูด: ยังพูดเป็นประโยคได้แต่ร้องเพลงไม่ได้ (Borg 12–14) · ไม่ใช้ชีพจร เพราะยาบางกลุ่มกดการเต้นของหัวใจ',
  'ไม่มีท่าขึ้นบันได (Otago กำหนดให้มีผู้ดูแลใกล้ชิดและราวจับ) และไม่มีท่าทรงตัวหลับตา (เพิ่มความเสี่ยงล้มเมื่อฝึกเองที่บ้าน)',
]);

const STAT_ORDER = ['STR', 'STA', 'AGI', 'BAL'];
const pickLevel = (ex, stage) => {
  for (let i = STAGE_ORDER.indexOf(stage); i >= 0; i--) if (ex.levels[STAGE_ORDER[i]]) return STAGE_ORDER[i];
  return null;
};

/**
 * จัดท่าออกกำลังกายตามค่าพลัง + บังคับเพดานขั้นท่าช่วงฟื้นตัว (stageCap) และงดถุงทรายข้อเท้า (disableWeights)
 */
export function exercisePlan(p) {
  const warnings = [];
  if (p.tier === 0) return { tier0: true, groups: [], warnings: ['ทำเฉพาะท่านั่งเบาๆ ในระดับ 0 จนกว่าจะพร้อมหรือผู้เชี่ยวชาญอนุญาต'] };
  const m = p.mods || {};
  const stageCap = m.stageCap || null;
  const disableWeights = m.disableWeights === true;
  const holdSupport = m.holdSupport === true || stageCap === 'A' || p.fallHigh === true || p.balFallRisk === true || (p.stats?.BAL ?? 10) <= 3;

  for (const w of m.warnings || []) warnings.push(w.text);
  if (holdSupport && !m.inRecovery) warnings.push('เสี่ยงหกล้ม → ท่ายืนทุกท่าต้องจับที่จับ (ขั้น A) จนกว่าจะประเมินใหม่');
  if (p.dementia) warnings.push('Otago ไม่เหมาะกับผู้มีภาวะสมองบกพร่องมาก → ต้องทำกับผู้ดูแลเสมอ');
  if (p.age >= 80 && !disableWeights) warnings.push('อายุ 80 ปีขึ้นไป: ถ้าผู้เชี่ยวชาญให้ใช้ถุงทราย เริ่มที่ 2–4 ปอนด์ (ประมาณ 1–2 กก.) ตาม Otago');

  const stats = p.stats || {};
  const known = STAT_ORDER.filter((s) => Number.isFinite(stats[s]));
  const minLv = known.length ? Math.min(...known.map((s) => stats[s])) : 1;
  const focus = known.filter((s) => stats[s] === minLv);

  const groups = STAT_ORDER.map((stat) => {
    const level = stats[stat];
    if ((m.blockStats || []).includes(stat)) return { stat, level: Number.isFinite(level) ? level : null, stage: null, split: null, focus: focus.includes(stat), frequency: FREQUENCY[stat], exercises: [], blocked: true };
    if (!Number.isFinite(level)) return { stat, level: null, stage: 'A', frequency: FREQUENCY[stat], focus: false, exercises: [], note: 'ยังไม่ได้ทดสอบ → ใช้ขั้น A ไปก่อน' };

    let stage = STAGE_BY_LEVEL(level);
    // บังคับ stageCap ครอบคลุมทุกหมวด (รวม STA เช่น march และ STR แขน)
    if (stageCap) stage = capStage(stage, stageCap);
    // holdSupport จากความเสี่ยงหกล้มบังคับท่ายืน (STR ขา, AGI, BAL) เป็นขั้น A
    const standing = stat !== 'STA';
    if (holdSupport && standing) stage = 'A';

    const stageFor = (e) => {
      let s;
      if (stat === 'STR' && p.strParts) {
        const part = e.region === 'arm' ? p.strParts.arm : p.strParts.chair;
        if (Number.isFinite(part)) {
          s = STAGE_BY_LEVEL(part);
          if (holdSupport && e.region !== 'arm') s = 'A';
        } else {
          s = stage;
        }
      } else {
        s = stage;
      }
      // คุม stageCap ครอบคลุมทุกท่า รวมถึงท่าแขนและท่า STA
      if (stageCap) s = capStage(s, stageCap);
      // งดถุงทรายข้อเท้าช่วงฟื้นตัว (ท่าที่มี weights: true ขั้น C–D ใช้ถุงทราย → จำกัดสูงสุดขั้น B)
      if (disableWeights && e.weights) s = capStage(s, 'B');
      return s;
    };

    const note = [m.notes?.all, stat === 'STR' ? m.notes?.STR : null].filter(Boolean).join(' · ') || null;
    const exercises = EXERCISES.filter((e) => e.stat === stat && (!m.seatedOnly || SEATED.has(e.id)) && (m.seatedOnly ? true : (!e.onlyStage || stageFor(e) === e.onlyStage))).map((e) => {
      const targetStage = m.seatedOnly && e.onlyStage ? e.onlyStage : stageFor(e);
      const lv = pickLevel(e, targetStage);
      return lv ? { id: e.id, name: e.name, how: e.how, dose: e.levels[lv], stage: lv, src: e.stageSrc?.[lv] || e.src, cam: !!e.cam, equipment: e.equipment || null, weights: !!e.weights, note } : null;
    }).filter(Boolean);

    const legsStage = stat === 'STR' && p.strParts && Number.isFinite(p.strParts.chair)
      ? capStage(holdSupport ? 'A' : STAGE_BY_LEVEL(p.strParts.chair), stageCap) : null;
    const armsStage = stat === 'STR' && p.strParts && Number.isFinite(p.strParts.chair)
      ? capStage(Number.isFinite(p.strParts.arm) ? STAGE_BY_LEVEL(p.strParts.arm) : stage, stageCap) : null;
    const split = legsStage ? { legs: legsStage, arms: armsStage } : null;

    return { stat, level, stage, split, focus: focus.includes(stat), frequency: FREQUENCY[stat], exercises };
  });

  // ไม่ได้ทดสอบ → ขั้น A
  for (const g of groups) {
    if (g.level === null && !(m.blockStats || []).includes(g.stat)) {
      const note = [m.notes?.all, g.stat === 'STR' ? m.notes?.STR : null].filter(Boolean).join(' · ') || null;
      g.exercises = EXERCISES.filter((e) => e.stat === g.stat && e.levels.A && (!m.seatedOnly || SEATED.has(e.id)))
        .map((e) => ({ id: e.id, name: e.name, how: e.how, dose: e.levels.A, stage: 'A', src: e.stageSrc?.A || e.src, cam: !!e.cam, equipment: e.equipment || null, note }));
    }
  }
  const warmup = WARMUP.map((w) => (m.warmupMods?.[w.name] ? { ...w, dose: `${w.dose} · ${m.warmupMods[w.name]}` } : w));
  return { tier0: false, warmup, groups, focus, warnings, rules: RULES, advice: m.advice || [], seatedOnly: !!m.seatedOnly, stageCap, disableWeights, inRecovery: !!m.inRecovery };
}
