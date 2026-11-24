// ก้าวรวมใจ — เควสงานอดิเรกที่ AI (Gemini) จัดให้ โดยผู้ใช้ไม่ต้องกรอกงานอดิเรกเอง
//
// หลักการ
// - ส่งให้ AI เฉพาะ "แท็กเงื่อนไข" เช่น no_floor, movementMax ห้ามส่งชื่อ โรค อายุจริง เหตุผลการป่วย หรือข้อมูลที่ระบุตัวตน (PDPA ม.26)
// - ระหว่างพักฟื้น (frozen / waitingClearance) ล็อก movementMax = 0 (นั่งนิ่งเท่านั้น) · ช่วงกำลังฟื้นตัว (inRecovery) จำกัดไม่เกิน 2 [ออกแบบเอง]
// - AI เสนอ 3 ตัวเลือกคนละหมวด → ระบบตรวจทุกข้อด้วยกฎ (validate) → ข้อที่ไม่ผ่านถูกทิ้งและเติมจากคลังสำรอง
// - ระบบเรียนรู้ความชอบจาก "สิ่งที่ผู้ใช้กดเลือก" ไม่ใช่จากการพิมพ์

export const CATEGORIES = Object.freeze({
  garden: 'ทำสวน', craft: 'งานฝีมือ', music: 'ดนตรี/ร้องเพลง', reading: 'อ่าน/เขียน', cooking: 'ทำอาหาร',
  brain: 'เกมฝึกสมอง', social: 'พบปะ/จิตอาสา', mind: 'สมาธิ/สวดมนต์', home: 'งานบ้านเบาๆ',
});

export const MOVEMENT = ['นั่งนิ่ง', 'นั่งขยับมือ', 'ยืน/เดินเบาๆ', 'ออกแรงปานกลาง'];
export const MOVEMENT_MAX_BY_TIER = [1, 2, 2, 3, 3];

// คำต้องห้ามตามแท็ก (ตรวจทั้งชื่อ ขั้นตอน และของที่ใช้) — ตั้งใจให้เข้มเกิน ดีกว่าหลุด
export const BANNED = Object.freeze({
  no_ladder: ['บันได', 'ปีน', 'ที่สูง', 'ต่อเก้าอี้'],
  no_floor: ['นั่งพื้น', 'คุกเข่า', 'นั่งยอง', 'ก้มเก็บ', 'ถอนหญ้า', 'ขัดพื้น'],
  no_lift: ['ยกของหนัก', 'แบก', 'หาบ', 'ยกถัง', 'ยกกระถางใหญ่', 'ย้ายเฟอร์นิเจอร์'],
  no_sharp_fire: ['มีด', 'กรรไกร', 'เข็ม', 'เตา', 'จุดไฟ', 'เทียน', 'ทอด', 'น้ำร้อน'],
  no_cooking: ['ทำอาหาร', 'ปรุง', 'ทอด', 'ผัด', 'ต้ม', 'อบขนม', 'ทำขนม'],
  diet_halal: ['หมู', 'เบคอน', 'แฮม', 'เหล้า', 'ไวน์', 'เบียร์'],
  diet_vegetarian: ['หมู', 'ไก่', 'เนื้อวัว', 'ปลา', 'กุ้ง', 'ปู', 'หมึก', 'หอย'],
});
export const GLOBAL_BANNED = ['กินยา', 'ทานยา', 'หยุดยา', 'ลดยา', 'รักษาโรค', 'หายขาด', 'อาหารเสริม', 'โอนเงิน', 'ลงทุน', 'สั่งซื้อออนไลน์', 'แอดไลน์'];
const LINK_RE = /https?:|www\.|\.(com|net|org|co|th)\b|@|line\s*id|\d{3}[-\s]?\d{3}[-\s]?\d{3,4}/i;

// คลังสำรอง (ตรวจแล้วด้วยมือ) ใช้เมื่อ AI ล่ม ตอบผิดรูปแบบ หรือไม่ผ่านกฎ
export const FALLBACK = Object.freeze([
  { title: 'ปลูกผักในกระถางบนโต๊ะ', category: 'garden', minutes: 15, movement: 1, steps: ['เตรียมกระถางเล็กบนโต๊ะ', 'ใส่ดินครึ่งกระถาง', 'หยอดเมล็ดผักบุ้งหรือต้นหอม', 'รดน้ำพอชื้น'], why: 'ได้ใช้มือและมีของให้ดูแลทุกวัน', items: ['กระถางเล็ก', 'ดิน', 'เมล็ดผัก'] },
  { title: 'รดน้ำต้นไม้รอบบ้าน', category: 'garden', minutes: 10, movement: 2, steps: ['ใช้บัวรดน้ำใบเล็ก', 'เดินรดทีละต้น', 'พักเมื่อเหนื่อย'], why: 'ได้เดินและอยู่กับธรรมชาติ', items: ['บัวรดน้ำใบเล็ก'] },
  { title: 'พับดอกไม้จากกระดาษ', category: 'craft', minutes: 15, movement: 1, steps: ['เตรียมกระดาษสี่เหลี่ยม', 'พับครึ่งสองทบ', 'พับมุมตามรูปตัวอย่าง', 'คลี่ออกเป็นดอกไม้'], why: 'ฝึกนิ้วมือและสมาธิ', items: ['กระดาษสี'] },
  { title: 'ร้องเพลงโปรด 3 เพลง', category: 'music', minutes: 10, movement: 0, steps: ['เลือกเพลงที่ชอบ 3 เพลง', 'ร้องตามช้าๆ', 'ปรบมือตามจังหวะ'], why: 'ได้หายใจลึกและอารมณ์ดี', items: [] },
  { title: 'ปรบมือตามจังหวะเพลง', category: 'music', minutes: 10, movement: 1, steps: ['เปิดเพลงจังหวะช้า', 'ปรบมือตามจังหวะ', 'สลับตบเข่าเบาๆ'], why: 'ฝึกจังหวะและการประสานมือ', items: [] },
  { title: 'เขียนเรื่องดีๆ ของวันนี้ 3 อย่าง', category: 'reading', minutes: 10, movement: 1, steps: ['เตรียมสมุดกับปากกา', 'นึกเรื่องดีๆ 3 อย่าง', 'เขียนสั้นๆ ข้อละบรรทัด'], why: 'ฝึกความจำและมองเรื่องดี', items: ['สมุด', 'ปากกา'] },
  { title: 'อ่านข่าวหรือนิทานออกเสียง', category: 'reading', minutes: 10, movement: 0, steps: ['เลือกเรื่องสั้น 1 เรื่อง', 'อ่านออกเสียงช้าๆ', 'เล่าให้คนในบ้านฟัง'], why: 'ฝึกสมองและได้คุยกับคนอื่น', items: [] },
  { title: 'จับคู่ไพ่ภาพเหมือน', category: 'brain', minutes: 10, movement: 1, steps: ['คว่ำไพ่ 12 ใบ', 'เปิดทีละ 2 ใบ', 'จำตำแหน่งแล้วจับคู่ให้ครบ'], why: 'ฝึกความจำระยะสั้น', items: ['ไพ่หรือการ์ดภาพ'] },
  { title: 'นับเลขถอยหลังทีละ 3', category: 'brain', minutes: 5, movement: 0, steps: ['เริ่มที่ 100', 'ลบทีละ 3 ออกเสียง', 'หยุดเมื่อถึง 1 หรือครบเวลา'], why: 'ฝึกสมาธิและการคิดเลข', items: [] },
  { title: 'โทรคุยกับเพื่อนในก๊วน', category: 'social', minutes: 10, movement: 0, steps: ['เลือกเพื่อนในก๊วน 1 คน', 'โทรถามว่าวันนี้ทำภารกิจหรือยัง', 'ชวนกันทำพรุ่งนี้'], why: 'ไม่เหงาและมีเพื่อนชวนกันทำ', items: ['โทรศัพท์'] },
  { title: 'นั่งสมาธิหายใจช้า', category: 'mind', minutes: 5, movement: 0, steps: ['นั่งหลังตรงบนเก้าอี้', 'หายใจเข้านับ 4', 'หายใจออกนับ 6', 'ทำซ้ำจนครบเวลา'], why: 'ช่วยผ่อนคลาย', items: ['เก้าอี้'] },
  { title: 'พับผ้าที่ซักแล้วบนโต๊ะ', category: 'home', minutes: 10, movement: 1, steps: ['วางผ้าบนโต๊ะ', 'พับทีละชิ้น', 'แยกเป็นกองตามประเภท'], why: 'ได้ใช้มือและช่วยงานบ้าน', items: [] },
  { title: 'ล้างผักผลไม้สำหรับมื้อเย็น', category: 'cooking', minutes: 10, movement: 2, steps: ['ยืนที่อ่างล้างจาน', 'ล้างผักทีละชนิดใต้น้ำไหล', 'วางผึ่งในตะกร้า'], why: 'ได้ยืนและมีส่วนร่วมกับมื้ออาหาร', items: ['ตะกร้า'] },
]);

// ---------- เตรียมคำขอ (ส่งเฉพาะแท็กความปลอดภัย ไม่ส่งเหตุผลการป่วย/โรค ตาม PDPA ม.26) ----------
export function hobbyTags(assessment = {}, { freeMinutes = 30, history = [], frozen = false, waitingClearance = false, inRecovery = false } = {}) {
  const tier = Math.max(0, Math.min(4, assessment?.tier ?? 0));
  const tags = new Set(assessment?.aiTags || []);
  let allowed = Object.keys(CATEGORIES);
  if (tags.has('no_cooking') || frozen || waitingClearance) allowed = allowed.filter((c) => c !== 'cooking');

  let movementMax = MOVEMENT_MAX_BY_TIER[tier] ?? 1;
  // [ออกแบบเอง] ช่วงพักฟื้น/รอการยืนยัน ล็อกเฉพาะกิจกรรมนั่งนิ่ง (movementMax = 0) · ช่วงฟื้นตัวจำกัดไม่เกิน 2
  if (frozen || waitingClearance) movementMax = 0;
  else if (inRecovery) movementMax = Math.min(movementMax, 2);

  const counts = {};
  for (const h of history.slice(-30)) counts[h.category] = (counts[h.category] || 0) + 1;
  const liked = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c]) => c).filter((c) => allowed.includes(c));
  return {
    tags: [...tags].sort(),
    movementMax,
    maxMinutes: Math.max(5, Math.min(30, Math.floor(freeMinutes))),
    allowed,
    liked,
    recentTitles: history.slice(-10).map((h) => h.title),
  };
}

const TAG_TEXT = {
  no_ladder: 'ห้ามมีการปีนหรือขึ้นที่สูง', no_floor: 'ห้ามนั่งพื้น คุกเข่า หรือก้มต่ำ', no_lift: 'ห้ามยกหรือแบกของหนัก',
  no_sharp_fire: 'ห้ามใช้ของมีคม ไฟ หรือน้ำร้อน', no_cooking: 'ห้ามกิจกรรมทำอาหาร', supervised: 'ต้องเป็นกิจกรรมที่ทำร่วมกับผู้ดูแลได้',
  diet_halal: 'ถ้าเกี่ยวกับอาหาร ต้องเป็นอาหารฮาลาล', diet_vegetarian: 'ถ้าเกี่ยวกับอาหาร ต้องไม่มีเนื้อสัตว์',
};

export const RESPONSE_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    options: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'ชื่อกิจกรรมภาษาไทย ไม่เกิน 40 ตัวอักษร' },
          category: { type: 'string', enum: Object.keys(CATEGORIES) },
          minutes: { type: 'integer' },
          movement: { type: 'integer', enum: [0, 1, 2, 3] },
          steps: { type: 'array', items: { type: 'string' } },
          why: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'category', 'minutes', 'movement', 'steps', 'why', 'items'],
      },
    },
  },
  required: ['options'],
});

export function buildPrompt(t) {
  const rules = t.tags.map((x) => TAG_TEXT[x]).filter(Boolean);
  return [
    'คุณช่วยเสนอกิจกรรมงานอดิเรกสั้นๆ ให้ผู้สูงอายุไทยทำที่บ้าน ตอบเป็นภาษาไทยที่อ่านง่าย',
    'เสนอ 3 กิจกรรม แต่ละกิจกรรมต้องอยู่คนละหมวด',
    `หมวดที่ใช้ได้: ${t.allowed.map((c) => `${c} (${CATEGORIES[c]})`).join(', ')}`,
    `เวลาแต่ละกิจกรรม 5–${t.maxMinutes} นาที`,
    `ระดับการเคลื่อนไหว (movement) ไม่เกิน ${t.movementMax}: 0 นั่งนิ่ง, 1 นั่งขยับมือ, 2 ยืนหรือเดินเบาๆ, 3 ออกแรงปานกลาง`,
    'ขั้นตอน 2–5 ข้อ ข้อละสั้นๆ ใช้ของที่มีในบ้านทั่วไป',
    'ห้ามแนะนำยา อาหารเสริม หรืออ้างว่ารักษาโรค ห้ามมีลิงก์ เบอร์โทร ไลน์ หรือเรื่องเงิน',
    ...rules.map((r) => `ข้อจำกัด: ${r}`),
    t.liked.length ? `ผู้ใช้มักเลือกหมวด: ${t.liked.join(', ')} ให้มีอย่างน้อย 1 ตัวเลือกจากหมวดนี้` : '',
    t.recentTitles.length ? `ห้ามซ้ำกับกิจกรรมเหล่านี้: ${t.recentTitles.join(' / ')}` : '',
  ].filter(Boolean).join('\n');
}

// ---------- ตรวจคำตอบของ AI ----------
const textOf = (o) => [o.title, ...(o.steps || []), o.why, ...(o.items || [])].join(' ');

export function checkOption(o, t) {
  const why = [];
  if (!o || typeof o !== 'object') return ['รูปแบบไม่ถูกต้อง'];
  if (typeof o.title !== 'string' || !o.title.trim() || o.title.length > 40) why.push('ชื่อว่างหรือยาวเกิน 40 ตัวอักษร');
  if (!t.allowed.includes(o.category)) why.push(`หมวด "${o.category}" ใช้ไม่ได้`);
  if (!Number.isInteger(o.minutes) || o.minutes < 5 || o.minutes > t.maxMinutes) why.push(`เวลา ${o.minutes} นาที อยู่นอกช่วง 5–${t.maxMinutes}`);
  if (!Number.isInteger(o.movement) || o.movement < 0 || o.movement > t.movementMax) why.push(`การเคลื่อนไหวระดับ ${o.movement} เกินที่อนุญาต (${t.movementMax})`);
  if (!Array.isArray(o.steps) || o.steps.length < 2 || o.steps.length > 5 || o.steps.some((s) => typeof s !== 'string' || !s.trim() || s.length > 80)) why.push('ขั้นตอนต้องมี 2–5 ข้อ ข้อละไม่เกิน 80 ตัวอักษร');
  if (typeof o.why !== 'string' || o.why.length > 120) why.push('เหตุผลยาวเกิน');
  if (!Array.isArray(o.items) || o.items.some((s) => typeof s !== 'string')) why.push('รายการของที่ใช้ผิดรูปแบบ');
  if (why.length) return why;
  const text = textOf(o);
  if (LINK_RE.test(text)) why.push('มีลิงก์ เบอร์โทร หรือบัญชีติดต่อ');
  for (const w of GLOBAL_BANNED) if (text.includes(w)) why.push(`มีคำต้องห้าม "${w}"`);
  for (const tag of t.tags) for (const w of BANNED[tag] || []) if (text.includes(w)) why.push(`ขัดเงื่อนไข ${tag}: "${w}"`);
  if (t.recentTitles.includes(o.title)) why.push('ซ้ำกับกิจกรรมล่าสุด');
  return why;
}

export function validateOptions(raw, t) {
  const valid = []; const rejected = [];
  const list = raw && Array.isArray(raw.options) ? raw.options : [];
  if (!list.length) rejected.push({ title: '(ทั้งหมด)', why: ['ไม่มีตัวเลือกในคำตอบ'] });
  for (const o of list) {
    const why = checkOption(o, t);
    if (!why.length && valid.some((v) => v.category === o.category)) why.push('หมวดซ้ำกับตัวเลือกก่อนหน้า');
    if (why.length) rejected.push({ title: o?.title ?? '(ไม่มีชื่อ)', why });
    else if (valid.length < 3) valid.push({ ...o, source: 'ai' });
  }
  return { valid, rejected };
}

export function fallbackOptions(t, n, taken = []) {
  const usedCats = new Set(taken.map((o) => o.category));
  const out = [];
  const pool = FALLBACK.map((o) => ({ ...o, minutes: Math.min(o.minutes, t.maxMinutes) }));
  pool.sort((a, b) => (t.liked.includes(b.category) ? 1 : 0) - (t.liked.includes(a.category) ? 1 : 0));
  for (const o of pool) {
    if (out.length >= n) break;
    if (usedCats.has(o.category)) continue;
    if (checkOption(o, t).length) continue;
    out.push({ ...o, source: 'fallback' }); usedCats.add(o.category);
  }
  // ถ้าชื่อซ้ำใน recentTitles จนเลือกไม่ครบ 3 ให้ผ่อนปรนเฉพาะกฎ recentTitles ในคลังสำรอง
  if (out.length < n) {
    const relaxed = { ...t, recentTitles: [] };
    for (const o of pool) {
      if (out.length >= n) break;
      if (usedCats.has(o.category)) continue;
      if (checkOption(o, relaxed).length) continue;
      out.push({ ...o, source: 'fallback' }); usedCats.add(o.category);
    }
  }
  return out;
}

export async function getHobbyOptions(t, callAI) {
  let valid = []; let rejected = []; let error = null;
  if (callAI) {
    for (let attempt = 0; attempt < 2 && valid.length < 3; attempt++) {
      try {
        const raw = await callAI({ prompt: buildPrompt(t), schema: RESPONSE_SCHEMA });
        const r = validateOptions(raw, t);
        for (const v of r.valid) if (valid.length < 3 && !valid.some((x) => x.category === v.category)) valid.push(v);
        rejected = rejected.concat(r.rejected);
      } catch (e) { error = String(e?.message || e); }
    }
  }
  if (valid.length < 3) valid = valid.concat(fallbackOptions(t, 3 - valid.length, valid));
  return { options: valid, rejected, error };
}

export function recordChoice(history = [], option, date) {
  return [...history, { category: option.category, title: option.title, date }].slice(-60);
}
