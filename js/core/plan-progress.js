// ก้าวรวมใจ — ความต่อเนื่องรายสัปดาห์ · วันพักกล้ามเนื้อ · โหมดพักฟื้น v3.1 (Privacy-First) · ทดสอบซ้ำ
// หลัก: ระบบเกมห้ามลงโทษคนป่วย และห้ามเร่งให้ฝืน · ความยากของท่าเปลี่ยนจาก "ผลทดสอบซ้ำ" เท่านั้น ไม่ใช่จากแต้ม
// ทุกค่าที่เป็นตัวเลขมีป้าย src: ถ้าเป็นค่า [ออกแบบเอง] ระบุไว้ชัดเจนเพื่อรอผู้เชี่ยวชาญทบทวน
// ขอบเขตความเป็นส่วนตัว (PDPA ม.26): ด่านยืนยันการอนุญาตใช้แบบสอบถามยืนยันด้วยตนเอง (boolean) เท่านั้น ไม่เก็บใบรับรองแพทย์หรือเอกสารใดๆ

const DAY = 86400000;
const d = (s) => Date.parse(`${s}T00:00:00Z`);
export const daysBetween = (a, b) => Math.round((d(b) - d(a)) / DAY);
export const addDays = (s, n) => new Date(d(s) + n * DAY).toISOString().slice(0, 10);

const STAGE_ORDER = Object.freeze(['A', 'B', 'C', 'D']);

function stepDownStage(stage) {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx <= 0) return 'A';
  return STAGE_ORDER[Math.min(2, idx - 1)]; // โซน 1 ลดลง 1 ขั้น และสูงสุดไม่เกินขั้น C [ออกแบบเอง]
}

export function stepUpStageCap(cap) {
  if (!cap) return null;
  const idx = STAGE_ORDER.indexOf(cap);
  if (idx < 0 || idx >= 2) return null; // C → ปลดล็อก (null)
  return STAGE_ORDER[idx + 1];
}

/* ------------------------------------------------------------ 1) ความต่อเนื่องรายสัปดาห์ (สแตก) */
export const STACK = Object.freeze({
  max: 12,          // [ออกแบบเอง] 12 สัปดาห์ ≈ ระยะของโปรแกรมฝึกส่วนใหญ่ในงานวิจัย (เช่น Otago ช่วงแรก)
  activeDays: 3,    // ICFSR 2021: ฝึกแรงต้าน 2–3 วัน/สัปดาห์ · Otago: ทรงตัว-กล้ามเนื้อ 3 ครั้ง/สัปดาห์
  src: 'ความถี่ 3 วัน/สัปดาห์อิง Otago และ ICFSR 2021 · กติกาบวก/คงที่/ลด/สัปดาห์เปลี่ยนผ่านเป็นค่า [ออกแบบเอง]',
});

/**
 * อัปเดตสแตกเมื่อจบหนึ่งสัปดาห์
 * week = { activeDays: 0–7, frozen?: boolean, transition?: boolean }
 * - ≥ 3 วัน → +1 · 1–2 วัน → คงเดิม · 0 วัน → −1 · 0 วันซ้ำสัปดาห์ที่สอง → −2
 * - สัปดาห์ที่กดหยุดเพราะป่วย หรือสัปดาห์เปลี่ยนผ่าน (transition) → สแตกห้ามลด (ไม่ลงโทษคนป่วย)
 */
export function updateStack(state = { stack: 0, zeroWeeks: 0 }, week) {
  const n = Math.max(0, Math.min(7, week?.activeDays | 0));
  const s = { stack: state.stack | 0, zeroWeeks: state.zeroWeeks | 0 };
  if (week?.frozen) return { ...s, delta: 0, reason: 'หยุดพักเพราะป่วย สแตกไม่ลด' };
  if (n >= STACK.activeDays) return { stack: Math.min(STACK.max, s.stack + 1), zeroWeeks: 0, delta: s.stack < STACK.max ? 1 : 0, reason: `ทำครบ ${n} วัน` };
  if (week?.transition) return { ...s, zeroWeeks: 0, delta: 0, reason: 'สัปดาห์เปลี่ยนผ่านหลังพักฟื้น สแตกไม่ลด' };
  if (n > 0) return { ...s, zeroWeeks: 0, delta: 0, reason: `ทำ ${n} วัน (ครบ ${STACK.activeDays} วันจึงได้เพิ่ม) สแตกคงเดิม` };
  const drop = s.zeroWeeks >= 1 ? 2 : 1;
  const stack = Math.max(0, s.stack - drop);
  return { stack, zeroWeeks: s.zeroWeeks + 1, delta: stack - s.stack, reason: drop === 2 ? 'ไม่ได้ทำ 2 สัปดาห์ติดกัน' : 'สัปดาห์นี้ไม่ได้ทำ' };
}

/* ------------------------------------------------------------ 2) วันพักกล้ามเนื้อ */
export const STRENGTH_REST = Object.freeze({
  maxPerWeek: 3,
  recoveryWeek1Max: 2, // [ออกแบบเอง] สัปดาห์แรกช่วงฟื้นตัว จำกัด 2 วัน/สัปดาห์แบบไม่ติดกัน (ยังอยู่ในเกณฑ์ ACSM/AHA ≥ 2 วัน)
  src: 'ACSM/AHA 2007 (Nelson 2007): ฝึกกล้ามเนื้อ ≥ 2 วัน/สัปดาห์ แบบไม่ติดกัน · ICFSR 2021: 2–3 วัน/สัปดาห์ · เพดานฟื้นตัวสัปดาห์แรก = [ออกแบบเอง]',
});

/**
 * วันนี้ฝึกท่ากล้ามเนื้อ (STR) ได้ไหม — strengthDates = วันที่ที่ฝึก STR แล้ว ('YYYY-MM-DD')
 * opts = { inRecoveryWeek1?: boolean }
 * ท่าทรงตัวและเดินไม่ถูกจำกัด (Too Fit To Fracture: ฝึกทรงตัวได้ทุกวัน)
 */
export function canDoStrength(strengthDates = [], today, opts = {}) {
  const past = [...new Set(strengthDates)].filter((x) => daysBetween(x, today) >= 0);
  if (past.includes(today)) return { ok: false, reason: 'วันนี้ฝึกกล้ามเนื้อแล้ว', next: addDays(today, 2) };
  if (past.some((x) => daysBetween(x, today) === 1)) return { ok: false, reason: 'เมื่อวานฝึกกล้ามเนื้อแล้ว วันนี้พักกล้ามเนื้อ ทำท่าทรงตัวหรือเดินแทนได้', next: addDays(today, 1) };
  const week = past.filter((x) => daysBetween(x, today) <= 6).length;
  const limit = opts?.inRecoveryWeek1 ? STRENGTH_REST.recoveryWeek1Max : STRENGTH_REST.maxPerWeek;
  if (week >= limit) {
    return {
      ok: false,
      reason: opts?.inRecoveryWeek1
        ? `สัปดาห์แรกของการฟื้นตัว ฝึกกล้ามเนื้อครบ ${limit} ครั้งแล้ว พักกล้ามเนื้อและทำท่าทรงตัวหรือเดินเบาๆ แทนได้`
        : `7 วันที่ผ่านมาฝึกกล้ามเนื้อครบ ${limit} ครั้งแล้ว`,
      next: null,
    };
  }
  return { ok: true, reason: '' };
}

/* ------------------------------------------------------------ 3) โหมดพักฟื้น v3.1 (5 สถานะไม่ทับซ้อน) */
export const FREEZE_REASONS = Object.freeze({
  sick: { label: 'ไม่สบาย เป็นหวัด มีไข้', needDoctor: false, severe: false, priority: 1 },
  pain: { label: 'ปวดหรือบาดเจ็บ', needDoctor: false, severe: false, priority: 2 },
  fall: { label: 'หกล้ม', needDoctor: true, severe: true, priority: 3 },
  hospital: { label: 'นอนโรงพยาบาล', needDoctor: true, severe: true, priority: 4 },
  surgery: { label: 'ผ่าตัด', needDoctor: true, severe: true, priority: 5 },
  other: { label: 'เหตุผลอื่น', needDoctor: false, severe: false, priority: 1 },
});

export const RETURN_RULES = Object.freeze({
  shortDays: 7,           // [ออกแบบเอง] หยุด 1–6 วัน (ป่วยทั่วไป) → โซน 1
  longDays: 28,           // [ออกแบบเอง] หยุด ≥ 28 วัน (หรือ fall/hospital/surgery) → โซน 3 (ปรับตัวแล้วทดสอบซ้ำ)
  painEscalationDays: 7,  // [ออกแบบเอง] ปวดต่อเนื่อง ≥ 7 วัน → ยกระดับคำแนะนำปรึกษา อสม./รพ.สต./แพทย์
  absenceDays: 7,         // [ออกแบบเอง] หายไปเงียบๆ ≥ 7 วัน → ชวนทำ Retroactive Freeze คืนสแตก
  recoveryActiveDays: 2,  // [ออกแบบเอง] ต้องลงมือฝึกจริง ≥ 2 วัน/สัปดาห์ก่อนขยับระดับฟื้นตัว
  stallAlertWeeks: 2,     // [ออกแบบเอง] ชะงักเพราะเหนื่อย/ไม่สบาย ≥ 2 สัปดาห์ติด → แนะนำปรึกษา อสม. หรือทดสอบใหม่
  unwellPromptDays: 3,    // [ออกแบบเอง] เช็กความพร้อมตอบไม่สบาย/ข้อบวม 3 วันติด → ชวนกดพัก
  zone3AdaptWeeks: 1,     // [ออกแบบเอง] โซน 3 ปรับตัวที่ Tier 1 ขั้น A อย่างน้อย 1 สัปดาห์ดีๆ แล้วแนะนำทดสอบซ้ำ
  src: 'PAR-Q+ 2025 (ป่วยให้รอจนหาย/คัดกรองใหม่) · WHO 2020 (เริ่มน้อยค่อยเพิ่ม) · WFG 2022 · STOPPFall · Otago · ERAS 2020 · ตัวเลขวันและขั้นบันไดทั้งหมดเป็นค่า [ออกแบบเอง]',
});

/** สถานะปัจจุบันแบบไม่ทับซ้อนกัน (Mutually Exclusive FSM) */
export function recoveryStatus(state = {}) {
  if (state?.freeze) return state.waitingClearance ? 'WAITING_CLEARANCE' : 'FROZEN';
  if (state?.recovery) return 'RECOVERING';
  return 'ACTIVE';
}

/**
 * กดหยุดพัก — ไม่จำกัดจำนวนวัน · ล้าง recovery เสมอเพื่อไม่ให้สถานะตีกัน
 * หากกำลังพักอยู่แล้วสามารถอัปเกรดเหตุผลเบา (เช่น sick) เป็นเหตุผลหนัก (fall/hospital/surgery) โดยคงวันที่เริ่มหยุดเดิม
 */
export function startFreeze(state = {}, { date, reason, retroactive = false }) {
  if (!FREEZE_REASONS[reason]) throw new Error(`ไม่รู้จักเหตุผล "${reason}"`);
  const info = FREEZE_REASONS[reason];
  if (state.freeze) {
    const f = state.freeze;
    const prevReasons = Array.isArray(f.reasons) ? f.reasons : [f.reason];
    const reasons = prevReasons.includes(reason) ? prevReasons : [...prevReasons, reason];
    const curPriority = FREEZE_REASONS[f.reason]?.priority ?? 0;
    const nextReason = info.priority >= curPriority ? reason : f.reason;
    const needDoctor = !!(f.needDoctor || FREEZE_REASONS[f.reason]?.needDoctor || info.needDoctor);
    const since = date && f.since && daysBetween(date, f.since) > 0 ? date : f.since;
    return {
      ...state,
      recovery: null,
      waitingClearance: false,
      freeze: { ...f, since, reason: nextReason, reasons, needDoctor, retroactive: !!(f.retroactive || retroactive) },
    };
  }
  const tierBefore = state.tier !== undefined && state.tier !== null ? state.tier : 1;
  return {
    ...state,
    recovery: null,
    waitingClearance: false,
    freeze: { since: date, reason, reasons: [reason], needDoctor: info.needDoctor, tierBefore, retroactive: !!retroactive },
  };
}

/** อัปเกรดเหตุผลระหว่างพักฟื้น (คงวันที่เริ่มพักเดิม และยกระดับ needDoctor อัตโนมัติ) */
export function upgradeFreezeReason(state, { reason, date }) {
  return startFreeze(state, { reason, date: date || state?.freeze?.since });
}

/** [ออกแบบเอง] ตรวจจับการหายไปเงียบๆ ≥ 7 วันโดยไม่ได้กดพัก เพื่อชวนทำ Retroactive Freeze */
export function detectAbsence(lastActiveDate, today, { frozen = false } = {}) {
  if (frozen || !lastActiveDate || !today) return { absent: false, days: 0, message: '' };
  const days = Math.max(0, daysBetween(lastActiveDate, today));
  if (days < RETURN_RULES.absenceDays) return { absent: false, days, message: '' };
  return {
    absent: true,
    days,
    message: `ไม่เจอกัน ${days} วัน สบายดีไหมคะ? ช่วงที่ผ่านมาหยุดเพราะไม่สบาย ปวด หรือหกล้มหรือเปล่าคะ?`,
  };
}

/** [ออกแบบเอง] เปิด Retroactive Freeze คืนสแตกที่อาจถูกหักไปให้คงเดิม (หลักคิดข้อ 6: ไม่ลงโทษคนป่วย) */
export function applyRetroactiveFreeze(state = {}, { since, reason = 'sick', restoreStack = null }) {
  const restored = restoreStack !== null && Number.isFinite(restoreStack)
    ? Math.max(state.stack | 0, restoreStack | 0)
    : (state.stack | 0);
  return startFreeze({ ...state, stack: restored, zeroWeeks: 0 }, { date: since, reason, retroactive: true });
}

/** [ออกแบบเอง] เช็กว่าตอบไม่สบายหรือข้อบวมติดกัน ≥ 3 วันในหน้าเช็กความพร้อมรายวันหรือไม่ เพื่อชวนกดพัก */
export function shouldPromptFreeze(unwellDates = [], today) {
  if (!Array.isArray(unwellDates) || !today) return { suggest: false, days: 0, message: '' };
  const set = new Set(unwellDates);
  let streak = 0;
  for (let i = 0; i < RETURN_RULES.unwellPromptDays; i++) {
    if (set.has(addDays(today, -i))) streak += 1;
    else break;
  }
  return streak >= RETURN_RULES.unwellPromptDays
    ? { suggest: true, days: streak, message: `ไม่สบายหรือปวดข้อติดกัน ${streak} วันแล้ว พักฟื้นก่อนไหมคะ? สแตกไม่ลด และไม่ทำให้คะแนนก๊วนตกค่ะ` }
    : { suggest: false, days: streak, message: '' };
}

/**
 * ประตูขากลับมาตรฐาน Transition of Care (endFreeze v3.1 — Privacy-First)
 * ด่านที่ 1: PAR-Q+ หน้า 1 ใหม่ทุกครั้ง (และหน้า 2–3 หากมีข้อ "ใช่")
 * ด่านที่ 2: แบบสอบถามยืนยันด้วยตนเอง (doctorCleared boolean เท่านั้น — ไม่มีใบรับรองแพทย์/บัตรส่งต่อ)
 * ด่านที่ 3: ทบทวนยา อุปกรณ์ การล้ม การผ่าตัดใหม่ (คืนธง needMedAidReview) + ซิงก์เพดานความเสี่ยง (currentSafetyCap) + รักษาสิทธิ์ Tier 0
 * ด่านที่ 4: เกณฑ์แบ่ง 3 โซนความยาวการหยุด (1–6 วัน / 7–27 วัน / ≥ 28 วัน หรือเคสหนัก) คุมทั้ง Tier และ Stage Cap
 */
export function endFreeze(state, { date, screen, currentSafetyCap = 4, currentStage = null, medAidReviewed = false } = {}) {
  const f = state?.freeze;
  if (!f) return { state, result: 'not_frozen' };
  const parq = screen?.parq;
  if (!Array.isArray(parq) || parq.length !== 7) {
    return { state, result: 'need_parq', message: 'ตอบแบบคัดกรองสุขภาพ (PAR-Q+) ใหม่ก่อนกลับมาออกกำลังกายค่ะ' };
  }

  const days = Math.max(0, daysBetween(f.since, date));
  const reasons = Array.isArray(f.reasons) && f.reasons.length ? f.reasons : [f.reason];
  const anyYes = parq.some(Boolean);
  const need = !!(f.needDoctor || reasons.some((r) => FREEZE_REASONS[r]?.needDoctor));
  const chronicPain = reasons.includes('pain') && days >= RETURN_RULES.painEscalationDays;
  const needMedAidReview = need || days >= RETURN_RULES.shortDays;
  const painAdvice = chronicPain ? 'อาการปวดต่อเนื่องเกิน 7 วัน แนะนำให้ อสม./รพ.สต. หรือแพทย์ช่วยประเมินก่อนกลับมาออกแรงนะคะ' : null;

  // ด่านที่ 2: แบบสอบถามยืนยันด้วยตนเอง (ไม่ขอใบรับรองแพทย์) · หากยังไม่ได้รับอนุญาต → WAITING_CLEARANCE ล็อกระดับ 0 (ท่านั่ง)
  if (need && screen.doctorCleared !== true) {
    const waiting = { ...state, waitingClearance: true, tier: 0, recovery: null };
    return {
      state: waiting,
      result: 'need_doctor',
      effectiveTier: 0,
      waitingClearance: true,
      days,
      needMedAidReview,
      chronicPain,
      painAdvice,
      message: `${FREEZE_REASONS[f.reason].label}: เพื่อความปลอดภัย ลองสอบถามคุณหมอ นักกายภาพ หรือเจ้าหน้าที่ รพ.สต. ก่อนกลับมาออกแรงนะคะ ระหว่างนี้ทำท่าบริหารท่านั่งเบาๆ (ระดับ 0) ได้ค่ะ`,
    };
  }
  if (anyYes && screen.parqFollowUp !== 'all_no' && screen.doctorCleared !== true) {
    const isConsult = screen.parqFollowUp === 'any_yes';
    const waiting = isConsult ? { ...state, waitingClearance: true, tier: 0, recovery: null } : state;
    return {
      state: waiting,
      result: isConsult ? 'consult' : 'need_followup',
      effectiveTier: 0,
      waitingClearance: isConsult,
      days,
      needMedAidReview,
      chronicPain,
      painAdvice,
      message: isConsult
        ? 'PAR-Q+ มีข้อที่ควรปรึกษาผู้เชี่ยวชาญก่อนค่ะ ระหว่างนี้ระบบเปิดเฉพาะท่านั่งเบาๆ (ระดับ 0) ให้ก่อนนะคะ'
        : 'ตอบ PAR-Q+ หน้า 2–3 ให้ครบก่อนกลับมาออกกำลังกายนะคะ',
    };
  }

  // ด่านที่ 3: แก้บั๊ก Tier 0 ห้ามดีดขึ้น Tier 1 + ซิงก์เพดานความเสี่ยงล่าสุด (WFG / STEADI / PAR-Q+)
  const cap = Math.max(0, Math.min(4, Number.isFinite(currentSafetyCap) ? currentSafetyCap : 4));
  const tierBefore = Math.max(0, Math.min(4, f.tierBefore ?? 1));
  if (tierBefore === 0 || cap === 0) {
    const next = { ...state, freeze: null, waitingClearance: false, tier: 0, recovery: null, transitionWeek: true };
    return {
      state: next,
      result: 'resumed',
      days,
      zone: 0,
      startTier: 0,
      effectiveTarget: 0,
      needMedAidReview,
      medAidReviewed,
      chronicPain,
      painAdvice,
      requireRetest: false,
      message: `หยุดไป ${days} วัน กลับมาทำท่านั่งเบาๆ ที่ระดับ 0 อย่างปลอดภัยค่ะ`,
    };
  }

  const effectiveTarget = Math.min(tierBefore, cap);

  // ด่านที่ 4: แบ่ง 3 โซนความยาวการหยุด (3-Zone Physiological Return Protocol) [ออกแบบเอง]
  let zone;
  let startTier;
  let recovery;
  let requireRetest = false;
  let message;

  if (days >= RETURN_RULES.longDays || need) {
    // โซน 3: หยุดยาว ≥ 28 วัน หรือเคสหนัก (fall/hospital/surgery) หลังยืนยันว่าได้รับอนุญาตแล้ว
    zone = 3;
    startTier = 1;
    requireRetest = true;
    recovery = {
      zone: 3,
      since: date,
      startTier: 1,
      targetTier: 1,
      originalTarget: effectiveTarget,
      goodWeeks: 0,
      stallWeeks: 0,
      stageCap: 'A',
      holdSupport: true,
      disableWeights: true,
      week1: true,
      requireRetest: true,
      adaptWeeks: RETURN_RULES.zone3AdaptWeeks,
    };
    message = `หยุดไป ${days} วัน เริ่มปรับตัวเบาๆ ที่ระดับ 1 ขั้น A (จับที่จับ) 1 สัปดาห์ แล้วค่อยทำแบบทดสอบร่างกายใหม่ให้พอดีกับสภาพปัจจุบันค่ะ`;
  } else if (days >= RETURN_RULES.shortDays) {
    // โซน 2: หยุดกลาง 7–27 วัน (ป่วย/ปวดทั่วไป)
    zone = 2;
    startTier = 1;
    recovery = {
      zone: 2,
      since: date,
      startTier: 1,
      targetTier: effectiveTarget,
      goodWeeks: 0,
      stallWeeks: 0,
      stageCap: 'A',
      holdSupport: true,
      disableWeights: true,
      week1: true,
      requireRetest: false,
    };
    message = effectiveTarget > 1
      ? `หยุดไป ${days} วัน เริ่มที่ระดับ 1 ขั้น A (จับที่จับ) แล้วค่อยขยับสัปดาห์ละ 1 ระดับจนถึงระดับ ${effectiveTarget} ค่ะ`
      : `หยุดไป ${days} วัน เริ่มปรับตัวที่ระดับ 1 ขั้น A (จับที่จับ) ในสัปดาห์แรกค่ะ`;
  } else {
    // โซน 1: หยุดสั้น 1–6 วัน (ป่วยทั่วไป)
    zone = 1;
    startTier = Math.max(1, effectiveTarget - 1);
    const stageCap = currentStage ? stepDownStage(currentStage) : 'C';
    recovery = {
      zone: 1,
      since: date,
      startTier,
      targetTier: effectiveTarget,
      goodWeeks: 0,
      stallWeeks: 0,
      stageCap,
      holdSupport: stageCap === 'A',
      disableWeights: true,
      week1: true,
      requireRetest: false,
    };
    message = startTier < effectiveTarget
      ? `หยุดไป ${days} วัน เริ่มที่ระดับ ${startTier} (ลดความยากท่าลง 1 ขั้นในสัปดาห์แรก) แล้วค่อยกลับสู่ระดับ ${effectiveTarget} ค่ะ`
      : `หยุดไป ${days} วัน กลับมาที่ระดับ ${effectiveTarget} โดยเริ่มเบาๆ งดถ่วงน้ำหนักในสัปดาห์แรกค่ะ`;
  }

  const next = { ...state, freeze: null, waitingClearance: false, tier: startTier, recovery, transitionWeek: true, needRetest: false };
  return {
    state: next,
    result: 'resumed',
    days,
    zone,
    startTier,
    effectiveTarget,
    needMedAidReview,
    medAidReviewed,
    chronicPain,
    painAdvice,
    requireRetest,
    message,
  };
}

/**
 * จบสัปดาห์ในโหมดฟื้นตัว — Dual-Axis Ramp-up (Tier + Stage) + Relapse & Stall Guard
 * week = { activeDays: number, tiredDays: number, unwell: boolean, newFall?: boolean, urgent?: boolean, date?: string }
 */
export function recoveryWeek(state, week = {}) {
  const r = state?.recovery;
  if (!r) return { state, changed: false };

  // ตรวจจับการล้มซ้ำหรืออาการฉุกเฉินระหว่างฟื้นตัว (Auto-Relapse Guard)
  if (week?.newFall || week?.urgent) {
    const reason = week.newFall ? 'fall' : 'hospital';
    const frozen = startFreeze(state, { date: week.date || r.since, reason });
    return {
      state: frozen,
      changed: true,
      relapsed: true,
      emergency: !!week.urgent,
      message: week.urgent
        ? 'หยุดออกกำลังกายทันทีนะคะ ถ้าเจ็บหน้าอก หายใจไม่ทัน หรือหน้ามืด โทร 1669 หรือไปโรงพยาบาลวันนี้เลยค่ะ'
        : 'พบการหกล้มระหว่างฟื้นตัว ระบบพักแผนให้อัตโนมัติ (สแตกไม่ลด) เพื่อความปลอดภัยค่ะ',
    };
  }

  const unwell = !!week?.unwell;
  const tiredDays = week?.tiredDays | 0;
  const activeDays = week?.activeDays | 0;

  // ต้องผ่านครบ 3 เงื่อนไข: ไม่ป่วย + เหนื่อย < 2 วัน + ลงมือฝึกจริง ≥ 2 วัน [ออกแบบเอง]
  if (unwell || tiredDays >= 2 || activeDays < RETURN_RULES.recoveryActiveDays) {
    const fatigued = unwell || tiredDays >= 2;
    const stallWeeks = fatigued ? (r.stallWeeks | 0) + 1 : (r.stallWeeks | 0);
    const suggestConsult = stallWeeks >= RETURN_RULES.stallAlertWeeks;
    const nextRec = { ...r, stallWeeks, week1: false };
    let message = 'สัปดาห์นี้ร่างกายกำลังปรับตัว คงระดับเบาๆ แบบนี้ต่ออีกสัปดาห์นะคะ ทำเท่าที่ไหวก็เก่งมากแล้วค่ะ';
    if (suggestConsult) {
      message = 'ช่วงนี้ดูเหมือนร่างกายยังเหนื่อยง่าย ลองคุยกับ อสม./รพ.สต. หรือทดสอบร่างกายใหม่แบบมีคนช่วย เพื่อปรับแผนให้พอดีกับท่านนะคะ';
    } else if (!fatigued && activeDays < RETURN_RULES.recoveryActiveDays) {
      message = `สัปดาห์นี้ฝึกไป ${activeDays} วัน (ต้องฝึกอย่างน้อย ${RETURN_RULES.recoveryActiveDays} วันก่อนขยับระดับ) คงระดับเดิมไว้ก่อน ไม่ลดสแตกค่ะ`;
    }
    return { state: { ...state, recovery: nextRec }, changed: false, stallWeeks, suggestConsult, message };
  }

  // โซน 3 (หยุดยาว / เคสหนัก): ปรับตัวครบแล้ว → ชวนทดสอบร่างกายใหม่ (ไม่ไต่ทะลุระดับเดิมอัตโนมัติ)
  if (r.zone === 3 || r.requireRetest) {
    const goodWeeks = (r.goodWeeks | 0) + 1;
    if (goodWeeks >= (r.adaptWeeks || RETURN_RULES.zone3AdaptWeeks)) {
      return {
        state: { ...state, tier: r.targetTier, recovery: null, needRetest: true },
        changed: true,
        retest: true,
        requireRetest: true,
        message: 'ปรับตัวช่วงพักฟื้นที่ระดับ 1 ครบแล้ว แนะนำทำแบบทดสอบร่างกายใหม่เพื่อจัดระดับจากสภาพร่างกายปัจจุบันค่ะ',
      };
    }
    return {
      state: { ...state, recovery: { ...r, goodWeeks, stallWeeks: 0, week1: false } },
      changed: true,
      retest: false,
      message: 'ปรับตัวได้ดีมากค่ะ คงระดับ 1 ขั้น A ต่ออีก 1 สัปดาห์แล้วค่อยทดสอบร่างกายใหม่นะคะ',
    };
  }

  // โซน 1 และ โซน 2: ขยับระดับ + คลายเพดานขั้นท่าทีละขั้น
  const curTier = state.tier ?? r.startTier;
  const tier = Math.min(r.targetTier, curTier + 1);
  const nextStageCap = r.zone === 1 ? null : stepUpStageCap(r.stageCap);
  const done = tier >= r.targetTier && (r.zone === 1 || nextStageCap === null || curTier >= r.targetTier);
  return {
    state: {
      ...state,
      tier,
      recovery: done
        ? null
        : {
            ...r,
            goodWeeks: (r.goodWeeks | 0) + 1,
            stallWeeks: 0,
            stageCap: nextStageCap,
            holdSupport: nextStageCap === 'A',
            disableWeights: nextStageCap === 'A',
            week1: false,
          },
    },
    changed: true,
    retest: done,
    message: done
      ? `กลับมาถึงระดับ ${tier} และปลดล็อกขั้นท่าเรียบร้อยแล้ว ทดสอบร่างกายใหม่ได้เพื่อดูความก้าวหน้าค่ะ`
      : `เยี่ยมมากค่ะ ขยับขึ้นเป็นระดับ ${tier}${nextStageCap ? ` (ขั้นท่าสูงสุดไม่เกินขั้น ${nextStageCap})` : ''}`,
  };
}

/* ------------------------------------------------------------ 4) ทดสอบซ้ำ */
export const RETEST_DAYS = 28; // [ออกแบบเอง] ทุก 4 สัปดาห์ (งานวิจัยส่วนใหญ่วัดผลที่ 8–12 สัปดาห์ จึงถือเป็นการติดตาม)
export function retestDue(lastTestDate, today) {
  if (!lastTestDate) return { due: true, inDays: 0 };
  const left = RETEST_DAYS - daysBetween(lastTestDate, today);
  return { due: left <= 0, inDays: Math.max(0, left) };
}
