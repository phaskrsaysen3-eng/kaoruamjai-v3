// ก้าวรวมใจ — ฝั่งความเสี่ยง (Negative side) ฉบับตรวจแหล่งอ้างอิงแล้ว + เชื่อมโหมดพักฟื้น v3.1
//
// หลักการ (ต่างจากร่าง Gemini "Master Negative Blueprint V1.0" โดยตั้งใจ):
//   1. ไม่หักคะแนนค่าพลังจากโรค/อุปกรณ์/พฤติกรรม — ค่าพลังมาจาก "ผลทดสอบจริง" ซึ่งสะท้อนผลของโรคอยู่แล้ว
//      การหักซ้ำจากการวินิจฉัย = นับซ้ำ และตัวเลขหัก (-0.20, -1.80 …) ไม่มีงานวิจัยใดกำหนด
//   2. ความปลอดภัยทำด้วย "กฎ" 3 ชนิดเท่านั้น: ประตูวันนี้ (ไป/เบา/พัก/ฉุกเฉิน) · ตัด/ปรับท่า · ข้อความแนะนำ
//   3. ทุกกฎมี src · ถ้าเป็นค่าที่ทีมตั้งเอง ใส่ '[ออกแบบเอง]' ให้ผู้เชี่ยวชาญทบทวน
//   4. ทุกอย่างคำนวณในเครื่อง ไม่ส่งข้อมูลสุขภาพให้ AI

export const SRC = Object.freeze({
  parq: 'PAR-Q+ 2025: ป่วยชั่วคราว (หวัด มีไข้) ให้รอจนหาย · สุขภาพเปลี่ยนให้คัดกรองใหม่',
  nsca: 'NSCA Position Statement (Fragala 2019, J Strength Cond Res 33(8)): ความดัน > 180/110 = ข้อห้ามสัมบูรณ์ · > 160/100 = ข้อห้ามสัมพัทธ์ ต้องปรึกษาแพทย์ · หลีกเลี่ยงการกลั้นหายใจเบ่ง (Valsalva)',
  ada: 'ADA Position Statement (Colberg 2016, Diabetes Care 39:2065): น้ำตาลก่อนออกกำลังกาย < 90 มก./ดล. ให้กินคาร์โบไฮเดรต 15–30 ก. · ช่วงเหมาะ 90–250 · แผลที่เท้ายังไม่หาย งดท่าลงน้ำหนัก · จอตาเสื่อมรุนแรง งดออกแรงหนัก ก้มศีรษะต่ำ กลั้นหายใจ · ฝึกทรงตัว 2–3 ครั้ง/สัปดาห์',
  nice: 'NICE NG232 (2023): ศีรษะกระแทกขณะใช้ยาต้านการแข็งตัวของเลือด → ต้องได้รับการประเมินที่โรงพยาบาล (พิจารณาทำ CT)',
  wfg: 'World Guidelines for Falls Prevention (Montero-Odasso 2022): ผู้ที่เพิ่งล้มควรได้รับการประเมินปัจจัยเสี่ยงหลายด้าน',
  kdigo: 'KDIGO 2024 CKD Guideline: โรคไตระยะ 3–5 (ไม่ฟอกไต) แนะนำโปรตีน 0.8 ก./กก./วัน และไม่เกิน 1.3 · ผู้สูงอายุเปราะบาง/กล้ามเนื้อน้อยให้ทีมรักษาปรับเป็นรายคน',
  kdoqi: 'KDOQI 2020 Nutrition in CKD (Ikizler 2020): ระยะ 3–5 ไม่ฟอกไต 0.55–0.60 ก./กก.น้ำหนักมาตรฐาน/วัน ภายใต้การดูแลใกล้ชิด · ฟอกเลือด/ล้างไตทางช่องท้อง 1.0–1.2 ก./กก./วัน',
  frid: 'World Guidelines for Falls Prevention 2022 + EuGMS position paper 2023: ทบทวนยาเสี่ยงหกล้ม (FRIDs) ด้วยเครื่องมือมาตรฐาน เช่น STOPPFall และลดยาที่ไม่จำเป็น · กลุ่มยา: ยานอนหลับ/คลายกังวล ยาต้านซึมเศร้า ยาต้านโรคจิต ยาแก้ปวดกลุ่มโอปิออยด์ ยาแก้แพ้ ยาขับปัสสาวะ ยาลดความดันบางกลุ่ม',
  hypo: 'ADA (Standards of Care · เอกสารภาวะน้ำตาลต่ำ 2025): < 70 มก./ดล. = น้ำตาลต่ำระดับ 1 · กฎ 15-15 (คาร์โบไฮเดรตเร็ว 15 ก. วัดซ้ำใน 15 นาที)',
  rpe: 'ยาปิดกั้นเบต้า (beta-blocker) กดการเต้นของหัวใจขณะออกกำลังกาย จึงใช้ความรู้สึกเหนื่อย (Borg RPE) หรือการพูดแทนชีพจร (Mayo Clinic · ACSM)',
  pretest: 'ด่านก่อนทดสอบ ([ออกแบบเอง] จากข้อเสนอผู้ทรงคุณวุฒิ): กลุ่มเสี่ยงสูงตาม WFG 2022 และผู้เพิ่งผ่าตัด/นอน รพ. ทดสอบท่ายืนได้เมื่อมีผู้ช่วยที่ผ่านการสอน · ทดสอบทรงตัวต้องมีคนยืนข้าง (CDC STEADI)',
  ttf: 'Too Fit To Fracture (Giangregorio 2014): กระดูกพรุนหลีกเลี่ยงก้มตัวมากร่วมกับบิด และก้มยกของหนัก',
  otago: 'Otago: ขั้นต้นทำโดยจับที่จับ · หลังป่วยให้เริ่มอย่างระมัดระวัง',
  vivifrail: 'Vivifrail: ผู้ที่เดินไม่ได้หรือเปราะบางมาก ใช้โปรแกรมท่านั่ง',
  redflag: 'สัญญาณอันตรายทางคลินิก (ไม่ใช่การวินิจฉัย) — ส่งต่อบุคลากรสาธารณสุข',
  design: 'ค่า [ออกแบบเอง] — ต้องให้ผู้เชี่ยวชาญทบทวน',
});

/* ================================================================ 1) เช็กความพร้อมก่อนออกกำลังกายวันนี้ */
export const READINESS_QUESTIONS = Object.freeze([
  { id: 'unwell', text: 'วันนี้ไม่สบาย มีไข้ หรือเป็นหวัดไหม' },
  { id: 'chest', text: 'ตอนนั่งพักอยู่ เจ็บหรือแน่นหน้าอก เวียนหัว หรือหายใจไม่ทันไหม' },
  { id: 'newFall', text: 'ล้มตั้งแต่ครั้งก่อนที่ออกกำลังกายไหม' },
  { id: 'joint', text: 'มีข้อไหนบวม แดง ร้อน หรือปวดหลังรุนแรงขึ้นมาทันทีไหม' },
  { id: 'drunk', text: 'วันนี้ดื่มเหล้าแล้วยังมึนอยู่ไหม' },
]);
export const FOLLOW_UP = Object.freeze({
  headStrike: 'ตอนล้ม ศีรษะกระแทกไหม',
  confusion: 'มีอาการสับสน พูดไม่รู้เรื่อง หรือง่วงซึมผิดปกติไหม',
});

const LEVEL = { go: 0, light: 1, rest: 2, urgent: 3 };

/**
 * a = { unwell, chest, newFall, headStrike, confusion, joint, drunk, bpSys, bpDia, glucose, hyperSymptoms }
 * profile = { anticoagulant, diabetes, insulinOrSU, fasting, fdeia }
 * คืน { status: 'go'|'light'|'rest'|'urgent', block: [...], actions: [...], msgs: [{text, src}] }
 */
export function readinessCheck(a = {}, profile = {}) {
  let status = 'go';
  const block = new Set(), actions = new Set(), msgs = [];
  const raise = (s) => { if (LEVEL[s] > LEVEL[status]) status = s; };
  const say = (text, src) => msgs.push({ text, src });

  if (a.confusion) { raise('urgent'); actions.add('call1669'); say('สับสนหรือซึมผิดปกติแบบเกิดขึ้นใหม่ เป็นอาการที่ต้องพบแพทย์วันนี้ ถ้าเป็นมากโทร 1669', SRC.redflag); }
  if (a.chest) { raise('urgent'); actions.add('call1669'); say('มีอาการขณะพัก: งดออกกำลังกาย ถ้าเจ็บหน้าอกไม่หาย หายใจไม่ออก หรือหน้ามืด โทร 1669 ทันที', SRC.parq); }
  if (a.newFall) {
    if (a.headStrike && profile.anticoagulant) { raise('urgent'); actions.add('hospital_today'); say('ล้มศีรษะกระแทกและกินยาต้านการแข็งตัวของเลือด: ไปโรงพยาบาลวันนี้ แม้ตอนนี้ยังรู้สึกปกติ', SRC.nice); }
    else if (a.headStrike) { raise('rest'); say('ล้มศีรษะกระแทก: พักและให้คนอยู่ด้วย ถ้าปวดหัวมากขึ้น อาเจียน ซึม หรือสับสน ไปโรงพยาบาลทันที', SRC.redflag); }
    else raise('rest');
    actions.add('freeze_fall');
    say('เพิ่งล้ม: พักก่อน ให้ อสม. หรือ รพ.สต. ประเมินสาเหตุ แล้วกลับมาเมื่อได้รับอนุญาต (สแตกไม่ลด)', SRC.wfg);
  }
  if (a.unwell) { raise('rest'); say('ไม่สบายวันนี้: พักก่อน หายดีแล้วค่อยกลับมา', SRC.parq); }
  if (a.joint) { raise('rest'); say('ข้อบวมแดงร้อน หรือปวดหลังรุนแรงเฉียบพลัน: งดออกกำลังกายและไปพบแพทย์ (ห้ามฝืนนวดหรือออกแรงที่จุดนั้น)', SRC.redflag); }

  // ความดัน (ถ้าวัด)
  const s = Number(a.bpSys), d = Number(a.bpDia);
  if (Number.isFinite(s) && Number.isFinite(d) && s > 0 && d > 0) {
    if (s >= 180 || d >= 110) { raise('rest'); say(`ความดัน ${s}/${d}: งดออกกำลังกายวันนี้ นั่งพัก 5 นาทีแล้ววัดซ้ำ ถ้ายังสูง แจ้ง อสม./รพ.สต. · ถ้ามีปวดหัวรุนแรง เจ็บหน้าอก แขนขาอ่อนแรง โทร 1669`, `${SRC.nsca} · ใช้กับทุกกิจกรรมในแอปเพื่อความปลอดภัย (${SRC.design})`); }
    else if (s >= 160 || d >= 100) { raise('light'); block.add('STR'); say(`ความดัน ${s}/${d}: วันนี้งดท่ากล้ามเนื้อ เดินเบาๆ ได้ และควรปรึกษาแพทย์เรื่องการคุมความดัน`, SRC.nsca); }
  }
  // น้ำตาล (ถ้าวัด · เฉพาะผู้เป็นเบาหวาน)
  const g = Number(a.glucose);
  if (profile.diabetes && Number.isFinite(g) && g > 0) {
    if (g < 70) { raise('rest'); actions.add('carb_first'); say(`น้ำตาล ${g} มก./ดล. = ภาวะน้ำตาลต่ำ: กินคาร์โบไฮเดรตเร็ว 15 กรัม (เช่น น้ำผลไม้ครึ่งแก้ว) รอ 15 นาทีแล้ววัดซ้ำ ทำซ้ำจนกว่าจะเกิน 70 · วันนี้พัก`, `${SRC.hypo} · การพักทั้งวันเป็นค่า [ออกแบบเอง]`); }
    else if (g < 90 && profile.insulinOrSU) { actions.add('carb_first'); say(`น้ำตาล ${g} มก./ดล. และใช้อินซูลินหรือยากระตุ้นอินซูลิน: กินคาร์โบไฮเดรต 15–30 กรัมก่อนเริ่ม แล้ววัดซ้ำ`, SRC.ada); }
    else if (g < 90) { say(`น้ำตาล ${g} มก./ดล.: ถ้าไม่ได้ใช้อินซูลินหรือยากระตุ้นอินซูลิน ถือว่าอยู่ในเกณฑ์ ออกกำลังกายได้ มีของว่างไว้ใกล้ตัว`, SRC.ada); }
    else if (g > 250 && a.hyperSymptoms) { raise('rest'); say(`น้ำตาล ${g} มก./ดล. ร่วมกับคลื่นไส้ อาเจียน หรืออ่อนเพลียผิดปกติ: งดออกกำลังกาย ดื่มน้ำ และติดต่อเจ้าหน้าที่วันนี้`, SRC.ada); }
    else if (g > 250) { raise('light'); block.add('STR'); say(`น้ำตาล ${g} มก./ดล. สูงกว่าช่วงเหมาะ (90–250): วันนี้ทำเบาๆ ดื่มน้ำ ถ้าเริ่มคลื่นไส้ อาเจียน หรือเพลียผิดปกติ ให้หยุดแล้วติดต่อเจ้าหน้าที่`, `${SRC.ada} · การให้ "ทำเบา" เป็นค่า [ออกแบบเอง]`); }
  }
  if (a.drunk) { raise('light'); block.add('standing'); say('ยังมึนจากเหล้า: งดท่าทรงตัวและท่าเดินเร็ววันนี้ เสี่ยงล้ม', SRC.design); }
  if (profile.fdeia) say('แพ้อาหารร่วมกับการออกกำลังกาย: เว้นช่วงหลังกินอาหารที่แพ้ตามที่แพทย์กำหนด และพกยาที่แพทย์สั่ง', SRC.redflag);
  if (profile.fasting && (profile.diabetes || profile.kidney || profile.heart)) say('ถือศีลอดและมีโรคประจำตัว: แนะนำออกกำลังกายเบาๆ หลังละศีลอด และปรึกษาแพทย์เรื่องยา', SRC.design);
  if (profile.diabetes && profile.insulinOrSU && !Number.isFinite(g)) say('ใช้อินซูลินหรือยากระตุ้นอินซูลิน: มีของว่างหวานใกล้ตัว ถ้าใจสั่น เหงื่อแตก มือสั่น ให้หยุดแล้วกินทันที', SRC.ada);

  if (status === 'rest' || status === 'urgent') block.add('all');
  return { status, block: [...block], actions: [...actions], msgs };
}

/* ================================================================ 2) ปรับแผนท่าตามโรค อุปกรณ์ ผลวันนี้ และโหมดพักฟื้น */
const SEATED_OK = new Set(['knee_ext', 'arm_curl', 'band_row', 'seated_march']);

/**
 * profile = { conditions[], aids[], surgery[], meds[], doctorCleared }
 * recovery = state.progress.recovery (ถ้ากำลังฟื้นตัว จะบังคับ stageCap / holdSupport / disableWeights / Talk Test)
 */
export function planModifiers(profile = {}, readiness = null, recovery = null) {
  const c = new Set(profile.conditions || []), aids = new Set(profile.aids || []), surg = new Set(profile.surgery || []);
  const out = {
    seatedOnly: false,
    holdSupport: false,
    stageCap: null,
    disableWeights: false,
    inRecovery: false,
    recoveryTalkTest: false,
    blockStats: [],
    notes: {},
    warmupMods: {},
    warnings: [],
    advice: [],
  };
  const warn = (text, src) => out.warnings.push({ text, src });
  const advise = (text, src) => out.advice.push({ text, src });

  if (aids.has('wheelchair')) { out.seatedOnly = true; warn('ใช้รถเข็นเป็นหลัก → ท่านั่งเท่านั้น ท่าทรงตัวท่ายืนให้นักกายภาพสอนก่อน · ภารกิจเดินใช้ย่ำเท้าท่านั่งแทน', `${SRC.vivifrail} · ${SRC.design}`); }
  if (c.has('foot_ulcer')) { out.seatedOnly = true; warn('มีแผลที่เท้ายังไม่หาย → งดท่าลงน้ำหนักที่เท้า ทำท่านั่งจนแผลหาย · ภารกิจเดินใช้ย่ำเท้าท่านั่งแทน', SRC.ada); }
  if (aids.has('walker')) { out.holdSupport = true; warn('ใช้วอล์กเกอร์ → ท่ายืนทุกท่าจับโต๊ะหรือราวที่มั่นคง (ขั้น A)', SRC.otago); }
  if (aids.has('cane')) advise('ใช้ไม้เท้า → ฝึกทรงตัวข้างโต๊ะหรือเคาน์เตอร์ที่จับได้ทันที', SRC.otago);
  if (c.has('neuropathy')) { advise('เท้าชา → ตรวจเท้าทุกวันหลังเดิน ใส่รองเท้าหุ้มส้นที่พอดี ถ้าการเดินเปลี่ยน ให้เพิ่มท่านั่ง · ฝึกทรงตัวยังสำคัญ 2–3 ครั้ง/สัปดาห์', SRC.ada); out.holdSupport = true; }
  if (c.has('retinopathy')) { out.notes.all = 'ห้ามกลั้นหายใจ ห้ามก้มศีรษะต่ำกว่าเอว ไม่ออกแรงหนัก'; warn('เบาหวานขึ้นจอตา → งดท่าออกแรงหนัก ก้มศีรษะต่ำ และกลั้นหายใจ (ถามจักษุแพทย์ว่าระดับไหน)', SRC.ada); }
  if (c.has('hypertension') || c.has('heart') || surg.has('heart') || surg.has('abdomen')) out.notes.STR = 'หายใจออกตอนออกแรง ห้ามกลั้นหายใจเบ่ง';
  if (c.has('osteo')) { out.warmupMods['บิดลำตัวช้าๆ (มือเท้าเอว)'] = 'หลังตรง บิดเบาๆ ไม่สุดช่วง ไม่ก้มตัว'; advise('กระดูกพรุน → ไม่ก้มตัวมากร่วมกับบิด ไม่ก้มยกของหนัก หมุนตัวด้วยการก้าวเท้า', SRC.ttf); }
  if (c.has('dementia')) warn('สมองเสื่อม → ต้องทำกับผู้ดูแลทุกครั้ง', SRC.otago);
  if (surg.size && !profile.doctorCleared) warn('ผ่าตัดในรอบ 6 เดือน → ทำเฉพาะท่าที่แพทย์หรือนักกายภาพอนุญาต และทำตามข้อห้ามเฉพาะของการผ่าตัดนั้น (เช่น ข้อสะโพกเทียมขึ้นกับวิธีผ่าตัด)', SRC.parq);
  if (surg.has('heart')) advise('ผ่าตัดหัวใจ → ควรเข้าโปรแกรมฟื้นฟูหัวใจที่โรงพยาบาล ก่อนใช้ภารกิจในแอป', SRC.redflag);
  const meds = new Set(profile.meds || []);
  if (meds.has('polypharmacy') || meds.has('sedative') || meds.has('unknown')) advise('นำยาทุกตัว (รวมยาซื้อเองและสมุนไพร) ไปให้เภสัชกร รพ.สต. หรือแพทย์ทบทวน ยาบางกลุ่มเพิ่มความเสี่ยงหกล้มและลดได้', SRC.frid);
  if (meds.has('sedative')) { out.holdSupport = true; warn('กินยาที่ทำให้ง่วงหรือมึน → ท่ายืนทุกท่าจับที่จับ และไม่ฝึกทรงตัวช่วงที่ยาออกฤทธิ์ง่วง', `${SRC.frid} · การจับที่จับเป็นค่า [ออกแบบเอง]`); }
  if (meds.has('bp_diuretic')) advise('กินยาลดความดันหรือยาขับปัสสาวะ → ลุกจากนอนหรือนั่งช้าๆ นั่งพักที่ขอบเตียงก่อนยืน ถ้าหน้ามืดให้นั่งลงทันที', `${SRC.frid} · ${SRC.design}`);
  if (c.has('heart') || meds.has('bp_diuretic')) advise('คุมความหนักด้วยการพูด: เดินแล้วยังพูดเป็นประโยคได้ แต่ร้องเพลงไม่ได้ · ไม่ใช้ชีพจรเป็นเกณฑ์', SRC.rpe);
  if (c.has('dialysis')) advise('ฟอกไตหรือล้างไตทางช่องท้อง → ต้องการโปรตีนมากกว่าโรคไตระยะก่อนฟอก (แนวทางให้ประมาณ 1.0–1.2 กรัม/กก./วัน) ห้ามใช้คำแนะนำโปรตีนต่ำ ให้ทีมไตเทียมกำหนด', SRC.kdoqi);
  else if (c.has('kidney')) advise('ไตเรื้อรัง (ไม่ฟอกไต) → อย่าทำตามสูตร "โปรตีนสูง" ทั่วไป แต่ก็อย่าลดเองจนต่ำเกิน แนวทางยังให้ตัวเลขต่างกัน (KDIGO 2024 ประมาณ 0.8 กรัม/กก./วัน · KDOQI 2020 0.55–0.60 ภายใต้นักกำหนดอาหาร) แอปจึงไม่กำหนดตัวเลขให้ ทำตามทีมรักษาโรคไต', `${SRC.kdigo} · ${SRC.kdoqi}`);
  if (c.has('dysphagia')) advise('กลืนลำบาก → ความข้นของอาหารและน้ำให้นักกำหนดอาหารหรือนักแก้ไขการพูดกำหนด (มาตรฐาน IDDSI) แอปไม่ปรับอาหารเอง', SRC.redflag);

  // โหมดพักฟื้น v3.1: คุมทั้งขั้นท่า (Stage Cap) + จับที่จับ + งดถุงทรายข้อเท้า + ผ่อนปรนการเดินเป็น Talk Test [ออกแบบเอง]
  if (recovery) {
    out.inRecovery = true;
    out.recoveryTalkTest = true;
    if (recovery.stageCap) out.stageCap = recovery.stageCap;
    if (recovery.holdSupport || recovery.stageCap === 'A') out.holdSupport = true;
    if (recovery.disableWeights !== false) out.disableWeights = true;
    warn(
      recovery.stageCap === 'A'
        ? 'อยู่ในโหมดฟื้นตัว → จำกัดท่าทุกหมวดไว้ที่ขั้น A (จับที่จับ) และงดถ่วงน้ำหนักเพื่อให้ร่างกายค่อยๆ ปรับตัว'
        : `อยู่ในโหมดฟื้นตัว → จำกัดความยากของท่าสูงสุดไม่เกินขั้น ${recovery.stageCap || 'C'} และงดถ่วงน้ำหนักในสัปดาห์นี้`,
      `${SRC.otago} · ${SRC.design}`,
    );
    advise('ช่วงฟื้นตัวไม่ต้องฝืนเดินเร็ว: ใช้การจับเวลาเดินร่วมกับการทดสอบด้วยการพูด (ยังพูดเป็นประโยคได้แต่ร้องเพลงไม่ได้ · Borg 12–14)', `${SRC.rpe} · ${SRC.design}`);
  }

  if (readiness) {
    if (readiness.block.includes('all')) out.blockStats = ['STR', 'STA', 'AGI', 'BAL'];
    else {
      if (readiness.block.includes('STR')) out.blockStats.push('STR');
      if (readiness.block.includes('standing')) out.blockStats.push('AGI', 'BAL');
    }
  }
  if (out.seatedOnly) out.blockStats = [...new Set([...out.blockStats, 'AGI', 'BAL'])];
  return out;
}
export const SEATED_EXERCISES = SEATED_OK;

/* ================================================================ 3) ด่านก่อนทดสอบร่างกาย (Pre-test safety gate) */
export function pretestGate(p = {}, today = {}) {
  const aids = new Set(p.aids || []), c = new Set(p.conditions || []), surg = new Set(p.surgery || []);
  const parqYes = (p.parq || []).some(Boolean);
  if (parqYes && !(p.parqFollowUp === 'all_no' || (p.parqFollowUp === 'any_yes' && p.doctorCleared === true))) {
    return { status: 'no_physical', canTest: false, standing: false, high: [], reasons: [{ text: 'PAR-Q+ ยังไม่ผ่าน → ยังไม่ทดสอบร่างกาย ปรึกษาผู้เชี่ยวชาญก่อน', src: SRC.parq }] };
  }
  const r = readinessCheck({ unwell: today.unwell, chest: today.chest, bpSys: today.bpSys, bpDia: today.bpDia }, {});
  if (r.status === 'rest' || r.status === 'urgent' || r.block.includes('STR')) {
    return { status: 'postpone', canTest: false, standing: false, high: [], reasons: [...r.msgs, { text: 'เลื่อนการทดสอบไปวันที่พร้อม', src: SRC.design }] };
  }
  const high = [];
  if (aids.has('wheelchair')) high.push('ใช้รถเข็น');
  if (aids.has('walker')) high.push('ใช้วอล์กเกอร์');
  if (p.falls >= 2) high.push('ล้ม 2 ครั้งขึ้นไปใน 12 เดือน');
  if (p.fallInjury) high.push('ล้มจนบาดเจ็บ');
  if (p.unableToGetUp) high.push('ล้มแล้วลุกเองไม่ได้');
  if (p.syncope) high.push('เคยหมดสติ');
  if (c.has('dementia')) high.push('สมองเสื่อม');
  if (c.has('foot_ulcer')) high.push('แผลที่เท้า');
  // [ออกแบบเอง] ผู้เพิ่งผ่าตัดในรอบ 6 เดือน หรือเพิ่งออกจากโรงพยาบาล ต้องมีผู้ช่วยยืนข้างตัวตอนทดสอบท่ายืนครั้งแรก
  if (surg.size > 0 || p.postHospital === true) high.push('เพิ่งผ่าตัดหรือนอนโรงพยาบาล');

  const standing = !aids.has('wheelchair') && !c.has('foot_ulcer');
  if (high.length && today.helper !== true) {
    return { status: 'helper_required', canTest: false, standing, high, reasons: [{ text: `${high.join(' · ')} → ทดสอบได้เมื่อมีผู้ช่วยที่ผ่านการสอน (อสม. ผู้วิจัย หรือนักกายภาพ) อยู่ข้างตัว ระหว่างนี้เริ่มระดับ 1 แบบปลอดภัย`, src: SRC.pretest }] };
  }
  const reasons = [];
  if (!standing) reasons.push({ text: 'ทดสอบเฉพาะท่าที่ทำจากเก้าอี้ ไม่ทดสอบท่ายืนและเดิน', src: SRC.pretest });
  reasons.push({ text: 'ท่าทรงตัว ย่ำเท้า และเดิน ต้องมีคนยืนข้างเสมอ', src: SRC.pretest });
  return { status: 'ok', canTest: true, standing, high, reasons };
}
