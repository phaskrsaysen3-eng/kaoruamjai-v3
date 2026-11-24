// ก้าวรวมใจ — หน้าจอสุขภาพ: แบบประเมิน · แผนท่าวันนี้ · โหมดพักฟื้น v3.1 (Privacy-First) · ท้องฟ้าใจ + 2Q
// ทุกการคำนวณอยู่ใน core/*.js ที่มีเทสต์ · ด่านที่ 2 ใช้แบบสอบถามยืนยันด้วยตนเองเท่านั้น (ไม่มีใบรับรองแพทย์ ตาม PDPA ม.26)
import { todayKey } from './store.js';
import { assess, STAY_INDEPENDENT, CONDITIONS, SURGERY, AIDS, MEDS, TIERS, PLAN, validateInput } from './core/assess.js';
import { readinessCheck, planModifiers, pretestGate, READINESS_QUESTIONS, FOLLOW_UP } from './core/safety.js';
import { bodyStats, STAT_DEFS, addTraining, trainingWeek, TRAIN, compareRetest, mindStat, socialStat } from './core/stats.js';
import { exercisePlan, STAGE_TEXT, STAGE_BY_LEVEL } from './core/exercises.js';
import {
  updateStack, STACK, canDoStrength, startFreeze, upgradeFreezeReason, endFreeze, recoveryWeek, retestDue,
  FREEZE_REASONS, RETURN_RULES, recoveryStatus, detectAbsence, applyRetroactiveFreeze, shouldPromptFreeze,
  daysBetween, addDays,
} from './core/plan-progress.js';
import { SKY, addMood, moodPrompt, TWO_Q, score2Q, familyNotice, HELP } from './core/mood.js';
import { XP_PER_MISSION } from './core/score.js';
import { PARQ, PARQ_NOTE, PARQ_SRC, TESTS, BAL_STAGES, STOP_SIGNS } from './questions.js';
import { ic, radar, esc, confetti } from './ui.js';

let ctx;            // { S(), commit(), render(), toast(), sheet(), setSpeech() }
let W = null;       // แบบประเมินที่กำลังกรอก
let R = null;       // หน้ากลับมาหลังหยุดพัก
let Q2 = null;      // คำตอบ 2Q ที่กำลังกรอก
let RD = null;      // เช็กความพร้อมวันนี้ที่กำลังกรอก
export function initHealth(c) { ctx = c; }

const S = () => ctx.S();
const TYPE_OF = { STR: 'strength', STA: 'walk', AGI: 'agility', BAL: 'balance' };
const STEP_NAMES = ['ยินยอม', 'ข้อมูลพื้นฐาน', 'คัดกรองสุขภาพ', 'ความเสี่ยงหกล้ม', 'โรคประจำตัว', 'ทดสอบร่างกาย', 'ผล'];

/* ================================================================ สถานะที่คำนวณจากข้อมูล */
export function currentAssessment() {
  const a = S().assessment;
  if (!a) return null;
  const result = assess(a.input);
  const stats = a.input.test ? bodyStats({ age: a.input.age, sex: a.input.sex }, a.input.test) : {};
  return { ...a, result, stats };
}

/** ระดับที่ใช้จริงวันนี้: หยุดพักหรือรอการยืนยัน → 0 (ท่านั่ง) · โหมดฟื้นตัว → ระดับขั้นบันได · ปกติ → ผลประเมิน */
export function effectiveTier() {
  const s = S(), a = currentAssessment();
  if (s.progress.freeze || s.progress.waitingClearance) return 0;
  if (s.progress.recovery) return s.progress.tier;
  if (s.progress.needRetest) return Math.min(s.progress.tier ?? 1, a?.result?.tier ?? 1);
  return a?.result?.tier ?? s.progress.tier ?? 1;
}

export function isRecoveryWalkMode() {
  const s = S(), a = currentAssessment();
  const aids = a?.input?.aids || [];
  return !!s.progress.recovery || aids.includes('cane') || aids.includes('walker');
}

export function isSeatedOnlyMode() {
  const s = S(), a = currentAssessment();
  if (effectiveTier() === 0) return true;
  const aids = a?.input?.aids || [];
  const conds = a?.input?.conditions || [];
  return aids.includes('wheelchair') || conds.includes('foot_ulcer');
}

function syncGoals() {
  const s = S(), t = TIERS[effectiveTier()];
  s.user.dailyGoal = t.daily; s.user.weeklyGoal = t.weekly;
  const me = s.team.members.find((m) => m.me);
  if (me) {
    me.goal = t.weekly;
    me.frozen = !!(s.progress.freeze || s.progress.waitingClearance);
  }
}

export function markActive(date = todayKey()) {
  const s = S();
  if (!s.activeDates.includes(date)) s.activeDates.push(date);
  s.activeDates = s.activeDates.filter((d) => daysBetween(d, date) <= 60);
  s.lastActiveDate = date;
}

export function logFeeling(f) {
  const s = S();
  s.feelLog = [...(s.feelLog || []), { date: todayKey(), f }].slice(-60);
}

/** คำนวณเพดานความปลอดภัยปัจจุบัน (0–4) จากผลประเมินล่าสุด */
function currentSafetyCapOf(input) {
  const r = assess(input);
  if (r.status !== 'ok') return 0;
  if (r.tier === 0) return 0;
  if (Array.isArray(r.caps) && r.caps.length) return Math.min(...r.caps.map((c) => c.max));
  return 4;
}

/** หาขั้นท่าสูงสุดปัจจุบันของผู้ใช้จากค่าพลัง (ใช้ลด 1 ขั้นในโซน 1) */
function highestStageOf(stats) {
  const levels = ['STR', 'STA', 'AGI', 'BAL'].map((k) => stats?.[k]?.level).filter(Number.isFinite);
  if (!levels.length) return 'A';
  return STAGE_BY_LEVEL(Math.max(...levels));
}

/** ปิดสัปดาห์ที่ผ่านไปแล้ว (เรียกตอนเปิดแอป · มี loop guard ป้องกันเครื่องตั้งเวลาข้ามปี) */
export function rollWeeks(today = todayKey()) {
  const s = S(), p = s.progress;
  const notes = [];
  let guard = 0;
  while (daysBetween(p.weekStart, today) >= 7 && guard < 52) {
    guard += 1;
    const end = addDays(p.weekStart, 6);
    const inWeek = (d) => daysBetween(p.weekStart, d) >= 0 && daysBetween(d, end) >= 0;
    const activeDays = new Set((s.activeDates || []).filter(inWeek)).size;
    const wasTransition = !!p.transitionWeek;
    const r = updateStack(p, { activeDays, frozen: !!(p.freeze || p.waitingClearance), transition: wasTransition });
    p.stack = r.stack; p.zeroWeeks = r.zeroWeeks;
    p.transitionWeek = false;
    if (p.recovery && !p.freeze) {
      const tiredDays = (s.feelLog || []).filter((e) => e.f === 'tired' && inWeek(e.date)).length;
      const unwell = (s.unwellDates || []).some(inWeek);
      const rw = recoveryWeek(p, { activeDays, tiredDays, unwell, date: end });
      Object.assign(p, rw.state);
      if (rw.message) notes.push(rw.message);
    }
    notes.push(`สัปดาห์ที่แล้ว: ${r.reason}`);
    p.weekStart = addDays(p.weekStart, 7);
  }
  if (notes.length) syncGoals();
  return notes;
}

export function demoEndWeek(activeDays, opts = {}) {
  const s = S(), p = s.progress;
  const r = updateStack(p, { activeDays, frozen: !!(p.freeze || p.waitingClearance), transition: !!p.transitionWeek });
  p.stack = r.stack; p.zeroWeeks = r.zeroWeeks;
  p.transitionWeek = false;
  let extra = '';
  if (p.recovery && !p.freeze) {
    const rw = recoveryWeek(p, { activeDays, tiredDays: opts.tiredDays ?? 0, unwell: !!opts.unwell, date: todayKey() });
    Object.assign(p, rw.state);
    extra = rw.message ? ` · ${rw.message}` : '';
  }
  syncGoals(); ctx.commit();
  return `${r.reason} → สแตก ${p.stack}${extra}`;
}

/** การ์ดตรวจจับการหายไปเงียบๆ ≥ 7 วัน (Silent Absence → Retroactive Freeze) */
export function absenceBanner() {
  const s = S();
  const today = todayKey();
  if (s.progress.freeze || s.absenceDismissedDate === today) return '';
  const ab = detectAbsence(s.lastActiveDate, today, { frozen: !!s.progress.freeze });
  if (!ab.absent) return '';
  return `<div class="card stack-v" style="background:linear-gradient(135deg,#EFF6FF,#FFFFFF);border:2px solid #93C5FD" role="region" aria-label="เช็กอินหลังหายไปหลายวัน">
    <div class="row" style="gap:10px">${ic('heart', 26, '#2563EB')}<b class="h" style="font-size:1.18rem;color:var(--skyd)">ยินดีต้อนรับกลับมาค่ะ!</b></div>
    <p style="margin:0">${esc(ab.message)}</p>
    <div class="grid2">
      <button class="btn blue sm" data-h="retroFreeze">ใช่ พักรักษาตัว</button>
      <button class="btn ghost sm" data-h="dismissAbsence">ไม่ใช่ แค่ยุ่ง</button>
    </div>
    <small class="sub">ถ้าตอบ "ใช่" ระบบจะบันทึกพักฟื้นย้อนหลัง คืนสแตกให้คงเดิม และพาตรวจความพร้อมก่อนเริ่มใหม่ค่ะ</small>
  </div>`;
}

/* ================================================================ ชิ้นส่วนหน้าจอ */
const top = (title, back = 'today') => `<div class="top"><button class="round plain" data-go="${back}" aria-label="ย้อนกลับ">${ic('back', 24)}</button><h1 class="h title" style="flex:1">${title}</h1><button class="round" data-act="speak" aria-label="ฟังเสียงอ่านหน้านี้">${ic('speaker', 26)}</button></div>`;
const yn = (key, val, label) => `<div class="qrow"><div class="qtext">${label}</div><div class="yn" role="group">
  <button data-yn="${key}" data-v="1" aria-pressed="${val === true}">ใช่</button><button data-yn="${key}" data-v="0" aria-pressed="${val === false}">ไม่ใช่</button></div></div>`;
const num = (key, val, label, unit, attrs = '') => `<label class="field"><span>${label}</span><span class="numwrap"><input type="number" inputmode="decimal" data-f="${key}" value="${val ?? ''}" ${attrs}><em>${unit}</em></span></label>`;
const srcChip = (t) => `<span class="src">${esc(t)}</span>`;
function set(obj, path, v) { const ks = path.split('.'); const last = ks.pop(); const o = ks.reduce((a, k) => (a[k] ??= /^\d+$/.test(k) ? [] : {}), obj); o[last] = v; }

export function statItems(stats) {
  return STAT_DEFS.filter((d) => d.group === 'body').map((d) => ({ id: d.id, name: d.name, level: stats?.[d.id]?.level ?? null }));
}

const chips = (list, dict, sel, prefix = '') => `<div class="chips">${Object.entries(dict).map(([k, c]) => `<button data-chip="${prefix}${list}:${k}" aria-pressed="${(sel || []).includes(k)}">${esc(c.label)}</button>`).join('')}</div>`;

/* ================================================================ 1) แบบประเมิน */
function newWizard() {
  const prev = S().assessment?.input;
  return {
    step: 0, err: '',
    input: {
      consent: prev?.consent ?? false, age: prev?.age ?? null, sex: prev?.sex ?? null,
      heightCm: prev?.heightCm ?? null, weightKg: prev?.weightKg ?? null, activityMin: prev?.activityMin ?? null,
      parq: Array(7).fill(null), parqFollowUp: null, doctorCleared: false,
      stayIndependent: Array(12).fill(null), falls: 0, fallInjury: false, unableToGetUp: false, syncope: null,
      conditions: [...(prev?.conditions || [])], surgery: [...(prev?.surgery || [])], aids: [...(prev?.aids || [])], meds: [...(prev?.meds || [])],
      postHospital: !!(prev?.postHospital),
      gate: { unwell: null, chest: null, bpSys: null, bpDia: null, helper: false, skip: false },
      test: { chairStand: null, usedArms: false, armCurl: null, armStdWeight: true, step2min: null, upGoSec: null, balanceSecs: [null, null, null, null], gait4mSec: null },
    },
  };
}
export function startCheck() { W = newWizard(); }

function checkStep(i) {
  const p = W.input;
  if (i === 0 && !p.consent) return 'ต้องยินยอมก่อนจึงจะไปต่อได้';
  if (i === 1) {
    const e = validateInput({ ...p, parq: Array(7).fill(false), stayIndependent: Array(12).fill(false), falls: 0, test: undefined }).filter((x) => /อายุ|เพศ|ส่วนสูง|น้ำหนัก|นาที/.test(x));
    if (e.length) return e[0];
    if (p.age < 60) return 'แอปนี้ออกแบบและตั้งเกณฑ์สำหรับอายุ 60 ปีขึ้นไป';
  }
  if (i === 2) {
    if (p.parq.some((x) => x === null)) return 'ตอบให้ครบ 7 ข้อ';
    if (p.parq.some(Boolean) && !p.parqFollowUp) return 'มีข้อที่ตอบ "ใช่" → เลือกผลหน้า 2–3';
  }
  if (i === 3) {
    if (p.stayIndependent.some((x) => x === null)) return 'ตอบให้ครบ 12 ข้อ';
    if (p.syncope === null) return 'ตอบข้อหมดสติ';
  }
  if (i === 5) {
    if (p.gate.unwell === null || p.gate.chest === null) return 'ตอบคำถามก่อนทดสอบ 2 ข้อก่อน';
    if (!gateNow().canTest) return p.gate.skip ? '' : 'วันนี้ยังทดสอบไม่ได้ กด "เริ่มระดับ 1 โดยยังไม่ทดสอบ" หรือรอให้มีผู้ช่วย';
    const c = p.test.chairStand;
    if (!Number.isInteger(c) || c < 0 || c > 60) return 'ใส่จำนวนลุก-นั่ง (จำนวนเต็ม 0–60)';
  }
  return '';
}

function gateNow() {
  const p = W.input;
  return pretestGate({ ...p, falls: p.stayIndependent[0] ? Math.max(1, p.falls) : 0 }, p.gate);
}

function finalInput() {
  const g = gateNow();
  const p = structuredClone(W.input);
  delete p.gate;
  p.falls = p.stayIndependent[0] ? Math.max(1, p.falls) : 0;
  if (!p.parq.some(Boolean) || p.parqFollowUp === 'pending') p.parqFollowUp = null;
  if (!g.canTest) {
    p.test = { skipped: true, skipReason: g.reasons[0]?.text.split(' → ')[0] || 'ยังไม่ผ่านด่านก่อนทดสอบ' };
    return p;
  }
  const t = p.test, out = { chairStand: t.chairStand, usedArms: t.usedArms };
  if (Number.isInteger(t.armCurl)) Object.assign(out, { armCurl: t.armCurl, armStdWeight: t.armStdWeight });
  if (Number.isFinite(t.step2min)) out.step2min = t.step2min;
  if (Number.isFinite(t.upGoSec)) out.upGoSec = t.upGoSec;
  if (t.balanceSecs.every(Number.isFinite)) out.balanceSecs = t.balanceSecs;
  if (Number.isFinite(t.gait4mSec)) out.gait4mSec = t.gait4mSec;
  if (!g.standing) { delete out.step2min; delete out.upGoSec; delete out.balanceSecs; delete out.gait4mSec; }
  p.test = out;
  return p;
}

export function viewCheck() {
  if (!W) startCheck();
  const p = W.input, st = W.step;
  const bar = `<div class="wiz-steps" aria-label="ขั้นที่ ${st + 1} จาก ${STEP_NAMES.length}">${STEP_NAMES.map((n, i) => `<i class="${i < st ? 'done' : i === st ? 'on' : ''}" title="${n}"></i>`).join('')}</div>
    <div class="sub">ขั้นที่ ${st + 1}/${STEP_NAMES.length} · ${STEP_NAMES[st]}</div>`;
  let body = '';
  ctx.setSpeech(`แบบประเมิน ขั้นที่ ${st + 1} ${STEP_NAMES[st]}`);
  if (st === 0) {
    body = `<div class="card stack-v"><b class="h">ก่อนเริ่ม</b>
      <p>แบบประเมินนี้ใช้เลือกระดับภารกิจที่ปลอดภัยสำหรับท่าน มี 3 ส่วน คือ คัดกรองสุขภาพ ความเสี่ยงหกล้ม และทดสอบร่างกายง่ายๆ ใช้เวลาประมาณ 15–20 นาที</p>
      <ul class="list"><li>ควรมีลูกหลานหรือ อสม. อยู่ด้วย โดยเฉพาะตอนทดสอบการทรงตัว</li><li>ข้อมูลเก็บในเครื่องนี้ ใช้เพื่อจัดภารกิจเท่านั้น ไม่ส่งข้อมูลสุขภาพให้ AI (PDPA มาตรา 26)</li><li>ก้าวรวมใจไม่ใช่เครื่องมือแพทย์ และไม่ได้วินิจฉัยโรค</li></ul>
      <label class="tickbox"><input type="checkbox" data-f="consent" ${p.consent ? 'checked' : ''}><span>ข้าพเจ้าเข้าใจและยินยอมให้เก็บข้อมูลนี้</span></label></div>`;
  } else if (st === 1) {
    body = `<div class="card stack-v">${num('age', p.age, 'อายุ', 'ปี', 'min="60" max="110"')}
      <div class="field"><span>เพศ <small class="sub">(ใช้เลือกตารางเกณฑ์มาตรฐาน)</small></span><div class="seg"><button data-pick="sex" data-val="F" aria-pressed="${p.sex === 'F'}">หญิง</button><button data-pick="sex" data-val="M" aria-pressed="${p.sex === 'M'}">ชาย</button></div></div>
      ${num('heightCm', p.heightCm, 'ส่วนสูง', 'ซม.')}${num('weightKg', p.weightKg, 'น้ำหนัก', 'กก.')}
      ${num('activityMin', p.activityMin, 'สัปดาห์ที่ผ่านมา เดินเร็วหรือทำกิจกรรมที่ออกแรงจนหายใจแรงขึ้น รวมกี่นาที', 'นาที')}</div>`;
  } else if (st === 2) {
    const anyYes = p.parq.some(Boolean);
    body = `<div class="note"><b>ข้อความภาษาไทยฉบับชั่วคราว รอฉบับแปลทางการ</b><br>${esc(PARQ_NOTE)}</div><div class="card">${PARQ.map((q, i) => yn(`parq.${i}`, p.parq[i], `<b>${i + 1}.</b> ${esc(q.th)}${q.hint ? `<br><small class="sub">${esc(q.hint)}</small>` : ''}<details><summary>ต้นฉบับ</summary><small lang="en">${esc(q.en)}</small></details>`)).join('')}
      <div class="sub" style="font-size:.9rem;margin-top:6px">${esc(PARQ_SRC)}</div></div>
      ${anyYes ? `<div class="card stack-v"><b class="h">มีข้อที่ตอบ "ใช่" → ต้องทำ PAR-Q+ หน้า 2–3 ต่อ</b>
        <p class="sub">หน้า 2–3 มีคำถามติดตามตามโรค ให้ผู้ช่วยถามจากแบบฟอร์มกระดาษฉบับทางการ แล้วเลือกผลที่นี่</p>
        <div class="seg col">${[['all_no', 'หน้า 2–3 ตอบ "ไม่ใช่" ทุกข้อ'], ['any_yes', 'หน้า 2–3 มีข้อที่ตอบ "ใช่"'], ['pending', 'ยังไม่ได้ทำ']].map(([v, t]) => `<button data-pick="parqFollowUp" data-val="${v}" aria-pressed="${p.parqFollowUp === v}">${t}</button>`).join('')}</div>
        ${p.parqFollowUp === 'any_yes' ? `<label class="tickbox"><input type="checkbox" data-f="doctorCleared" ${p.doctorCleared ? 'checked' : ''}><span>สอบถามแพทย์หรือผู้เชี่ยวชาญแล้ว และได้รับอนุญาตให้ออกกำลังกาย (ยืนยันด้วยตนเอง ไม่ต้องใช้เอกสาร)</span></label>` : ''}</div>` : ''}`;
  } else if (st === 3) {
    body = `<div class="note">ข้อความไทยต้องเปลี่ยนเป็นฉบับที่ผ่านการตรวจความตรงแล้ว (Loonlawong 2019) ก่อนใช้จริง</div>
      <div class="card">${STAY_INDEPENDENT.map((q, i) => yn(`stayIndependent.${i}`, p.stayIndependent[i], `${esc(q.text)} <small class="sub">(${q.pts} คะแนน)</small>`)).join('')}</div>
      ${p.stayIndependent[0] ? `<div class="card stack-v"><b class="h">รายละเอียดการล้มใน 12 เดือน</b>
        <div class="seg"><button data-pick="falls" data-val="1" aria-pressed="${p.falls <= 1}">1 ครั้ง</button><button data-pick="falls" data-val="2" aria-pressed="${p.falls >= 2}">2 ครั้งขึ้นไป</button></div>
        ${yn('fallInjury', p.fallInjury, 'ล้มแล้วบาดเจ็บจนต้องไปรักษา')}${yn('unableToGetUp', p.unableToGetUp, 'ล้มแล้วลุกเองไม่ได้ (นอนอยู่นานกว่า 1 ชั่วโมง)')}</div>` : ''}
      <div class="card">${yn('syncope', p.syncope, 'ใน 12 เดือนที่ผ่านมา เคยหมดสติหรือเกือบหมดสติไหม')}</div>
      <div class="sub" style="font-size:.9rem">CDC STEADI Stay Independent · World Falls Guidelines 2022</div>`;
  } else if (st === 4) {
    body = `<div class="card stack-v"><b class="h">แพทย์เคยบอกว่าเป็นโรคเหล่านี้ไหม</b><p class="sub">เลือกได้หลายข้อ หรือข้ามได้ ใช้เพื่อเพิ่มข้อควรระวังในภารกิจ ไม่ได้ใช้คำนวณระดับ</p>
      ${chips('conditions', CONDITIONS, p.conditions)}</div>
      <div class="card stack-v"><b class="h">ยาที่กินประจำ</b><p class="sub">ใช้เตือนเรื่องความปลอดภัย เช่น ล้มศีรษะกระแทกขณะกินยาต้านการแข็งตัวของเลือด</p>${chips('meds', MEDS, p.meds)}</div>
      <div class="card stack-v"><b class="h">อุปกรณ์ที่ใช้</b><p class="sub">รถเข็น = ภารกิจท่านั่ง · วอล์กเกอร์ = ท่ายืนจับที่จับ</p>${chips('aids', AIDS, p.aids)}</div>
      <div class="card stack-v"><b class="h">ผ่าตัดในรอบ 6 เดือน</b>${chips('surgery', SURGERY, p.surgery)}
        ${p.surgery.length ? `<label class="tickbox"><input type="checkbox" data-f="doctorCleared" ${p.doctorCleared ? 'checked' : ''}><span>สอบถามแพทย์หรือนักกายภาพแล้ว และได้รับอนุญาตให้ออกกำลังกาย (ยืนยันด้วยตนเอง)</span></label>` : ''}</div>`;
  } else if (st === 5) {
    const t = p.test, gt = p.gate;
    const how = (k) => `<details><summary>วิธีทดสอบ</summary><p>${esc(TESTS[k].how)}</p><small class="sub">${esc(TESTS[k].src)}</small></details>`;
    const answered = gt.unwell !== null && gt.chest !== null;
    const g = answered ? gateNow() : null;
    const gateCard = `<div class="card"><b class="h">ก่อนทดสอบ: ปลอดภัยไหมวันนี้</b>
      ${yn('gate.unwell', gt.unwell, 'วันนี้ไม่สบาย มีไข้ หรือเหนื่อยผิดปกติไหม')}${yn('gate.chest', gt.chest, 'ตอนนั่งพัก เจ็บหน้าอก เวียนหัว หรือหายใจไม่ทันไหม')}
      <details><summary>วัดความดันแล้ว (ไม่บังคับ)</summary><div class="grid2" style="margin-top:8px">${num('gate.bpSys', gt.bpSys, 'ตัวบน', 'มม.ปรอท')}${num('gate.bpDia', gt.bpDia, 'ตัวล่าง', 'มม.ปรอท')}</div></details>
      ${g && g.high.length ? `<label class="tickbox" style="margin-top:10px"><input type="checkbox" data-f="gate.helper" ${gt.helper ? 'checked' : ''}><span>มีผู้ช่วยที่ผ่านการสอน (อสม. ผู้วิจัย หรือนักกายภาพ) อยู่ข้างตัวตลอดการทดสอบ</span></label>` : ''}
      ${answered ? `<button class="btn ghost sm" data-h="gatecheck" style="margin-top:10px">ตรวจอีกครั้งหลังกรอกความดัน</button>` : ''}</div>`;
    if (!answered || !g.canTest) {
      body = gateCard + (g ? `<div class="note warn stack-v"><b>${g.status === 'postpone' ? 'เลื่อนการทดสอบ' : g.status === 'no_physical' ? 'ยังไม่ทดสอบร่างกาย' : 'ต้องมีผู้ช่วยก่อนทดสอบ'}</b><ul class="list">${g.reasons.map((r) => `<li>${esc(r.text)}</li>`).join('')}</ul></div>
        <button class="btn ghost sm" data-h="skiptest">เริ่มระดับ 1 โดยยังไม่ทดสอบ</button>` : '');
    } else {
      body = gateCard + `${g.reasons.map((r) => `<div class="note">${esc(r.text)}</div>`).join('')}<div class="note warn">${esc(STOP_SIGNS)}</div>
      <div class="card stack-v"><b class="h">${TESTS.chairStand.name} <span class="pill req">จำเป็น</span></b>${how('chairStand')}
        ${num('test.chairStand', t.chairStand, 'ทำได้', 'ครั้ง', 'min="0" max="60" step="1"')}
        <label class="tickbox"><input type="checkbox" data-f="test.usedArms" ${t.usedArms ? 'checked' : ''}><span>ต้องใช้มือดันจึงลุกได้ (บันทึกเป็น 0)</span></label></div>
      <div class="sub">ข้อต่อไปไม่บังคับ แต่ทำให้ได้ค่าพลังครบ 4 ค่า</div>
      <div class="card stack-v"><b class="h">${TESTS.armCurl.name}</b>${how('armCurl')}${num('test.armCurl', t.armCurl, 'ทำได้', 'ครั้ง', 'min="0" max="60" step="1"')}
        <label class="tickbox"><input type="checkbox" data-f="test.armStdWeight" ${t.armStdWeight ? 'checked' : ''}><span>ใช้ดัมเบลน้ำหนักมาตรฐาน</span></label></div>
      ${g.standing ? `<div class="card stack-v"><b class="h">${TESTS.step2min.name}</b>${how('step2min')}${num('test.step2min', t.step2min, 'ทำได้', 'ครั้ง')}</div>
      <div class="card stack-v"><b class="h">${TESTS.upGoSec.name}</b>${how('upGoSec')}${num('test.upGoSec', t.upGoSec, 'เวลาดีที่สุด', 'วินาที', 'step="0.1"')}</div>
      <div class="card stack-v"><b class="h">${TESTS.balanceSecs.name}</b>${how('balanceSecs')}
        <div class="grid2">${BAL_STAGES.map((n, i) => num(`test.balanceSecs.${i}`, t.balanceSecs[i], `${i + 1}. ${n}`, 'วิ', 'min="0" max="10" step="0.1"')).join('')}</div>
        <small class="sub">ท่าที่ไม่ได้ทำเพราะท่าก่อนหน้าไม่ถึง 10 วิ ใส่ 0</small></div>
      <div class="card stack-v"><b class="h">${TESTS.gait4mSec.name}</b>${how('gait4mSec')}${num('test.gait4mSec', t.gait4mSec, 'เวลา', 'วินาที', 'step="0.1"')}</div>` : '<div class="note">ไม่ทดสอบท่ายืนและเดิน</div>'}`;
    }
  } else {
    return viewCheckResult();
  }
  return `<section class="view">${top('แบบประเมิน', 'me')}${bar}${body}
    ${W.err ? `<div class="note warn" role="alert">${esc(W.err)}</div>` : ''}
    <div class="grid2" style="grid-template-columns:1fr 1.6fr;margin-top:auto">
      <button class="btn ghost sm" data-h="prev" ${st === 0 ? 'disabled' : ''}>ย้อนกลับ</button>
      <button class="btn go sm" data-h="next">${st === 5 ? 'ดูผล' : 'ถัดไป'}</button></div></section>`;
}

function viewCheckResult() {
  const s = S();
  const input = finalInput();
  const r = assess(input);
  if (r.status === 'invalid') return `<section class="view">${top('ผลประเมิน', 'me')}<div class="note warn">${r.errors.map(esc).join('<br>')}</div><button class="btn ghost sm" data-h="prev">แก้ไข</button></section>`;
  const stats = bodyStats({ age: input.age, sex: input.sex }, input.test);
  const prev = s.prevStats || (s.assessment?.input?.test ? bodyStats({ age: s.assessment.input.age, sex: s.assessment.input.sex }, s.assessment.input.test) : null);
  const cmp = prev && Object.keys(stats).length ? compareRetest(prev, stats) : null;
  const t = TIERS[r.tier];
  ctx.setSpeech(`ผลประเมิน ระดับ ${r.tier} ${t.name} ภารกิจวันละ ${t.daily} นาที ${r.message || ''}`);
  return `<section class="view">${top('ผลประเมิน', 'me')}
    <div class="card tierbox"><div class="tiernum">${r.tier}</div><div><div class="sub">ระดับภารกิจ</div><div class="h" style="font-size:1.4rem">${t.name}</div><div>วันละ ${t.daily} นาที · สัปดาห์ละ ${t.weekly} นาที</div></div></div>
    ${r.message && (r.tier < (r.tierByTest ?? r.tier) || r.tier === 0) ? `<div class="note warn">${esc(r.message)}</div>` : ''}
    ${r.untested ? `<div class="note">${esc(r.message)}</div>` : ''}
    ${r.tier > 0 ? `<div class="card" style="text-align:center">${radar(statItems(stats))}<div class="sub" style="font-size:.9rem">เลเวล 4–7 = ช่วงปกติของวัยและเพศเดียวกัน (Rikli & Jones) · BAL ใช้ CDC STEADI</div></div>` : ''}
    ${cmp && Object.keys(cmp).length ? `<div class="card stack-v"><b class="h">เทียบกับผลทดสอบครั้งก่อน</b>
      <div class="stack-v">${Object.entries(cmp).map(([id, c]) => `<div class="row" style="justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--line)">
        <span><b>${id}</b> · Lv.${c.level} <small class="sub">(สูงสุด Lv.${c.best})</small></span>
        <span class="tag t-ok">${esc(c.label)}</span>
      </div>`).join('')}</div>
      <small class="sub">หากเพิ่งหายป่วยแล้วเลเวลลดลง ระบบไม่แสดงตัวแดง และเก็บสถิติสูงสุดของท่านไว้เสมอค่ะ</small></div>` : ''}
    <div class="card"><b class="h">ระบบตัดสินอย่างไร</b><ol class="why">${r.steps.map((st2) => `<li>${esc(st2.text)} ${srcChip(st2.src)}</li>`).join('')}</ol></div>
    ${r.rules?.length ? `<div class="card"><b class="h">ข้อควรระวังตามโรค</b><ul class="list">${r.rules.map((x) => `<li>${esc(x.text)}</li>`).join('')}</ul></div>` : ''}
    <button class="btn go" data-h="save">${ic('check', 26, '#fff', 3)} ใช้ผลนี้</button>
    <button class="btn ghost sm" data-h="prev">ย้อนกลับไปแก้</button></section>`;
}

function saveCheck() {
  const s = S();
  const input = finalInput();
  const r = assess(input);
  if (r.status === 'invalid') return;
  const newStats = input.test && !input.test.skipped ? bodyStats({ age: input.age, sex: input.sex }, input.test) : {};
  const oldStats = s.prevStats || (s.assessment?.input?.test ? bodyStats({ age: s.assessment.input.age, sex: s.assessment.input.sex }, s.assessment.input.test) : null);
  if (Object.keys(newStats).length) {
    const cmp = compareRetest(oldStats, newStats);
    s.lastRetestCompare = cmp;
    s.prevStats = Object.fromEntries(Object.entries(cmp).map(([id, c]) => [id, { level: c.level, best: c.best }]));
  }
  s.assessment = { date: todayKey(), input };
  s.progress.tier = r.tier;
  s.progress.recovery = null;
  s.progress.waitingClearance = false;
  s.progress.needRetest = false;
  syncGoals(); W = null; ctx.commit();
  ctx.toast(`บันทึกผลแล้ว ระดับ ${r.tier} · ภารกิจวันละ ${TIERS[r.tier].daily} นาที`);
  location.hash = r.tier === 0 ? '#/plan' : '#/me';
}

/* ================================================================ 2) แผนท่าวันนี้ */
function todayPlan() {
  const s = S(), a = currentAssessment(), tier = effectiveTier();
  if (!a || a.result.status !== 'ok') return { none: true };
  const input = a.input;
  const ready = s.readiness?.date === todayKey() ? s.readiness.result : null;
  const rec = s.progress.freeze ? null : s.progress.recovery;
  const mods = planModifiers({ conditions: input.conditions, aids: input.aids, surgery: input.surgery, meds: input.meds, doctorCleared: input.doctorCleared }, ready, rec);
  const plan = exercisePlan({
    age: input.age, sex: input.sex, tier, mods,
    stats: Object.fromEntries(Object.entries(a.stats).map(([k, v]) => [k, v.level])),
    strParts: a.stats.STR?.parts,
    fallHigh: !!a.result.fall?.wfgHigh,
    balFallRisk: a.stats.BAL?.fallRisk,
    dementia: input.conditions.includes('dementia'),
  });
  const str = canDoStrength(s.strengthDates, todayKey(), { inRecoveryWeek1: !!rec?.week1 });
  return { a, tier, plan, ready, rec, seated: tier === 0 ? PLAN[0].all : null, str };
}

export function viewPlan() {
  const s = S(), tp = todayPlan();
  if (tp.none) return `<section class="view">${top('ท่าออกกำลังกายวันนี้')}<div class="card stack-v"><b class="h">ยังไม่ได้ทำแบบประเมิน</b><p>ทำแบบประเมินก่อน เพื่อให้ระบบเลือกท่าที่ปลอดภัยและเหมาะกับร่างกายของท่าน</p><button class="btn go sm" data-h="start">เริ่มแบบประเมิน</button></div></section>`;
  const done = new Set(s.planDone.ids);
  const freeze = s.progress.freeze;
  const status = recoveryStatus(s.progress);
  const t = TIERS[tp.tier];
  ctx.setSpeech(`ท่าออกกำลังกายวันนี้ ระดับ ${tp.tier} ${t.name}`);

  const item = (id, name, dose, how, extra = '') => `<li class="ex ${done.has(id) ? 'is-done' : ''}">
      <button class="tick" data-tick="${id}" aria-pressed="${done.has(id)}" aria-label="ทำ${esc(name)}แล้ว">${ic('check', 20, '#fff', 3.2)}</button>
      <div style="min-width:0;flex:1"><b>${esc(name)}</b> <span class="dose">${esc(dose)}</span>${extra}${how ? `<details><summary>วิธีทำ</summary><p>${esc(how)}</p></details>` : ''}</div></li>`;

  let h = `<section class="view">${top('ท่าออกกำลังกายวันนี้')}`;

  // แบนเนอร์สถานะโหมดพักฟื้น v3.1 (FROZEN / WAITING_CLEARANCE / RECOVERING / NEED_RETEST)
  if (status === 'WAITING_CLEARANCE' && freeze) {
    h += `<div class="card stack-v" style="background:var(--suns);color:var(--sunt);border:1.5px solid #F59E0B">
      <b class="h">${ic('shield', 22, '#92400E')} รอสอบถามแพทย์/เจ้าหน้าที่ก่อนกลับไปท่ายืน (ระดับ 0)</b>
      <p style="margin:0">เนื่องจากเพิ่ง${esc(FREEZE_REASONS[freeze.reason].label)} เพื่อความปลอดภัย ลองสอบถามคุณหมอ นักกายภาพ หรือ อสม./รพ.สต. ก่อนนะคะ ระหว่างนี้ทำท่าบริหารท่านั่งเบาๆ และส่งกำลังใจให้เพื่อนในก๊วนได้ค่ะ (สแตกไม่ลด และไม่ถ่วงคะแนนก๊วน)</p>
      <div class="grid2">
        <button class="btn go sm" data-go="return">ถามแพทย์แล้ว กลับมาเริ่ม</button>
        <button class="btn ghost sm" data-go="hobby">งานอดิเรกนั่งนิ่ง</button>
      </div>
    </div>`;
  } else if (status === 'FROZEN' && freeze) {
    const fDays = Math.max(0, daysBetween(freeze.since, todayKey()));
    const canUpgrade = !FREEZE_REASONS[freeze.reason]?.needDoctor;
    h += `<div class="card stack-v" style="background:var(--skys);color:var(--skyd);border:1.5px solid #93C5FD">
      <b class="h">${ic('heart', 22, '#2563EB')} กำลังพักฟื้นเพราะ${esc(FREEZE_REASONS[freeze.reason].label)}</b>
      <p style="margin:0">พักมาแล้ว ${fDays} วัน · พักร่างกายให้เต็มที่นะคะ สแตกความต่อเนื่องถูกเก็บรักษาไว้ไม่ลดลง และไม่ทำให้คะแนนของก๊วนลดลงค่ะ</p>
      <div class="grid2">
        <button class="btn go sm" data-go="return">หายดีแล้ว กลับมาออกกำลังกาย</button>
        <button class="btn ghost sm" data-go="hobby">งานอดิเรกนั่งนิ่ง</button>
      </div>
      ${canUpgrade ? `<button class="btn ghost sm" data-h="upgradeFreeze">อาการเปลี่ยน (เช่น ล้ม / เข้า รพ. / ผ่าตัด)</button>` : ''}
    </div>`;
  } else if (status === 'RECOVERING' && s.progress.recovery) {
    const rec = s.progress.recovery;
    const stall = (rec.stallWeeks | 0) >= RETURN_RULES.stallAlertWeeks;
    h += `<div class="card stack-v" style="background:#F0FDF4;border:1.5px solid #86EFAC">
      <b class="h" style="color:var(--god)">${ic('sprout', 22, '#15803D')} โหมดค่อยๆ ฟื้นตัว (โซน ${rec.zone}) · ระดับ ${s.progress.tier}${rec.stageCap ? ` · เพดานท่าขั้น ${rec.stageCap}` : ''}</b>
      <p class="sub" style="margin:0">${rec.requireRetest
        ? 'เริ่มเบาๆ แบบจับที่จับ (ขั้น A) ปรับตัว 1 สัปดาห์แล้วค่อยทำแบบทดสอบร่างกายใหม่เพื่อให้พอดีกับร่างกายปัจจุบันค่ะ'
        : `สัปดาห์นี้เริ่มเบาๆ ก่อนนะคะ หากฝึกครบ ≥ 2 วัน ไม่ป่วย และเหนื่อยไม่เกิน 1 วัน ระบบจะขยับระดับขึ้นให้ทีละขั้นจนถึงระดับ ${rec.targetTier} ค่ะ`}</p>
      ${stall ? `<div class="note warn">ช่วงนี้ร่างกายยังเหนื่อยง่ายติดต่อกัน ${rec.stallWeeks} สัปดาห์ ลองคุยกับ อสม./รพ.สต. หรือทดสอบร่างกายใหม่แบบมีคนช่วย เพื่อปรับแผนให้พอดีกับท่านนะคะ<br><button class="btn ghost sm" data-h="start" style="margin-top:8px">ทดสอบร่างกายใหม่</button></div>` : ''}
    </div>`;
  } else if (s.progress.needRetest) {
    h += `<div class="card stack-v" style="background:var(--suns);color:var(--sunt)">
      <b class="h">พร้อมทดสอบร่างกายใหม่แล้วค่ะ</b>
      <p style="margin:0">ท่านปรับตัวหลังพักฟื้นครบแล้ว แนะนำทำแบบทดสอบร่างกาย 6 อย่างใหม่ (มีคนช่วยยืนข้างๆ) เพื่อปรับระดับให้พอดีกับสภาพร่างกายปัจจุบันค่ะ</p>
      <button class="btn go sm" data-h="start">เริ่มทดสอบร่างกายใหม่</button>
    </div>`;
  }

  h += `<div class="row" style="justify-content:space-between"><span class="pill">ระดับ ${tp.tier} · ${t.name}</span><span class="sub">ทำแล้ว ${done.size} ท่า</span></div>
    <div class="note warn">${esc(STOP_SIGNS)}</div>`;

  if (tp.seated) {
    h += `<div class="card"><b class="h">ท่านั่งเบาๆ (ระดับ 0)</b><ul class="exl">${Object.entries(tp.seated).map(([k, v]) => item(`seat_${k}`, { aerobic: 'ขยับร่างกาย', strength: 'กล้ามเนื้อ', balance: 'ทรงตัว', stretch: 'ยืดเหยียด' }[k] || k, v, '')).join('')}</ul></div>
      <div class="sub">${esc(tp.plan.warnings?.[0] || '')}</div></section>`;
    return h;
  }

  if (!tp.ready && !freeze) return h + readinessForm(tp.a.input) + '</section>';
  if (tp.ready) h += readinessBanner(tp.ready);
  if (tp.ready && (tp.ready.status === 'urgent' || tp.ready.status === 'rest')) return h + '</section>';

  const P = tp.plan;
  if (P.advice?.length) h += `<div class="card"><b class="h">ข้อแนะนำตามสุขภาพของท่าน</b><ul class="list" style="margin-top:6px">${P.advice.map((x) => `<li>${esc(x.text)} ${srcChip(x.src.split(':')[0])}</li>`).join('')}</ul></div>`;
  if (P.warnings.length) h += `<div class="note"><ul class="list">${P.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>`;
  h += `<div class="card"><b class="h">1. อบอุ่นร่างกาย</b> <span class="sub">ทุกครั้งก่อนเริ่ม (Otago)</span><ul class="exl">${P.warmup.map((w, i) => item(`wu_${i}`, w.name, w.dose, '')).join('')}</ul></div>`;

  const NAME = { STR: 'พลังกล้ามเนื้อ', STA: 'ความอึด', AGI: 'ความคล่องแคล่ว', BAL: 'การทรงตัว' };
  let n = 2;
  for (const g of P.groups) {
    if (g.stat === 'STA' && g.blocked) { h += `<div class="card" style="opacity:.75"><b class="h">${n++}. ${NAME.STA} (STA)</b><p class="sub" style="margin:6px 0 0">วันนี้งดหมวดนี้</p></div>`; continue; }
    if (g.stat === 'STA' && !tp.plan.seatedOnly) {
      const recWalk = isRecoveryWalkMode();
      h += `<div class="card ${g.focus ? 'focus' : ''}"><div class="row" style="justify-content:space-between;gap:8px"><b class="h">${n++}. ${NAME.STA} (STA ${g.level ?? '–'})</b>${g.focus ? '<span class="pill" style="background:var(--suns);color:var(--sunt)">เน้น</span>' : ''}</div>
        <p class="sub">${recWalk ? `เดินเบาๆ ${s.user.dailyGoal} นาที ใช้การพูดวัดความเหนื่อย (Talk Test · ไม่ต้องรีบ)` : `ภารกิจเดินประจำวัน ${s.user.dailyGoal} นาที นับจากตัวหนีบ`}</p>
        ${g.exercises.filter((e) => e.id === 'march').map((e) => `<div class="sub" style="margin-bottom:8px">ทางเลือกในบ้าน: <b>${esc(e.name)}</b> ${esc(e.dose)} (${STAGE_TEXT[e.stage]})</div>`).join('')}
        <button class="btn go sm" data-act="start">${ic('feet', 24, '#fff')} ${recWalk ? 'เริ่มเดินฟื้นตัวเบาๆ' : 'ไปเดิน'}</button></div>`;
      continue;
    }
    if (g.blocked) { h += `<div class="card" style="opacity:.75"><b class="h">${n++}. ${NAME[g.stat]} (${g.stat})</b><p class="sub" style="margin:6px 0 0">วันนี้งดหมวดนี้ตามผลเช็กความพร้อม/สุขภาพ</p></div>`; continue; }
    const restDay = g.stat === 'STR' && !tp.str.ok && !s.planDone.ids.some((x) => x.startsWith('STR:'));
    h += `<div class="card ${g.focus ? 'focus' : ''}"><div class="row" style="justify-content:space-between;gap:8px"><b class="h">${n++}. ${NAME[g.stat]} (${g.stat} ${g.level ?? '–'})</b>${g.focus ? '<span class="pill" style="background:var(--suns);color:var(--sunt)">เน้น</span>' : ''}</div>
      <div class="sub" style="font-size:.9rem">${g.split ? `ท่าขา ${STAGE_TEXT[g.split.legs]} · ท่าแขน ${STAGE_TEXT[g.split.arms]}` : STAGE_TEXT[g.stage || 'A']}${P.disableWeights ? ' · งดถุงทรายข้อเท้า' : ''}</div>
      ${restDay ? `<p class="note" style="margin-top:8px">${esc(tp.str.reason)}</p>` : `<ul class="exl">${g.exercises.map((e) => item(`${g.stat}:${e.id}`, e.name, e.dose, e.how, (e.equipment ? ` <small class="sub">(ถ้ามี${esc(e.equipment)})</small>` : '') + (e.note ? `<br><small class="exnote">${esc(e.note)}</small>` : ''))).join('')}</ul>`}
      <small class="sub">${esc(g.frequency)}</small></div>`;
  }
  const tw = trainingWeek(s.training, todayKey());
  h += `<div class="card"><b class="h">แถบฝึก 7 วัน</b><div class="stack-v" style="margin-top:6px">${['STR', 'AGI', 'BAL', 'STA', 'MND', 'SOC'].map((k) => `<div class="lrow"><b style="width:44px">${k}</b><div class="bar"><i style="width:${(tw[k] / TRAIN.weekFull) * 100}%"></i></div><span class="sub" style="width:56px;text-align:right">${tw[k]}/${TRAIN.weekFull}</span></div>`).join('')}</div>
    <small class="sub">ทำครบทุกท่าในหมวด ได้ 5 แต้ม (สูงสุด 10/วัน) · แถบฝึกแสดงความพยายาม แต่เลเวลร่างกายเปลี่ยนจากการทดสอบซ้ำเท่านั้น</small></div></section>`;
  return h;
}

/* ---------------- เช็กความพร้อมวันนี้ (core/safety.js) */
function profileOf(input) {
  const c = input.conditions || [], m = input.meds || [];
  return {
    anticoagulant: m.includes('anticoagulant'),
    insulinOrSU: m.includes('insulin_su') || (m.includes('unknown') && c.includes('diabetes')),
    diabetes: c.includes('diabetes'),
    kidney: c.includes('kidney'),
    heart: c.includes('heart'),
    fdeia: c.includes('fdeia'),
    fasting: RD?.a?.fasting === true,
  };
}

function readinessForm(input) {
  RD ??= { a: {}, err: '' };
  const a = RD.a, prof = profileOf(input);
  ctx.setSpeech('ก่อนเริ่ม ตอบคำถามสั้นๆ ว่าวันนี้ร่างกายพร้อมไหม');
  const showFast = prof.diabetes || prof.kidney || prof.heart;
  return `<div class="card"><b class="h">ก่อนเริ่ม: วันนี้พร้อมไหม</b><p class="sub" style="margin:4px 0 0">ตอบทุกวันก่อนออกกำลังกาย ใช้เวลาไม่ถึงนาที</p>
    ${READINESS_QUESTIONS.map((q) => yn(`rd.${q.id}`, a[q.id], esc(q.text))).join('')}
    ${a.newFall ? yn('rd.headStrike', a.headStrike, esc(FOLLOW_UP.headStrike)) + yn('rd.confusion', a.confusion, esc(FOLLOW_UP.confusion)) : ''}
    ${showFast ? yn('rd.fasting', a.fasting, 'วันนี้ถือศีลอดไหม') : ''}</div>
    <details class="card"><summary>มีเครื่องวัดความดันหรือน้ำตาล (ไม่บังคับ)</summary>
      <div class="grid2" style="margin-top:8px">${num('rd.bpSys', a.bpSys, 'ความดันตัวบน', 'มม.ปรอท')}${num('rd.bpDia', a.bpDia, 'ความดันตัวล่าง', 'มม.ปรอท')}</div>
      ${prof.diabetes ? num('rd.glucose', a.glucose, 'น้ำตาลปลายนิ้ว', 'มก./ดล.') + yn('rd.hyperSymptoms', a.hyperSymptoms, 'ถ้าน้ำตาลเกิน 250: มีคลื่นไส้ อาเจียน หรืออ่อนเพลียผิดปกติไหม') : ''}
      <small class="sub">วัดหลังนั่งพัก 5 นาที</small></details>
    ${RD.err ? `<div class="note warn" role="alert">${esc(RD.err)}</div>` : ''}
    <button class="btn go" data-h="ready">ตรวจแล้ว ไปต่อ</button>`;
}

function readinessBanner(r) {
  const s = S();
  const tone = { go: ['var(--leafs)', 'var(--god)', 'พร้อมออกกำลังกาย'], light: ['var(--suns)', 'var(--sunt)', 'วันนี้ทำเบาๆ'], rest: ['var(--skys)', 'var(--skyd)', 'วันนี้พักก่อน'], urgent: ['#FDE7EA', '#8E1B33', 'ต้องได้รับการดูแลทันที'] }[r.status];
  if (r.status === 'go' && r.actions.includes('carb_first')) { tone[0] = 'var(--suns)'; tone[1] = 'var(--sunt)'; tone[2] = 'กินของว่างก่อน แล้วค่อยเริ่ม'; }
  const prompt3 = shouldPromptFreeze(s.unwellDates, todayKey());
  return `<div class="card stack-v" style="background:${tone[0]};color:${tone[1]}"><b class="h">${tone[2]}</b>
    ${r.msgs.length ? `<ul class="list">${r.msgs.map((m) => `<li>${esc(m.text)}</li>`).join('')}</ul>` : '<p>ไม่พบสัญญาณที่ต้องระวังวันนี้</p>'}
    ${r.actions.includes('call1669') || r.actions.includes('hospital_today') ? `<div class="hotline" style="background:#fff;color:#8E1B33"><span class="h">1669</span><span>เจ็บป่วยฉุกเฉิน</span></div>` : ''}
    ${prompt3.suggest ? `<div class="note" style="background:#fff;color:var(--skyd)"><b>${esc(prompt3.message)}</b></div>` : ''}
    ${r.actions.includes('freeze_fall') ? `<button class="btn blue sm" data-h="freezeFall">เข้าโหมดพักเพราะล้มทันที (สแตกไม่ลด)</button>` : ''}
    ${r.status === 'rest' && !r.actions.includes('freeze_fall') ? `<button class="btn ghost sm" data-h="freeze">เข้าโหมดพักฟื้น (สแตกไม่ลด · ไม่ถ่วงก๊วน)</button>` : ''}
    <button class="btn ghost sm" data-h="redo">ตอบใหม่</button>
    ${r.msgs.length ? `<small style="opacity:.8">ที่มา: ${[...new Set(r.msgs.map((m) => m.src.split(':')[0].split('(')[0].trim()))].map(esc).join(' · ')}</small>` : ''}</div>`;
}

function submitReadiness() {
  const s = S(), a = currentAssessment();
  const missing = READINESS_QUESTIONS.filter((q) => typeof RD.a[q.id] !== 'boolean');
  if (missing.length) { RD.err = 'ตอบให้ครบทุกข้อ'; ctx.render(); return; }
  if (RD.a.newFall && (typeof RD.a.headStrike !== 'boolean' || typeof RD.a.confusion !== 'boolean')) { RD.err = 'ตอบข้อเรื่องการล้มให้ครบ'; ctx.render(); return; }
  const result = readinessCheck(RD.a, profileOf(a.input));
  const today = todayKey();
  // เก็บเฉพาะวันที่ไม่สบาย/ข้อบวม เพื่อเช็กเกณฑ์ 3 วันติด (ไม่เก็บคำตอบดิบ)
  if (RD.a.unwell || RD.a.joint) {
    s.unwellDates = [...new Set([...(s.unwellDates || []), today])].slice(-30);
  }
  // Auto-Relapse Guard: หากอยู่ในโหมดฟื้นตัวแล้วล้มหรือมีอาการฉุกเฉิน → ตัดกลับเข้า FROZEN ทันที!
  if (s.progress.recovery && (RD.a.newFall || result.status === 'urgent')) {
    const rw = recoveryWeek(s.progress, { newFall: !!RD.a.newFall, urgent: result.status === 'urgent', date: today });
    s.progress = rw.state;
    syncGoals();
    ctx.toast(rw.message);
  }
  s.readiness = { date: today, result };
  RD = null; ctx.commit(); ctx.render();
}

function tick(id) {
  const s = S(), tp = todayPlan();
  if (tp.none) return;
  const ids = new Set(s.planDone.ids);
  if (ids.has(id)) { ids.delete(id); s.planDone.ids = [...ids]; ctx.commit(); ctx.render(); return; }
  ids.add(id); s.planDone.ids = [...ids];
  const stat = id.split(':')[0];
  const g = tp.plan.groups?.find((x) => x.stat === stat);
  let msg = '';
  if (g) {
    const need = g.exercises.filter((e) => !e.equipment).map((e) => `${stat}:${e.id}`);
    if (need.every((x) => ids.has(x)) && !s.planDone.awarded?.includes(stat)) {
      const r = addTraining(s.training, { type: TYPE_OF[stat], date: todayKey(), metGoal: true });
      s.training = r.log; s.planDone.awarded = [...(s.planDone.awarded || []), stat];
      if (stat === 'STR' && !s.strengthDates.includes(todayKey())) s.strengthDates = [...s.strengthDates, todayKey()].slice(-30);
      msg = r.gained ? `ครบหมวด ${stat} +${r.gained} แต้มฝึก` : r.reason;
    }
  }
  const open = (tp.plan.groups || []).filter((x) => x.stat !== 'STA' && !x.blocked && x.exercises.length && !(x.stat === 'STR' && !tp.str.ok && !s.planDone.awarded?.includes('STR')));
  if (open.length && open.every((x) => s.planDone.awarded?.includes(x.stat)) && s.planXpDate !== todayKey()) {
    s.planXpDate = todayKey(); s.user.xp += XP_PER_MISSION; markActive();
    msg = `ทำครบทุกท่าแล้ว +${XP_PER_MISSION} แต้ม`;
    setTimeout(() => confetti(document.querySelector('.view') || document.body, 40), 80);
  }
  ctx.commit(); ctx.render(); if (msg) ctx.toast(msg);
}

/* ================================================================ 3) หน้าตัวละคร: ค่าพลัง 6 ด้าน + สแตก + พักฟื้น */
export function charPanel() {
  const s = S(), a = currentAssessment();
  if (!a) return `<div class="card stack-v"><b class="h">ค่าพลังของฉัน</b><p class="sub">ทำแบบประเมินเพื่อดูค่าพลัง 4 ด้าน และรับท่าออกกำลังกายที่เหมาะกับตัวเอง</p><button class="btn go sm" data-h="start">เริ่มแบบประเมิน</button></div>`;
  const due = retestDue(a.date, todayKey());
  const p = s.progress;
  const status = recoveryStatus(p);
  const mnd = mindStat(s.brainGames || [], todayKey());
  const teamDays = Math.min(7, new Set((s.log || []).filter((x) => x.counted && x.together && daysBetween(x.day, todayKey()) <= 6).map((x) => x.day)).size);
  const cheers = (s.cheersLog || []).filter((d) => daysBetween(d, todayKey()) <= 6).length;
  const soc = socialStat(teamDays, cheers);

  const cmp = s.lastRetestCompare;
  const cmpNote = cmp && Object.values(cmp).some((c) => c.trend < 0)
    ? `<div class="note" style="background:var(--leafs);color:var(--god);margin-top:8px">ช่วงพักฟื้น · สถิติสูงสุดเดิมของท่านยังถูกเก็บไว้เป็นความภูมิใจเสมอค่ะ</div>` : '';

  return `<div class="card" style="text-align:center">${radar(statItems(a.stats))}
      <div class="sub" style="font-size:.9rem">ทดสอบเมื่อ ${new Date(a.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} · ${due.due || p.needRetest ? '<b style="color:var(--god)">ถึงเวลาทดสอบใหม่แล้ว</b>' : `ทดสอบใหม่ในอีก ${due.inDays} วัน`}</div>
      ${cmpNote}
      <div class="grid2" style="margin-top:10px;text-align:left">
        <div class="vital-box"><span class="vb-ic">${ic('sparkle', 20, '#D97706')}</span><div class="vb-txt"><span class="vb-lbl">สมอง (MND)</span><b class="vb-val">${mnd.level ? `Lv.${mnd.level}/10` : 'เล่นครบ 3 เกม'}</b></div></div>
        <div class="vital-box"><span class="vb-ic">${ic('team', 20, '#2563EB')}</span><div class="vb-txt"><span class="vb-lbl">มิตรภาพ (SOC)</span><b class="vb-val">Lv.${soc.level}/10</b></div></div>
      </div>
      <div class="grid2" style="margin-top:10px"><button class="btn go sm" data-go="plan">ท่าวันนี้</button><button class="btn ghost sm" data-h="start">${due.due || p.needRetest ? 'ทดสอบใหม่' : 'ประเมินใหม่'}</button></div></div>
    <div class="card row" style="gap:14px"><div class="stackbadge" aria-hidden="true">${p.stack}</div>
      <div style="flex:1;line-height:1.4"><b class="h">สแตก ${p.stack}/${STACK.max} สัปดาห์</b><br><span class="sub">ออกกำลังกายครบ ${STACK.activeDays} วันในสัปดาห์ได้ +1 · ป่วยกดพักได้ สแตกไม่ลด และไม่ถ่วงคะแนนก๊วน</span></div></div>
    ${status === 'FROZEN' || status === 'WAITING_CLEARANCE'
      ? `<button class="btn blue sm" data-go="return">${status === 'WAITING_CLEARANCE' ? 'ถามแพทย์แล้ว กลับมาเริ่ม' : 'หายดีแล้ว กลับมาออกกำลังกาย'}</button>`
      : `<button class="btn ghost sm" data-h="freeze">${ic('heart', 22, '#2F6BFF')} ไม่สบาย ขอพักก่อน (สแตกไม่ลด)</button>`}`;
}

function askFreeze() {
  const keys = Object.keys(FREEZE_REASONS);
  ctx.sheet('พักเพราะอะไร', keys.map((k) => FREEZE_REASONS[k].label), (i) => {
    const s = S();
    s.progress = startFreeze({ ...s.progress, tier: effectiveTier() }, { date: todayKey(), reason: keys[i] });
    syncGoals(); ctx.commit(); ctx.render();
    ctx.toast('พักร่างกายให้เต็มที่นะคะ สแตกไม่ลด และไม่ทำให้คะแนนก๊วนตกค่ะ');
  }, 'พักได้ไม่จำกัดวัน สแตกความต่อเนื่องถูกเก็บไว้ไม่ลดลง');
}

function askUpgradeFreeze() {
  const severeKeys = ['fall', 'hospital', 'surgery'];
  ctx.sheet('อัปเดตอาการระหว่างพักฟื้น', severeKeys.map((k) => FREEZE_REASONS[k].label), (i) => {
    const s = S();
    s.progress = upgradeFreezeReason(s.progress, { reason: severeKeys[i], date: todayKey() });
    syncGoals(); ctx.commit(); ctx.render();
    ctx.toast('อัปเดตสถานะการพักฟื้นแล้ว (นับวันเริ่มพักเดิม สแตกไม่ลด)');
  }, 'ระบบจะคงวันเริ่มพักเดิมและเพิ่มการคัดกรองขากลับเพื่อความปลอดภัย');
}

/* ================================================================ 4) ประตูขากลับ 4 ด่าน (Privacy-First: ไม่มีใบรับรองแพทย์) */
function initReturnDraft() {
  const a = currentAssessment();
  const inp = a?.input || {};
  R = {
    parq: Array(7).fill(null),
    parqFollowUp: null,
    doctorCleared: null,      // ด่านที่ 2: แบบสอบถามยืนยันด้วยตนเอง (ใช่/ไม่ใช่ เท่านั้น)
    changedMedAid: null,      // ด่านที่ 3: ทบทวนยา/อุปกรณ์ใหม่
    meds: [...(inp.meds || [])],
    aids: [...(inp.aids || [])],
    surgery: [...(inp.surgery || [])],
    fallInjury: !!inp.fallInjury,
    unableToGetUp: !!inp.unableToGetUp,
    syncope: !!inp.syncope,
    msg: '',
  };
}

export function viewReturn() {
  const s = S(), f = s.progress.freeze;
  if (!f) { location.hash = '#/plan'; return ''; }
  if (!R) initReturnDraft();

  const days = Math.max(0, daysBetween(f.since, todayKey()));
  const reasons = Array.isArray(f.reasons) && f.reasons.length ? f.reasons : [f.reason];
  const need = !!(f.needDoctor || reasons.some((r) => FREEZE_REASONS[r]?.needDoctor));
  const needMedAid = need || days >= RETURN_RULES.shortDays;
  const chronicPain = reasons.includes('pain') && days >= RETURN_RULES.painEscalationDays;
  const hasFall = reasons.includes('fall');
  const hasSurgery = reasons.includes('surgery');
  const anyYes = R.parq.some(Boolean);
  const needSelfClear = need || R.parqFollowUp === 'any_yes';

  ctx.setSpeech('ประตูขากลับ ตอบแบบคัดกรองสุขภาพใหม่อีกครั้งเพื่อความปลอดภัย');
  return `<section class="view">${top('กลับมาออกกำลังกาย', 'plan')}
    <div class="note" style="background:var(--skys);color:var(--skyd)">
      <b>พักไป ${days} วัน</b> (${reasons.map((r) => FREEZE_REASONS[r]?.label || r).join(' · ')})<br>
      ตอบคำถามสั้นๆ เพื่อจัดระดับการกลับมาให้พอดีกับร่างกายปัจจุบันค่ะ
    </div>
    ${chronicPain ? `<div class="note warn">อาการปวดต่อเนื่องเกิน 7 วัน แนะนำให้ อสม./รพ.สต. หรือแพทย์ช่วยประเมินก่อนกลับมาออกแรงนะคะ</div>` : ''}

    <div class="card">
      <b class="h">ด่านที่ 1: คัดกรองสุขภาพ PAR-Q+ ใหม่</b>
      <p class="sub" style="margin:4px 0 8px">ตอบให้ครบ 7 ข้อ (PAR-Q+ 2025)</p>
      ${PARQ.map((q, i) => yn(`r.parq.${i}`, R.parq[i], `<b>${i + 1}.</b> ${esc(q.th)}`)).join('')}
    </div>

    ${anyYes ? `<div class="card stack-v">
      <b class="h">ผล PAR-Q+ หน้า 2–3</b>
      <div class="seg col">${[['all_no', 'ตอบ "ไม่ใช่" ทุกข้อ'], ['any_yes', 'มีข้อที่ตอบ "ใช่"']].map(([v, t]) => `<button data-pick="r.parqFollowUp" data-val="${v}" aria-pressed="${R.parqFollowUp === v}">${t}</button>`).join('')}</div>
    </div>` : ''}

    ${needSelfClear ? `<div class="card stack-v" style="border:1.5px solid #93C5FD;background:#F8FBFF">
      <b class="h">ด่านที่ 2: แบบสอบถามยืนยันด้วยตนเอง</b>
      ${yn('r.doctorCleared', R.doctorCleared, `ช่วงที่พักฟื้นเพราะ${need ? esc(FREEZE_REASONS[f.reason].label) : 'อาการสุขภาพ'} ท่านได้สอบถามคุณหมอ นักกายภาพ หรือเจ้าหน้าที่ รพ.สต. แล้ว และได้รับอนุญาตให้กลับมาออกกำลังกายเบาๆ ได้แล้วใช่ไหมคะ?`)}
      <small class="sub">ความเป็นส่วนตัว (PDPA ม.26): เก็บเฉพาะสถานะ ใช่/ไม่ใช่ ในเครื่องของท่านเท่านั้น ไม่ขอใบรับรองแพทย์และไม่เก็บเอกสารทางการแพทย์ใดๆ หากตอบ "ไม่ใช่" ระบบจะเปิดเฉพาะท่านั่งเบาๆ (ระดับ 0) ให้ก่อนค่ะ</small>
    </div>` : ''}

    ${needMedAid ? `<div class="card stack-v">
      <b class="h">ด่านที่ ${needSelfClear ? 3 : 2}: ทบทวนยา อุปกรณ์ และการดูแลตัวเอง</b>
      <p class="sub" style="margin:0">หลังพักหลายวันหรือออกจาก รพ. ยาหรืออุปกรณ์อาจเปลี่ยนไป ระบบจะได้ตั้งกฎความปลอดภัยให้ตรงกับปัจจุบัน (STOPPFall / WFG 2022)</p>
      ${yn('r.changedMedAid', R.changedMedAid, 'ช่วงที่พักฟื้น มีการเพิ่มหรือเปลี่ยนยาประจำ หรือเริ่มใช้อุปกรณ์ช่วยเดิน (ไม้เท้า/วอล์กเกอร์/รถเข็น) ไหมคะ?')}
      ${R.changedMedAid === true ? `<div class="stack-v" style="padding-top:6px;border-top:1px solid var(--line)">
        <b>ยาที่กินประจำตอนนี้</b>${chips('meds', MEDS, R.meds, 'r.')}
        <b>อุปกรณ์ช่วยเดินที่ใช้ตอนนี้</b>${chips('aids', AIDS, R.aids, 'r.')}
      </div>` : ''}
      ${hasSurgery ? `<div class="stack-v" style="padding-top:6px;border-top:1px solid var(--line)">
        <b>ผ่าตัดส่วนไหนคะ? (เพื่อเปิดข้อห้ามเฉพาะทาง)</b>${chips('surgery', SURGERY, R.surgery, 'r.')}
      </div>` : ''}
      ${hasFall ? `<div class="stack-v" style="padding-top:6px;border-top:1px solid var(--line)">
        <b>รายละเอียดการล้มครั้งล่าสุด</b>
        ${yn('r.fallInjury', R.fallInjury, 'ล้มแล้วบาดเจ็บจนต้องไปรักษาไหม')}
        ${yn('r.unableToGetUp', R.unableToGetUp, 'ล้มแล้วลุกเองไม่ได้ไหม')}
        ${yn('r.syncope', R.syncope, 'มีอาการหมดสติหรือเกือบหมดสติร่วมด้วยไหม')}
      </div>` : ''}
    </div>` : ''}

    ${R.msg ? `<div class="note warn" role="alert">${esc(R.msg)}</div>` : ''}
    <button class="btn go" data-h="resume">ยืนยันและประเมินระดับเริ่มต้น</button>
  </section>`;
}

function resume() {
  const s = S(), f = s.progress.freeze;
  if (!f || !R) return;
  if (R.parq.some((x) => x === null)) { R.msg = 'ตอบ PAR-Q+ ให้ครบ 7 ข้อก่อนนะคะ'; ctx.render(); return; }
  const anyYes = R.parq.some(Boolean);
  if (anyYes && !R.parqFollowUp) { R.msg = 'มีข้อที่ตอบ "ใช่" กรุณาเลือกผล PAR-Q+ หน้า 2–3 ด้วยค่ะ'; ctx.render(); return; }

  const days = Math.max(0, daysBetween(f.since, todayKey()));
  const reasons = Array.isArray(f.reasons) && f.reasons.length ? f.reasons : [f.reason];
  const need = !!(f.needDoctor || reasons.some((r) => FREEZE_REASONS[r]?.needDoctor));
  const needSelfClear = need || R.parqFollowUp === 'any_yes';
  const needMedAid = need || days >= RETURN_RULES.shortDays;

  if (needSelfClear && R.doctorCleared === null) {
    R.msg = 'ตอบคำถามยืนยันว่าสอบถามคุณหมอ/เจ้าหน้าที่แล้วหรือยัง (ใช่/ไม่ใช่) ก่อนนะคะ';
    ctx.render(); return;
  }
  if (needMedAid && R.changedMedAid === null && R.doctorCleared !== false) {
    R.msg = 'ตอบคำถามเรื่องการเปลี่ยนยาหรืออุปกรณ์ช่วยเดินก่อนนะคะ';
    ctx.render(); return;
  }

  // ซิงก์ข้อมูลยา/อุปกรณ์/การผ่าตัด/การล้มเข้าโปรไฟล์ก่อนคำนวณเพดานความปลอดภัยล่าสุด
  let safetyCap = 4;
  let currentStage = 'A';
  if (s.assessment?.input) {
    const inp = s.assessment.input;
    inp.parq = [...R.parq];
    inp.parqFollowUp = anyYes ? R.parqFollowUp : null;
    if (R.doctorCleared === true) inp.doctorCleared = true;
    if (R.changedMedAid === true) {
      inp.meds = [...R.meds];
      inp.aids = [...R.aids];
    }
    if (reasons.includes('surgery') && R.surgery.length) {
      inp.surgery = [...new Set([...(inp.surgery || []), ...R.surgery])];
    }
    if (reasons.includes('hospital')) inp.postHospital = true;
    if (reasons.includes('fall')) {
      inp.falls = Math.min(2, (inp.falls || 0) + 1);
      if (Array.isArray(inp.stayIndependent)) inp.stayIndependent[0] = true;
      if (R.fallInjury) inp.fallInjury = true;
      if (R.unableToGetUp) inp.unableToGetUp = true;
      if (R.syncope) inp.syncope = true;
    }
    safetyCap = currentSafetyCapOf(inp);
    const stats = inp.test ? bodyStats({ age: inp.age, sex: inp.sex }, inp.test) : {};
    currentStage = highestStageOf(stats);
  }

  const out = endFreeze(s.progress, {
    date: todayKey(),
    screen: { parq: R.parq, parqFollowUp: R.parqFollowUp, doctorCleared: R.doctorCleared === true },
    currentSafetyCap: safetyCap,
    currentStage,
    medAidReviewed: needMedAid ? R.changedMedAid !== null : true,
  });

  s.progress = out.state;
  syncGoals();
  ctx.commit();

  if (out.result === 'need_doctor' || out.result === 'consult') {
    R = null;
    location.hash = '#/plan';
    ctx.toast(out.message);
    return;
  }
  if (out.result !== 'resumed') {
    R.msg = out.message;
    ctx.render(); return;
  }

  R = null;
  location.hash = '#/plan';
  ctx.toast(out.painAdvice ? `${out.message} · ${out.painAdvice}` : out.message);
}

/* ================================================================ 5) ท้องฟ้าใจ + 2Q */
export function moodCard() {
  const s = S(), today = todayKey();
  const cur = s.mood.find((m) => m.date === today)?.sky;
  const pr = moodPrompt(s.mood, today, s.last2Q);
  return `<div class="card"><div class="row" style="justify-content:space-between"><b class="h">ท้องฟ้าในใจวันนี้</b><span class="sub" style="font-size:.9rem">ไม่คิดคะแนน · ก๊วนไม่เห็น</span></div>
    <div class="grid2" style="grid-template-columns:repeat(3,1fr);margin-top:8px">${Object.entries(SKY).map(([k, v]) => `<button class="feel" data-sky="${k}" aria-pressed="${cur === k}">${skyIcon(k)}${v.label}</button>`).join('')}</div>
    ${pr.offer2Q ? `<button class="note row" data-go="twoq" style="width:100%;text-align:left;margin-top:10px;border:0;background:var(--suns);color:var(--sunt)">${ic('heart', 22, '#9A4D00')}<span style="flex:1">ช่วงนี้ฟ้าในใจครึ้มบ่อย ลองตอบคำถามสั้นๆ 2 ข้อไหม</span>${ic('chev', 20)}</button>` : ''}</div>`;
}

function skyIcon(k) {
  const g = {
    sun: '<circle cx="22" cy="22" r="9" fill="#FFC531"/><path d="M22 5v5M22 34v5M5 22h5M34 22h5M10 10l3.5 3.5M30.5 30.5 34 34M10 34l3.5-3.5M30.5 13.5 34 10" stroke="#FF9F1C" stroke-width="3" stroke-linecap="round"/>',
    cloud: '<circle cx="16" cy="17" r="6" fill="#FFC531"/><path d="M12 33h20a7 7 0 0 0 0-14 9 9 0 0 0-17 3 6 6 0 0 0-3 11Z" fill="#D9E1EA"/>',
    rain: '<path d="M11 26h21a7 7 0 0 0 0-14 9 9 0 0 0-17 3 6 6 0 0 0-4 11Z" fill="#AFC2D6"/><path d="M15 31l-2 5M23 31l-2 5M31 31l-2 5" stroke="#2F6BFF" stroke-width="3" stroke-linecap="round"/>',
  }[k];
  return `<svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">${g}</svg>`;
}

export function viewTwoQ() {
  const s = S();
  Q2 ??= { a: [null, null], result: null };
  ctx.setSpeech(Q2.result ? Q2.result.text : `${TWO_Q.questions[0]} ${TWO_Q.questions[1]}`);
  if (Q2.result) {
    const r = Q2.result;
    return `<section class="view">${top('คุยเรื่องใจ')}
      <div class="card stack-v"><p style="font-size:1.1rem">${esc(r.text)}</p>
        <div class="hotline"><span class="h">${r.help.number}</span><span>${esc(r.help.text)}</span></div>
        <small class="sub">โทรจากโทรศัพท์ได้เลย หรือให้ลูกหลานช่วยโทร</small></div>
      ${r.positive ? `<div class="card stack-v"><b class="h">ให้ลูกหลานช่วยพาไปคุยกับเจ้าหน้าที่ไหม</b>
        <p class="sub">ถ้ายินยอม ลูกหลานจะเห็นแค่ข้อความว่า "อยากให้ช่วยพาไปคุยกับ อสม. หรือเจ้าหน้าที่" โดยไม่เห็นคำตอบของท่าน</p>
        <div class="seg"><button data-h="consent1" aria-pressed="${s.familyConsent === true}">ยินยอม</button><button data-h="consent0" aria-pressed="${s.familyConsent !== true}">ไม่ต้อง</button></div></div>` : ''}
      <div class="sub" style="font-size:.9rem">${esc(TWO_Q.src)}<br>แอปคัดกรองเบื้องต้นเท่านั้น ไม่ได้วินิจฉัย และไม่ส่งข้อมูลนี้ให้ AI</div>
      <button class="btn ghost sm" data-h="q2done">กลับหน้าแรก</button></section>`;
  }
  return `<section class="view">${top('คุยเรื่องใจ')}
    <p>คำถามสั้นๆ 2 ข้อ จากกรมสุขภาพจิต ตอบตามความรู้สึกจริง ไม่มีถูกหรือผิด</p>
    <div class="card">${TWO_Q.questions.map((q, i) => yn(`q2.${i}`, Q2.a[i], esc(q))).join('')}</div>
    <button class="btn go" data-h="q2score" ${Q2.a.some((x) => x === null) ? 'disabled' : ''}>ดูผล</button>
    <div class="hotline sm"><span class="h">${HELP.mentalHotline.number}</span><span>${esc(HELP.mentalHotline.text)}</span></div></section>`;
}

/* ================================================================ ตัวจัดการเหตุการณ์ */
export function handleHealthClick(e) {
  const el = (sel) => e.target.closest(sel);
  const h = el('[data-h]');
  if (h) {
    const k = h.dataset.h;
    if (k === 'start') { startCheck(); location.hash = '#/check'; return true; }
    if (k === 'next') { W.err = checkStep(W.step); if (!W.err) W.step++; ctx.render(); return true; }
    if (k === 'prev') { W.err = ''; W.step = Math.max(0, W.step - 1); ctx.render(); return true; }
    if (k === 'save') { saveCheck(); return true; }
    if (k === 'freeze') { askFreeze(); return true; }
    if (k === 'upgradeFreeze') { askUpgradeFreeze(); return true; }
    if (k === 'retroFreeze') {
      const s = S();
      const keys = Object.keys(FREEZE_REASONS);
      ctx.sheet('ช่วงที่หายไป พักรักษาตัวเพราะอะไรคะ?', keys.map((rk) => FREEZE_REASONS[rk].label), (i) => {
        s.progress = applyRetroactiveFreeze(
          { ...s.progress, tier: effectiveTier() },
          { since: s.lastActiveDate || addDays(todayKey(), -7), reason: keys[i], restoreStack: Math.max(s.progress.stack, 1) },
        );
        s.absenceDismissedDate = todayKey();
        R = null;
        syncGoals(); ctx.commit();
        location.hash = '#/return';
        ctx.toast('บันทึกพักฟื้นย้อนหลังและคืนสแตกให้แล้วค่ะ ตอบคัดกรองขากลับเพื่อความปลอดภัยนะคะ');
      });
      return true;
    }
    if (k === 'dismissAbsence') {
      const s = S();
      s.absenceDismissedDate = todayKey();
      s.lastActiveDate = todayKey();
      ctx.commit(); ctx.render();
      ctx.toast('ยินดีต้อนรับกลับมาค่ะ ค่อยๆ เริ่มเดินเท่าที่ไหวนะคะ');
      return true;
    }
    if (k === 'ready') { submitReadiness(); return true; }
    if (k === 'gatecheck') { ctx.render(); return true; }
    if (k === 'skiptest') { W.input.gate.skip = true; W.err = ''; W.step = 6; ctx.render(); return true; }
    if (k === 'redo') { S().readiness = null; ctx.commit(); ctx.render(); return true; }
    if (k === 'freezeFall') {
      const s = S();
      s.progress = startFreeze({ ...s.progress, tier: effectiveTier() }, { date: todayKey(), reason: 'fall' });
      s.readiness = null; syncGoals(); ctx.commit(); ctx.render();
      ctx.toast('บันทึกการพักเพราะหกล้มแล้ว สแตกไม่ลด และไม่ทำให้คะแนนก๊วนตกค่ะ');
      return true;
    }
    if (k === 'resume') { resume(); return true; }
    if (k === 'q2score') { const s = S(); Q2.result = score2Q(Q2.a); s.last2Q = todayKey(); s.twoQ = { date: todayKey(), positive: Q2.result.positive }; ctx.commit(); ctx.render(); return true; }
    if (k === 'consent1' || k === 'consent0') {
      const s = S(); s.familyConsent = k === 'consent1'; ctx.commit(); ctx.render();
      const n = familyNotice(Q2?.result, s.familyConsent, s.user.name);
      ctx.toast(n ? '(ต้นแบบ) ยังไม่ได้ส่งจริง · ระบบจริงจะแจ้งลูกหลานโดยไม่มีคำตอบของท่าน' : 'ไม่แจ้งอะไรถึงลูกหลาน');
      return true;
    }
    if (k === 'q2done') { Q2 = null; location.hash = '#/today'; return true; }
  }

  const y = el('[data-yn]');
  if (y) {
    const v = y.dataset.v === '1', key = y.dataset.yn;
    if (key.startsWith('r.')) { if (!R) initReturnDraft(); set(R, key.slice(2), v); R.msg = ''; }
    else if (key.startsWith('rd.')) { RD ??= { a: {} }; RD.a[key.slice(3)] = v; RD.err = ''; }
    else if (key.startsWith('q2.')) Q2.a[Number(key.slice(3))] = v;
    else set(W.input, key, v);
    ctx.render(); return true;
  }

  const pk = el('[data-pick]');
  if (pk) {
    const key = pk.dataset.pick; let v = pk.dataset.val; if (/^\d+$/.test(v)) v = Number(v);
    if (key.startsWith('r.')) { if (!R) initReturnDraft(); set(R, key.slice(2), v); R.msg = ''; }
    else set(W.input, key, v);
    ctx.render(); return true;
  }

  const ch = el('[data-chip]');
  if (ch) {
    const [rawList, c] = ch.dataset.chip.split(':');
    if (rawList.startsWith('r.')) {
      if (!R) initReturnDraft();
      const list = rawList.slice(2);
      const l = R[list] || [];
      R[list] = l.includes(c) ? l.filter((x) => x !== c) : [...l, c];
    } else {
      const l = W.input[rawList] || [];
      W.input[rawList] = l.includes(c) ? l.filter((x) => x !== c) : [...l, c];
    }
    ctx.render(); return true;
  }

  const tk = el('[data-tick]');
  if (tk) { tick(tk.dataset.tick); return true; }

  const sk = el('[data-sky]');
  if (sk) {
    const s = S();
    s.mood = addMood(s.mood, todayKey(), sk.dataset.sky).slice(-60);
    ctx.commit(); ctx.render();
    ctx.toast(`บันทึกแล้ว: ${SKY[sk.dataset.sky].label}`);
    return true;
  }
  return false;
}

export function handleHealthInput(e) {
  const f = e.target.closest('[data-f]');
  if (!f) return false;
  const key = f.dataset.f;
  let v;
  if (f.type === 'checkbox') v = f.checked;
  else v = f.value === '' ? null : Number(f.value);
  if (key.startsWith('rd.')) { RD ??= { a: {} }; RD.a[key.slice(3)] = v; }
  else if (key.startsWith('r.')) { if (!R) initReturnDraft(); set(R, key.slice(2), v); }
  else if (W) {
    if (['test.chairStand', 'test.armCurl', 'test.step2min'].includes(key) && v !== null) v = Math.round(v);
    set(W.input, key, v);
  }
  if (f.type === 'checkbox') ctx.render();
  return true;
}
