// ก้าวรวมใจ — ตัวแอปหลัก · vanilla JS ไม่มีขั้นตอนบิลด์ (อัปเกรดโหมดพักฟื้น v3.1 + งานอดิเรก + ฝึกสมอง + เกราะคะแนนก๊วน)
// เว็บแบ่งเป็น 3 ส่วนตามแบบ:
//   ส่วนที่ 1 ก้าว      (สุขภาพกาย)   ภารกิจเดิน ตรวจเดินจริง (และโหมด Talk Test ช่วงพักฟื้น) ประวัติ ตัวหนีบ · แบบประเมิน ท่าวันนี้ พัก/กลับมา
//   ส่วนที่ 2 ตัวละคร   (สุขภาพใจ)    ตัวละครโตได้ ค่าพลัง 6 ด้าน ท่าทาง เหรียญ ท้องฟ้าใจ 2Q เควสงานอดิเรก มินิเกมฝึกสมอง
//   ส่วนที่ 3 ก๊วน      (สุขภาพสังคม) ก๊วนเพื่อน (ไม่ถูกคนพักฟื้นถ่วงคะแนน) ลีกตำบล ชวนเพื่อน มุมลูกหลาน
import { load, save, reset, todayKey, dayKey, shiftKey, defaults, hasSaved } from './store.js';
import { analyze, analyzeRecoveryWalk, synth, RULES, fmtMin } from './core/gait.js';
import { levelFromXp, xpIntoLevel, stageFromLevel, STAGES, XP_PER_MISSION, XP_PER_LEVEL, memberScore, teamScore, adjustDailyGoal, weeklyGoalFromChairStand } from './core/score.js';
import { signSession, verifySession } from './core/sign.js';
import { minutesByDay, streak, badges, POSES } from './core/progress.js';
import { addTraining } from './core/stats.js';
import { ic, ring, sprite, head, toast, confetti, speak, mmss, nf, esc } from './ui.js';
import {
  initHealth, viewCheck, viewPlan, viewReturn, viewTwoQ, charPanel, moodCard, absenceBanner,
  currentAssessment, effectiveTier, isRecoveryWalkMode, isSeatedOnlyMode,
  handleHealthClick, handleHealthInput, markActive, logFeeling, rollWeeks, demoEndWeek, startCheck,
} from './health.js';
import { initExtras, hobbyPromoCard, viewHobby, brainPromoCard, viewBrain, handleExtrasClick } from './extras.js';
import { TIERS } from './core/assess.js';
import { addDays, recoveryStatus, startFreeze, FREEZE_REASONS } from './core/plan-progress.js';
import { initPwa } from './pwa.js';

let firstVisit = !hasSaved();
let S = load();
const app = document.getElementById('app');
const demo = document.getElementById('demo');
const intro = document.getElementById('intro');
let walk = null;
let tick = null;
let wakeLock = null;
let inviteLeft = 600;
let inviteTimer = null;
let serverOnline = false;
let serverInfo = null;
let speech = '';
let pendingCelebrate = null;
let posePreview = null;
let lastRoute = '';
let installEvt = null;
let selectedDayIdx = 6;
let welcomeStep = 0;

const SCALE = { 1: 0.74, 2: 0.84, 3: 0.92, 4: 1, 5: 1.06 };
const CELEB = [['happy', 'm-hop'], ['main', 'm-pop'], ['cute', 'm-squash'], ['run', 'm-run']];
const FEEL = { fun: 'สนุกสดชื่น', neutral: 'สบายๆ', tired: 'ค่อนข้างเหนื่อย' };
const FEEL_SHORT = { fun: 'สนุก', neutral: 'เฉยๆ', tired: 'เหนื่อย' };
const WD = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const WD_FULL = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
const READY_LABEL = { go: ['พร้อมออกกำลังกายวันนี้', 'ok'], light: ['วันนี้ทำเบาๆ', 'warn'], rest: ['วันนี้พักก่อน', 'warn'], urgent: ['ต้องได้รับการดูแลทันที', 'bad'] };

const PARTS = {
  body: { no: 1, tab: 'step', icon: 'feet', name: 'ก้าว', health: 'สุขภาพกาย', title: 'ตัวหนีบนับก้าว', desc: 'หนีบเอว นับก้าว ตรวจว่าเดินจริง ไม่ต้องพกมือถือ' },
  mind: { no: 2, tab: 'me', icon: 'sprout', name: 'ตัวละคร', health: 'สุขภาพใจ', title: 'ตัวละครโตได้', desc: 'เดินจริงแล้วตัวละครของตัวเองโตขึ้น เห็นความสำเร็จทุกวัน' },
  social: { no: 3, tab: 'team', icon: 'team', name: 'ก๊วน', health: 'สุขภาพสังคม', title: 'ก๊วนเพื่อน', desc: 'ชวนเพื่อนวัยเดียวกันมาเดินด้วยกัน แข่งกับก๊วนอื่นในตำบล' },
};
const ROUTE_PART = {
  welcome: 'body', step: 'body', walk: 'body', done: 'body', device: 'body', history: 'body', settings: 'body', check: 'body', plan: 'body', return: 'body',
  me: 'mind', twoq: 'mind', hobby: 'mind', brain: 'mind',
  team: 'social', league: 'social', invite: 'social', family: 'social',
};
const TITLES = {
  welcome: 'เริ่มต้น', step: 'ก้าว', walk: 'กำลังเดิน', done: 'ผลการเดิน', device: 'ตัวหนีบนับก้าว', history: 'ประวัติการเดิน',
  me: 'ตัวละคร', team: 'ก๊วน', league: 'ลีกตำบล', invite: 'ชวนเพื่อน', family: 'มุมลูกหลาน', settings: 'ตั้งค่า',
  check: 'แบบประเมิน', plan: 'ท่าวันนี้', return: 'กลับมาออกกำลังกาย', twoq: 'คุยเรื่องใจ', hobby: 'เควสงานอดิเรก', brain: 'มินิเกมฝึกสมอง',
};

function applySettings() {
  const r = document.documentElement;
  r.dataset.size = S.settings.size;
  r.dataset.motion = S.settings.motion ? 'on' : 'off';
}
function commit() { save(S); }

/* ---------------------------------------------------------------- ข้อมูลที่คำนวณ */
const weekKeys = () => Array.from({ length: 7 }, (_, i) => dayKey(6 - i));
const perDay = () => minutesByDay(S.log, weekKeys());
const tMin = () => perDay()[6].minutes;
const me = () => S.team.members.find((m) => m.me);

function syncMe() {
  const p = perDay();
  const m = me();
  if (!m) return;
  m.minutes = p.reduce((t, d) => t + d.minutes, 0);
  m.today = p[6].minutes > 0;
  m.frozen = !!(S.progress.freeze || S.progress.waitingClearance);
}
function level() { return levelFromXp(S.user.xp); }
function stage() { return stageFromLevel(level()); }

function allTeams() {
  const mine = { id: S.team.id, name: S.team.name, members: S.team.members, mine: true };
  return [mine, ...S.otherTeams]
    .map((t) => ({ ...t, score: teamScore(t.members) }))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

function goalSource() {
  const a = currentAssessment();
  if (a) { const t = effectiveTier(); return { from: 'tier', tier: t, daily: TIERS[t].daily, weekly: TIERS[t].weekly }; }
  const weekly = weeklyGoalFromChairStand(S.user.chairReps);
  return { from: 'chair', tier: null, daily: weekly >= 70 ? 15 : 10, weekly };
}
function ensureGoals() {
  const g = goalSource();
  if (S.user.weeklyGoal !== g.weekly) { S.user.weeklyGoal = g.weekly; S.user.dailyGoal = g.daily; }
  const m = me();
  if (m) {
    m.goal = S.user.weeklyGoal;
    m.frozen = !!(S.progress.freeze || S.progress.waitingClearance);
  }
}
function dayLabel(key) {
  if (key === todayKey()) return 'วันนี้';
  if (key === dayKey(1)) return 'เมื่อวาน';
  const [y, m, d] = key.split('-').map(Number);
  return `วัน${WD[new Date(y, m - 1, d).getDay()]} ${d}`;
}
function fullDayLabel(key) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d), mTh = dt.toLocaleDateString('th-TH', { month: 'short' });
  const base = `${WD_FULL[dt.getDay()]}ที่ ${d} ${mTh}`;
  if (key === todayKey()) return `วันนี้ · ${base}`;
  if (key === dayKey(1)) return `เมื่อวาน · ${base}`;
  return base;
}
const ago = (t) => { if (!t) return 'ยังไม่เคยส่ง'; const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? 'เมื่อสักครู่' : m < 60 ? `${m} นาทีที่แล้ว` : m < 1440 ? `${Math.floor(m / 60)} ชั่วโมงที่แล้ว` : `${Math.floor(m / 1440)} วันที่แล้ว`; };
const isSample = () => S.mode !== 'mine';
const readinessToday = () => (S.readiness?.date === todayKey() ? S.readiness.result : null);

/* ---------------------------------------------------------------- ชิ้นส่วนที่ใช้ร่วม */
function nav(on) {
  const p = perDay(), lv = level(), st = stage();
  const rank = allTeams().findIndex((t) => t.mine) + 1;
  const sub = { body: `วันนี้ ${p[6].minutes}/${S.user.dailyGoal} นาที`, mind: `เลเวล ${lv} · ${st.name}`, social: `อันดับ ${rank} · ${S.team.members.length} คน` };
  return `<nav class="nav" aria-label="ระบบ 3 ส่วน"><div class="nav-tabs">${Object.entries(PARTS).map(([k, item]) => `
    <button class="tab" data-part="${k}" data-go="${item.tab}" ${on === k ? 'aria-current="page"' : ''}>
      <span class="tab-ic">${ic(item.icon, 26)}</span>
      <span class="tab-txt"><b>${item.name}</b><small class="tab-sub">${sub[k]}</small></span>
    </button>`).join('')}</div></nav>`;
}

const sizeLabel = () => ({ m: 'ก', l: 'ก+', xl: 'ก++' }[S.settings.size] || 'ก');
const tools = () => `<div class="row tools-bar" style="gap:8px">
  <button class="tool-pill" data-act="cycleSize" aria-label="เปลี่ยนขนาดตัวอักษร ตอนนี้ขนาด ${sizeLabel()}"><span class="tool-font">${sizeLabel()}</span><span class="tool-lbl">ขนาดอักษร</span></button>
  <button class="tool-pill speak-btn" data-act="speak" aria-label="ฟังเสียงอ่านหน้านี้">${ic('speaker', 20)}<span class="tool-lbl">ฟังเสียง</span></button>
  <button class="round plain" data-go="settings" aria-label="ตั้งค่า">${ic('gear', 22)}</button>
</div>`;
const back = (to) => `<button class="round plain back-btn" data-go="${to}" aria-label="ย้อนกลับ">${ic('back', 24)}</button>`;
const sampleBar = () => (isSample() ? `<div class="sample-bar" role="note"><span>ข้อมูลตัวอย่าง (ป้าแดง)</span><button data-act="startMine">เริ่มใช้ของฉัน</button></div>` : '');

function heroCard(pose, motion, lv, st, into, bubble = '', poke = false) {
  const h = 230 * SCALE[st.stage];
  return `<div class="hero st${st.stage}" id="hero">
    <div class="sunb"></div><div class="cloud"></div><div class="cloud b"></div><div class="hill"></div><div class="hill b"></div>
    <div class="hud">
      <span class="pill">${ic('star', 18, '#FF9F1C')} เลเวล ${lv}</span>
      <span class="pill" style="color:var(--god)">${ic('sprout', 16, 'currentColor', 2.4)} ${st.name}</span>
    </div>
    ${bubble ? `<div class="bubble">${esc(bubble)}</div>` : ''}
    <div class="ped"></div>
    ${poke ? `<button class="char ${motion}" data-act="poke" aria-label="แตะตัวละครเพื่อทักทาย">${sprite(pose, h)}</button>` : `<div class="char ${motion}">${sprite(pose, h)}</div>`}
    <div class="xp">
      <span class="xp-lbl">แต้มสะสม</span>
      <div class="bar" style="flex:1"><i style="width:${into}%;background:linear-gradient(90deg,#16A34A,#F59E0B)"></i></div>
      <span class="tnum" style="white-space:nowrap;font-weight:700;color:var(--god)">อีก ${XP_PER_LEVEL - into} แต้ม</span>
    </div>
  </div>`;
}

function face(f, size = 44) {
  const col = { fun: '#FFD25E', neutral: '#D9EDFF', tired: '#FFD9E0' }[f];
  const mouth = { fun: 'M13 26 Q22 35 31 26', neutral: 'M14 28 L30 28', tired: 'M14 31 Q22 24 30 31' }[f];
  return `<svg width="${size}" height="${size}" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20" fill="${col}"/><circle cx="15.5" cy="18" r="2.6" fill="#152019"/><circle cx="28.5" cy="18" r="2.6" fill="#152019"/><path d="${mouth}" stroke="#152019" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>`;
}

function sessRow(s) {
  const title = s.counted
    ? `${s.relaxed ? 'เดินฟื้นตัว' : 'เดินต่อเนื่อง'} ${s.minutes} นาที`
    : s.reason === 'shake' ? 'ตรวจพบการเขย่าด้วยมือ' : `เดินสั้นเกินเกณฑ์ (${fmtMin(s.durationSec)})`;
  const tag = s.counted ? `<span class="tag t-ok">${ic('check', 14, 'currentColor', 3)} นับแล้ว</span>` : `<span class="tag t-no">${ic('x', 14, 'currentColor', 3)} ไม่นับ</span>`;
  return `<div class="sess ${s.counted ? 'is-ok' : 'is-no'}">
    <span class="si ${s.counted ? 'ok' : 'no'}">${ic(s.counted ? 'shield' : 'x', 22, 'currentColor', 2.4)}</span>
    <div class="m">
      <div class="sess-top"><b>${title}</b>${s.counted ? `<span class="sess-steps tnum">${nf(s.steps)} ก้าว</span>` : ''}</div>
      <div class="sess-meta">
        <span>${dayLabel(s.day)} ${esc(s.time)} น.</span>
        ${s.relaxed ? '<span class="meta-pill social">Talk Test</span>' : ''}
        ${s.together ? `<span class="meta-pill social">${ic('team', 14, 'currentColor', 2.4)} เดินด้วยกัน</span>` : ''}
        ${s.feeling ? `<span class="meta-pill feel">รู้สึก${FEEL_SHORT[s.feeling]}</span>` : ''}
        ${s.sample ? '<span>ตัวอย่าง</span>' : s.sim ? '<span>จำลอง</span>' : ''}
      </div>
    </div>
    ${tag}
  </div>`;
}

function weekChart(p, goal) {
  const idx = Math.max(0, Math.min(6, selectedDayIdx));
  const max = Math.max(goal * 1.45, ...p.map((d) => d.minutes), 1), H = 122, px = (m) => (m / max) * H;
  const sel = p[idx];
  const dayLogs = S.log.filter((s) => s.day === sel.day), counted = dayLogs.filter((s) => s.counted), rejected = dayLogs.filter((s) => !s.counted);
  const steps = counted.reduce((t, s) => t + s.steps, 0), met = sel.minutes >= goal;
  const daysMet = p.filter((d) => d.minutes >= goal).length;
  let detail;
  if (sel.minutes > 0) {
    detail = `<div class="day-inspector ok"><div class="di-head"><div><span class="di-date">${fullDayLabel(sel.day)}</span>
      <h4 class="di-title">เดินจริงรวม <b>${sel.minutes} นาที</b> · <span class="tnum">${nf(steps)}</span> ก้าว</h4></div>
      <span class="tag ${met ? 't-ok' : 's'}">${met ? `${ic('check', 14, 'currentColor', 3)} ครบเป้า` : `ขาดอีก ${goal - sel.minutes} นาที`}</span></div>
      <div class="di-pills">${counted.some((s) => s.together) ? `<span class="di-pill">${ic('team', 15, 'currentColor', 2.4)} เดินกับเพื่อนในก๊วน</span>` : ''}
      ${counted.find((s) => s.feeling) ? `<span class="di-pill">ความรู้สึก: ${FEEL[counted.find((s) => s.feeling).feeling]}</span>` : ''}</div></div>`;
  } else if (rejected.length) {
    detail = `<div class="day-inspector warn"><div class="di-head"><div><span class="di-date">${fullDayLabel(sel.day)}</span>
      <h4 class="di-title">ไม่มีนาทีที่นับ · ${rejected[0].reason === 'shake' ? 'ตรวจพบการเขย่าด้วยมือ' : 'เดินสั้นกว่าเกณฑ์'}</h4></div>
      <span class="tag t-no">ไม่นับ</span></div><div class="di-sub">จังหวะไม่ใช่การเดินจริง จึงไม่นำมาคิดคะแนน เพื่อความยุติธรรมกับทุกก๊วน</div></div>`;
  } else {
    detail = `<div class="day-inspector empty"><div class="di-head"><div><span class="di-date">${fullDayLabel(sel.day)}</span>
      <h4 class="di-title">${idx === 6 ? 'วันนี้ยังไม่ได้เดิน' : 'วันพัก · ไม่มีการเดิน'}</h4></div></div></div>`;
  }
  return `<div class="chart-wrap">
    <div class="chart" aria-hidden="true">
      <div class="goal" style="bottom:${px(goal).toFixed(1)}px"><span>เป้า ${goal} นาที</span></div>
      ${p.map((d, i) => {
        const today = i === 6, isMet = d.minutes >= goal;
        const name = today ? 'วันนี้' : WD[new Date(d.day + 'T12:00').getDay()];
        return `<div class="c ${i === idx ? 'selected' : ''} ${isMet ? 'met' : ''}" data-day-idx="${i}">
          <span class="v tnum">${d.minutes || '-'}</span>
          <span class="b-slot"><span class="b ${d.minutes ? (isMet ? 'met-bar' : 'part-bar') : 'z'} ${today && d.minutes < goal ? 't' : ''}" style="height:${Math.max(8, px(d.minutes)).toFixed(1)}px"></span></span>
          <span class="d-txt ${today ? 't' : ''}">${name}</span></div>`;
      }).join('')}
    </div>
    <p class="sr">นาทีที่เดินจริง 7 วัน: ${p.map((d, i) => `${i === 6 ? 'วันนี้' : WD[new Date(d.day + 'T12:00').getDay()]} ${d.minutes} นาที`).join(', ')}</p>
    <div class="chart-legend"><span><i class="lg-dot met"></i> ครบเป้า ${daysMet} วัน</span><span><i class="lg-dot part"></i> เดินบางส่วน</span><span><i class="lg-line"></i> เป้า ${goal} นาที/วัน</span></div>
    <div class="row" style="justify-content:space-between;gap:10px;margin-top:4px">
      <span class="sub" style="font-size:.95rem">ดูทีละวัน</span>
      <div class="day-nav"><button data-day-step="-1" aria-label="วันก่อนหน้า" ${idx === 0 ? 'disabled' : ''}>${ic('back', 22)}</button><button data-day-step="1" aria-label="วันถัดไป" ${idx === 6 ? 'disabled' : ''}>${ic('chev', 22)}</button></div>
    </div>
    ${detail}
  </div>`;
}

function planCard() {
  const a = currentAssessment();
  if (!a) {
    return `<button class="card health-card todo" data-h="start"><span class="hc-ic">${ic('flag', 28)}</span>
      <span class="hc-t"><b>ทำแบบประเมินก่อนเริ่ม</b><span class="sub">คัดกรองความปลอดภัย + ทดสอบร่างกาย 15–20 นาที แล้วได้ภารกิจที่เหมาะกับตัวเอง</span></span>${ic('chev', 24, '#55625A')}</button>`;
  }
  const t = effectiveTier(), done = S.planDone.ids.length, xp = S.planXpDate === todayKey();
  const r = readinessToday(), rs = recoveryStatus(S.progress);
  const state = rs === 'WAITING_CLEARANCE' ? 'รอถามแพทย์ · เปิดเฉพาะท่านั่งเบาๆ (ระดับ 0)'
    : rs === 'FROZEN' ? 'กำลังพักฟื้น · สแตกไม่ลด · ท่านั่งเบาๆ'
      : rs === 'RECOVERING' ? `โหมดฟื้นตัว (ขั้น ${S.progress.recovery?.stageCap || 'A'}) · ค่อยๆ ปรับตัว`
        : r ? `${READY_LABEL[r.status][0]} · ${xp ? 'ทำครบทุกท่าแล้ว' : done ? `ทำแล้ว ${done} ท่า` : 'อบอุ่น + กล้ามเนื้อ + ทรงตัว'}`
          : 'ตอบคำถามความพร้อม 1 นาที ก่อนเริ่มท่าวันนี้';
  return `<button class="card health-card" data-go="plan"><span class="hc-ic">${ic('sprout', 28)}</span>
    <span class="hc-t"><b>ท่าออกกำลังกายวันนี้</b><span class="sub">ระดับ ${t} ${TIERS[t].name} · ${state}</span></span>${ic('chev', 24, '#55625A')}</button>`;
}

/* ================================================================ หน้าเริ่มต้น (ครั้งแรก) */
const V = {};
V.welcome = () => {
  speech = welcomeStep ? 'ใส่ชื่อของท่าน แล้วกดถัดไปเพื่อทำแบบประเมิน' : 'ยินดีต้อนรับสู่ก้าวรวมใจ เลือกดูตัวอย่างของป้าแดง หรือเริ่มใช้ของท่านเอง';
  if (welcomeStep === 1) {
    return `<section class="view welcome">
      <div class="w-art">${sprite('greet', 200)}</div>
      <h1 class="h">ท่านชื่ออะไรคะ</h1>
      <p>ใช้แสดงบนหน้าจอและในก๊วนเท่านั้น ไม่ต้องใส่นามสกุล</p>
      <label class="sr" for="w-name">ชื่อเล่นหรือชื่อที่อยากให้เรียก</label>
      <input id="w-name" type="text" maxlength="20" autocomplete="nickname" placeholder="เช่น ยายบุญ">
      <button class="btn go" data-act="mineGo">${ic('arrow', 26, '#fff')} ถัดไป: ทำแบบประเมิน</button>
      <button class="btn ghost sm" data-act="welcomeBack">ย้อนกลับ</button>
    </section>`;
  }
  return `<section class="view welcome">
    <div class="w-art">${sprite('greet', 200)}</div>
    <h1 class="h">ยินดีต้อนรับสู่ก้าวรวมใจ</h1>
    <p>เดินจริง ตัวละครโต ชวนเพื่อนเดินเป็นก๊วน</p>
    <button class="btn go" data-act="startMine">${ic('feet', 28, '#fff')} เริ่มใช้ของฉัน</button>
    <button class="btn ghost" data-act="useSample">ดูตัวอย่าง (ป้าแดง)</button>
    <p style="font-size:.95rem">ข้อมูลเก็บในเครื่องนี้เท่านั้น · ไม่ใช่เครื่องมือแพทย์</p>
  </section>`;
};

/* ================================================================ ส่วนที่ 1 · ก้าว (สุขภาพกาย) */
V.step = () => {
  const p = perDay(), goal = Math.max(1, S.user.dailyGoal), mins = p[6].minutes, week = p.reduce((t, d) => t + d.minutes, 0);
  const str = streak(p), done = S.today.done, lv = level(), st = stage();
  const hour = new Date().getHours();
  const hi = hour < 11 ? 'สวัสดีตอนเช้า' : hour < 16 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
  const dateTh = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'short' });
  const recent = S.log.slice(-3).reverse();
  const keys = new Set(weekKeys());
  const todaySteps = S.log.filter((s) => s.day === todayKey() && s.counted).reduce((t, s) => t + s.steps, 0);
  const weekSteps = S.log.filter((s) => keys.has(s.day) && s.counted).reduce((t, s) => t + s.steps, 0);
  const pctToday = Math.min(100, Math.round((mins / goal) * 100)), pctWeek = Math.min(100, Math.round((week / Math.max(1, S.user.weeklyGoal)) * 100));
  const g = goalSource(), r = readinessToday(), a = currentAssessment();
  const rs = recoveryStatus(S.progress), seated = isSeatedOnlyMode(), recWalk = isRecoveryWalkMode();

  speech = rs === 'FROZEN' || rs === 'WAITING_CLEARANCE'
    ? `${hi} ${S.user.name} ตอนนี้ท่านอยู่ในโหมดพักฟื้น สแตกไม่ลด และไม่ถ่วงคะแนนก๊วน พักให้เต็มที่นะคะ`
    : `${hi} ${S.user.name} ภารกิจวันนี้ เดิน${recWalk ? 'ฟื้นตัวเบาๆ' : 'ต่อเนื่อง'} ${goal} นาที ${done ? 'ทำครบแล้ว เก่งมาก' : `เดินแล้ว ${mins} นาที`}`;

  const statusTag = rs === 'WAITING_CLEARANCE'
    ? '<span class="ph-tag warn">รอถามแพทย์ · ระดับ 0 ท่านั่ง</span>'
    : rs === 'FROZEN'
      ? '<span class="ph-tag info">กำลังพักฟื้น · สแตกไม่ลด</span>'
      : rs === 'RECOVERING'
        ? `<span class="ph-tag ok">โหมดฟื้นตัว · ขั้น ${S.progress.recovery?.stageCap || 'A'}</span>`
        : a ? `<span class="ph-tag ${r ? READY_LABEL[r.status][1] : ''}">${r ? READY_LABEL[r.status][0] : 'ยังไม่เช็กความพร้อมวันนี้'}</span>` : '';

  return `<section class="view">
    ${sampleBar()}
    <div class="profile-header card">
      <div class="ph-left">
        <div class="ph-avatar">${head(done ? 'head_happy' : 'head_greet', 58)}<span class="ph-lv">Lv.${lv}</span></div>
        <div class="ph-info">
          <div class="ph-date">${dateTh} · ${hi}</div>
          <div class="ph-name-row"><h1 class="h title">${esc(S.user.name)}</h1><span class="ph-stage">${st.name}</span></div>
          <div class="ph-tags">
            ${g.from === 'tier' ? `<span class="ph-tag ok">ระดับ ${g.tier} · ${TIERS[g.tier].name}</span>` : '<span class="ph-tag">ยังไม่ได้ประเมิน</span>'}
            ${statusTag}
          </div>
        </div>
      </div>
      ${tools()}
    </div>

    ${absenceBanner()}

    ${rs === 'FROZEN' || rs === 'WAITING_CLEARANCE' ? `<div class="card stack-v" style="background:linear-gradient(135deg,#EFF6FF,#FFFFFF);border:1.5px solid #93C5FD">
      <div class="row" style="gap:10px">${ic('heart', 24, '#2563EB')}<b class="h" style="color:var(--skyd)">${rs === 'WAITING_CLEARANCE' ? 'รอถามแพทย์/เจ้าหน้าที่ · เปิดเฉพาะท่านั่ง (ระดับ 0)' : `กำลังพักฟื้นเพราะ${esc(FREEZE_REASONS[S.progress.freeze.reason].label)}`}</b></div>
      <p class="sub" style="margin:0">พักร่างกายให้เต็มที่นะคะ สแตกความต่อเนื่อง (${S.progress.stack} สัปดาห์) ถูกเก็บรักษาไว้ไม่ลดลง และไม่ทำให้คะแนนของก๊วนลดลงค่ะ</p>
      <div class="grid2">
        <button class="btn go sm" data-go="return">${rs === 'WAITING_CLEARANCE' ? 'ถามแพทย์แล้ว กลับมาเริ่ม' : 'หายดีแล้ว กลับมา'}</button>
        <button class="btn ghost sm" data-go="hobby">งานอดิเรกนั่งนิ่ง</button>
      </div>
    </div>` : ''}

    <div class="card mission-hero ${done ? 'is-done' : ''}">
      <div class="mh-top">
        <span class="mh-kicker">${ic('pulse', 18, '#15803D', 2.4)} ${seated ? 'ภารกิจท่านั่งวันนี้' : recWalk ? 'ภารกิจเดินฟื้นตัววันนี้' : 'ภารกิจวันนี้'}</span>
        ${str ? `<span class="streak-pill">${ic('fire', 17, '#C2410C', 2.3)} เดินติดกัน <b>${str} วัน</b></span>` : ''}
      </div>
      <div class="mh-body">
        <div class="mh-ring-wrap">${ring(mins / goal, 138, 13, '#16A34A', `<span class="ring-kicker">${done ? 'สำเร็จ' : seated ? 'ท่านั่ง' : 'เดินแล้ว'}</span><span class="h tnum ring-big">${Math.min(mins, 999)}</span><span class="ring-unit">จาก ${goal} นาที</span>`)}</div>
        <div class="mh-content">
          <div class="mh-title-row"><h2 class="h mh-title">${seated ? `ท่านั่งเบาๆ ${goal} นาที` : recWalk ? `เดินฟื้นตัว ${goal} นาที` : `เดินต่อเนื่อง ${goal} นาที`}</h2><span class="mh-pct tnum">${pctToday}%</span></div>
          <p class="mh-status ${done ? 'done' : ''}">${seated ? 'ทำท่าบริหารท่านั่งเบาๆ ตามกำลัง หรือพักผ่อนให้เต็มที่ค่ะ' : done ? 'ทำภารกิจวันนี้ครบแล้ว พรุ่งนี้มาเดินกันใหม่' : mins > 0 ? `เหลืออีก ${Math.max(0, goal - mins)} นาที` : `เมื่อวานเดินได้ ${p[5].minutes} นาที`}</p>
          <div class="mh-badges"><span class="mh-badge">${ic('star', 16, '#B45309')} ครบภารกิจ +${XP_PER_MISSION} แต้ม</span><span class="mh-badge">${ic('info', 16, '#15803D')} ${recWalk ? 'คุมความหนักด้วย Talk Test' : g.from === 'tier' ? 'เป้าจากผลประเมิน' : 'เป้าตั้งต้น (ยังไม่ประเมิน)'}</span></div>
        </div>
      </div>
      <div class="vitals-grid">
        <div class="vital-box"><span class="vb-ic">${ic('feet', 22, '#15803D')}</span><div class="vb-txt"><span class="vb-lbl">${todaySteps ? 'ก้าววันนี้' : 'ก้าวสัปดาห์นี้'}</span><b class="vb-val tnum">${nf(todaySteps || weekSteps)} <small>ก้าว</small></b></div></div>
        <div class="vital-box"><span class="vb-ic">${ic('chart', 22, '#15803D')}</span><div class="vb-txt"><span class="vb-lbl">สัปดาห์นี้</span><b class="vb-val tnum">${week}/${S.user.weeklyGoal} <small>นาที</small></b></div></div>
        <div class="vital-box"><span class="vb-ic">${ic('fire', 22, '#C2410C')}</span><div class="vb-txt"><span class="vb-lbl">สแตกสะสม</span><b class="vb-val tnum">${S.progress.stack} <small>สัปดาห์</small></b></div></div>
      </div>
    </div>

    ${seated ? `<div class="grid2">
      <button class="btn go sm" data-go="plan">${ic('sprout', 24, '#fff')} ท่าบริหารท่านั่ง</button>
      <button class="btn blue sm" data-go="hobby">${ic('sparkle', 24, '#fff')} งานอดิเรกนั่งนิ่ง</button>
    </div>` : `<button class="btn go cta-walk" data-act="start">
      <span class="cta-ic">${ic('feet', 32, '#fff')}</span>
      <span class="cta-txt"><b>${done ? 'เดินเพิ่ม' : recWalk ? 'เริ่มเดินฟื้นตัวเบาๆ' : 'เริ่มเดินทำภารกิจ'}</b><small>${recWalk ? 'เดินช้าได้ ใช้การพูดวัดความเหนื่อย (ไม่ต้องเร่ง 1.5 ก้าว/วิ)' : 'เดินติดกันอย่างน้อย 3 นาทีจึงนับ'}</small></span>
      <span class="cta-arrow">${ic('arrow', 26, '#fff')}</span>
    </button>`}

    ${planCard()}

    <div class="card section-card">
      <div class="sec-header"><h2 class="sec-title">การเดิน 7 วันล่าสุด</h2>
        <div class="wk-summary"><span class="wk-num tnum">รวม <b>${week}</b>/${S.user.weeklyGoal} นาที</span><div class="bar sm" style="width:120px"><i style="width:${pctWeek}%"></i></div></div></div>
      ${weekChart(p, goal)}
    </div>

    <button class="card device-banner" data-go="device" style="text-align:left;width:100%">
      <div class="db-icon">${ic('clip', 30)}</div>
      <div class="db-info">
        <div class="db-title-row"><b class="h">ตัวหนีบนับก้าว ${esc(S.user.deviceId)}</b><span class="tag s">ข้อมูลตัวอย่าง</span></div>
        <div class="db-sub"><span>ผ่าน${esc(S.device.hub)}</span><span>· ส่งล่าสุด ${ago(S.device.lastSyncAt)}</span></div>
      </div>
      <div class="db-right"><span class="batt" style="color:var(--god);font-weight:700;font-size:.95rem"><i><b style="width:${S.device.battery * 0.22}px"></b></i>${S.device.battery}%</span><span class="db-link">รายละเอียด ${ic('chev', 16)}</span></div>
    </button>

    <div class="card section-card">
      <div class="sec-header" style="margin-bottom:8px"><h2 class="sec-title">การเดินล่าสุด</h2><button class="link-btn" data-go="history">ดูทั้งหมด (${S.log.length}) ${ic('chev', 18)}</button></div>
      <div class="sess-list">${recent.map(sessRow).join('') || '<div class="sub" style="padding:14px 0">ยังไม่มีการเดิน</div>'}</div>
    </div>
    <div class="sample">${isSample() ? 'ข้อมูลตัวอย่างสำหรับสาธิต · ' : ''}ก้าวรวมใจไม่ใช่เครื่องมือแพทย์</div>
  </section>`;
};

V.walk = () => {
  if (!walk) { location.hash = '#/step'; return ''; }
  const goal = S.user.dailyGoal * 60, el = walkElapsed(), reached = el >= goal;
  const recWalk = !!walk.relaxed;
  speech = `กำลังเดิน ${Math.floor(el / 60)} นาที ${nf(walkSteps(el, recWalk))} ก้าว ${recWalk ? 'โหมดเดินฟื้นตัว ไม่ต้องรีบ' : 'โหมดจำลอง'}`;
  return `<section class="view walk" style="gap:14px">
    <div class="top"><span class="pill" style="background:rgba(255,255,255,.2);color:#fff"><i class="dot"></i> ${walk.paused ? 'พักอยู่' : recWalk ? 'โหมดพักฟื้น · ผ่อนปรน Talk Test' : 'โหมดจำลอง · ก้าวสร้างจากเวลา'}</span>
      <span class="row" style="gap:6px;font-size:.95rem">${ic('clip', 20, '#fff', 2)} ${S.settings.speed > 1 ? `เร่งเวลา ×${S.settings.speed}` : 'เวลาจริง'}</span></div>
    <div style="text-align:center;margin-top:4px"><div class="timer" id="w-time">${mmss(el)}</div><div style="opacity:.92;font-size:1.05rem">นาที : วินาที · เป้าวันนี้ ${S.user.dailyGoal} นาที</div></div>
    <div class="wbar" aria-hidden="true"><i id="w-bar" style="width:${Math.min(100, (el / goal) * 100)}%"></i></div>
    <div style="position:relative;height:210px">
      <div style="position:absolute;left:40px;right:40px;bottom:6px;height:56px;border-radius:50%;background:rgba(255,255,255,.14)"></div>
      <div class="char ${walk.paused ? 'm-breathe' : 'm-run'}" style="bottom:18px">${sprite(walk.paused ? 'greet' : 'run', 195)}</div>
    </div>
    <div class="grid2"><div class="glass"><div class="h tnum" id="w-steps" style="font-size:2.1rem;line-height:1.1">${nf(walkSteps(el, recWalk))}</div><div>ก้าว (จำลอง)</div></div>
      <div class="glass"><div class="h tnum" style="font-size:2.1rem;line-height:1.1">${walk.paused ? '0' : recWalk ? '1.15' : '1.8'}</div><div>${recWalk ? 'เดินช้าสบายๆ' : 'ก้าวต่อวินาที'}</div></div></div>
    <div class="chip">${ic('shield', 26, '#15803D')}<span id="w-state">${reached ? '<b>ครบภารกิจแล้ว</b> · กดจบการเดินได้เลย' : recWalk ? '<b>Talk Test:</b> เดินแล้วพูดเป็นประโยคได้แต่ร้องเพลงไม่ได้ (ไม่ต้องเร่งความเร็ว)' : '<b>ระบบจะตรวจเดินจริงตอนจบ</b> · จังหวะ ความสม่ำเสมอ และลายเซ็น'}</span></div>
    ${recWalk ? `<button class="chip" data-act="toggleTalk" style="text-align:left">${ic('smile', 28, walk.talkOk ? '#15803D' : '#C2410C')}<span>${walk.talkOk ? '<b>ตอนนี้พูดเป็นประโยคได้สบายๆ</b> (แตะเพื่อสลับถ้ารู้สึกหอบ)' : '<b>รู้สึกหอบ พูดไม่เป็นประโยค</b> · ควรชะลอหรือพักก่อนนะคะ'}</span></button>` : ''}
    <button class="chip" data-act="together" style="text-align:left">${head('head_main', 38)}<span>${walk.together ? '<b>จำลอง: เดินอยู่กับลุงชัย</b> · ได้โบนัสเดินด้วยกัน' : 'แตะเพื่อจำลอง: ตัวหนีบของเพื่อนอยู่ใกล้กัน'}</span></button>
    <div class="grid2" style="grid-template-columns:1fr 1.6fr;margin-top:auto">
      <button class="btn" data-act="pause" style="color:#fff;box-shadow:0 0 0 2.5px rgba(255,255,255,.8) inset">${ic(walk.paused ? 'feet' : 'pause', 24, '#fff')} ${walk.paused ? 'เดินต่อ' : 'พัก'}</button>
      <button class="btn" data-act="finish" style="background:#fff;color:var(--god);box-shadow:0 5px 0 rgba(0,0,0,.18)">จบการเดิน</button>
    </div>
  </section>`;
};

V.done = () => {
  const r = S.lastResult;
  if (!r) { location.hash = '#/step'; return ''; }
  const lv = level(), st = stage(), into = xpIntoLevel(S.user.xp);
  const all = [...r.checks, r.signature];
  const rows = all.map((c) => `<div class="check"><span class="${c.ok ? 'ok' : 'no'}">${ic(c.ok ? 'check' : 'x', 15, 'currentColor', 3)}</span><span><b>${esc(c.label)}</b> <span class="sub">(${esc(c.rule)})</span></span></div>`).join('');
  if (r.counted) {
    const [pose, motion] = pendingCelebrate || CELEB[0];
    const left = Math.max(0, S.user.dailyGoal - tMin());
    speech = `${r.xpGain ? 'ภารกิจสำเร็จ' : 'บันทึกการเดินแล้ว'} เดิน ${Math.round(r.durationSec / 60)} นาที ${nf(r.steps)} ก้าว ${r.xpGain ? `ได้ ${r.xpGain} แต้ม` : ''} วันนี้รู้สึกอย่างไร`;
    return `<section class="view" id="done">
      <div class="card" style="text-align:center;background:linear-gradient(135deg,#ECFDF3,#FFFFFF)">
        <span class="tag t-ok" style="margin-bottom:6px">${ic('check', 14, 'currentColor', 3)} ${r.relaxed ? 'ผ่านเกณฑ์เดินฟื้นตัว (Talk Test)' : 'ผ่านเกณฑ์เดินจริง'}${r.sim ? ' (จำลอง)' : ''}</span>
        <h1 class="h" style="font-size:1.95rem;margin:0;color:var(--god)">${r.xpGain ? 'ภารกิจวันนี้สำเร็จ' : 'บันทึกการเดินแล้ว'}</h1>
        <div class="sub" style="font-size:1.05rem;margin-top:4px">เดินรวม ${fmtMin(r.durationSec)} · <b>${nf(r.steps)} ก้าว</b>${r.together ? ' · เดินกับลุงชัย' : ''}</div>
      </div>
      ${r.talkWarn ? '<div class="note warn">รอบนี้รู้สึกหอบจนพูดไม่เป็นประโยค ครั้งหน้าลองเดินให้ช้าลงอีกนิดและพักบ่อยขึ้นนะคะ</div>' : ''}
      ${heroCard(pose, motion, lv, st, into, r.levelUp ? (r.stageUp ? `โตขึ้นเป็น "${st.name}"` : `เลเวลอัป เลเวล ${lv}`) : (r.xpGain ? `+${r.xpGain} แต้ม` : S.today.done ? 'เดินเพิ่ม เก่งมาก' : `อีก ${left} นาทีครบภารกิจ`))}
      <div class="card"><div class="row" style="gap:8px;margin-bottom:6px">${ic('shield', 24, '#15803D')}<b class="h" style="font-size:1.15rem">ผลตรวจ ${all.length} ข้อ</b></div>${rows}</div>
      <div class="card"><div class="h" style="font-size:1.15rem;margin-bottom:4px">หลังเดินรู้สึกอย่างไร</div>
        <div class="sub" style="font-size:.95rem;margin-bottom:10px">ถ้าเหนื่อย 2 ครั้งติด ระบบจะลดเวลาภารกิจให้เอง (ไม่ต่ำกว่า 5 นาที)</div>
        <div class="grid3">${['fun', 'neutral', 'tired'].map((f) => `<button class="feel" data-feel="${f}" aria-pressed="${r.feeling === f}">${face(f)}<b>${FEEL_SHORT[f]}</b></button>`).join('')}</div></div>
      <button class="btn go" data-act="share">${ic('team', 26, '#fff')} ให้เพื่อนในก๊วนเห็น</button>
      <div class="grid2"><button class="btn ghost sm" data-go="me">${ic('sprout', 22, '#B45309')} ดูตัวละคร</button><button class="btn ghost sm" data-go="step">กลับหน้าแรก</button></div>
    </section>`;
  }
  const kind = r.gaitOk ? 'data' : r.reason === 'short' ? 'short' : 'shake';
  const msg = {
    short: ['ครั้งนี้ยังไม่นับ เวลาเดินยังน้อยกว่าเกณฑ์', r.relaxed ? 'เดินต่ออีกนิด อย่างน้อย 1 นาทีในโหมดฟื้นตัว' : 'เดินต่ออีกนิด ต้องเดินติดกันอย่างน้อย 3 นาที', 'อีกนิดเดียว สู้ๆ', 'think', 'm-breathe'],
    shake: ['ครั้งนี้ไม่นับ เพราะสัญญาณไม่ใช่การเดิน', 'จังหวะคล้ายการเขย่าด้วยมือ ไม่ใช่การก้าวเดิน', 'เขย่ามือไม่นับนะ', 'angry', 'm-shake'],
    data: ['ครั้งนี้ไม่นับ เพราะข้อมูลไม่ผ่านการตรวจ', 'ข้อมูลไม่ผ่านการตรวจ เช่น ส่งซ้ำ หรือเวลาทับกับครั้งก่อน', 'ข้อมูลไม่ผ่านการตรวจ', 'think', 'm-breathe'],
  }[kind];
  speech = msg[0];
  return `<section class="view">
    <div class="card" style="text-align:center;background:#FFF5F6;border-color:#FECDD3">
      <span class="tag t-no" style="margin-bottom:6px">${ic('x', 14, 'currentColor', 3)} ไม่ผ่านเกณฑ์${r.sim ? ' (จำลอง)' : ''}</span>
      <h1 class="h" style="font-size:1.75rem;margin:0;color:#9F1D39">ครั้งนี้ยังไม่นับ</h1>
      <div class="sub" style="margin-top:4px;color:#7F1D33">${msg[1]}</div>
    </div>
    <div class="hero st${stage().stage}"><div class="sunb"></div><div class="hill"></div><div class="hill b"></div>
      <div class="bubble">${msg[2]}</div><div class="ped"></div><div class="char ${msg[4]}">${sprite(msg[3], 220)}</div></div>
    <div class="card"><b class="h" style="font-size:1.15rem">ผลตรวจ</b>${rows}</div>
    <div class="note" style="background:var(--suns);color:var(--sunt)">ระบบนับเฉพาะการเดินจริง เพื่อให้ยุติธรรมกับทุกก๊วน</div>
    <button class="btn go" data-act="start">${ic('feet', 28, '#fff')} ลองเดินอีกครั้ง</button>
    <button class="btn ghost sm" data-go="step">กลับหน้าแรก</button>
  </section>`;
};

V.history = () => {
  const p = perDay(), keys = new Set(weekKeys());
  const wk = S.log.filter((s) => keys.has(s.day)), counted = wk.filter((s) => s.counted);
  const mins = counted.reduce((t, s) => t + s.minutes, 0), steps = counted.reduce((t, s) => t + s.steps, 0), rejected = wk.length - counted.length;
  speech = `ประวัติการเดิน 7 วัน นับ ${counted.length} ครั้ง รวม ${mins} นาที ${nf(steps)} ก้าว ไม่นับ ${rejected} ครั้ง`;
  const stat = (v, t) => `<div class="card" style="text-align:center;padding:14px 8px"><div class="h tnum" style="font-size:1.65rem;line-height:1.15;color:var(--god)">${v}</div><div style="font-weight:700;font-size:.95rem;margin-top:2px">${t}</div></div>`;
  return `<section class="view">
    ${sampleBar()}
    <div class="top">${back('step')}<div style="flex:1;min-width:0"><h1 class="h title">ประวัติการเดิน</h1></div>${tools()}</div>
    <div class="grid3">${stat(counted.length, 'ครั้งที่นับ')}${stat(mins, 'นาที')}${stat(nf(steps), 'ก้าว')}</div>
    <div class="card section-card"><div class="sec-header"><h2 class="sec-title">7 วันล่าสุด</h2></div>${weekChart(p, S.user.dailyGoal)}</div>
    ${rejected ? `<div class="note row" style="background:#FFF1F2;color:#9F1D39;border:1px solid #FECDD3">${ic('shield', 24, '#E11D48')}<span>ไม่นับ <b>${rejected} ครั้ง</b> ใน 7 วัน เพราะเขย่ามือหรือเดินสั้นกว่าเกณฑ์</span></div>` : ''}
    <div class="card section-card"><div class="sec-header" style="margin-bottom:6px"><h2 class="sec-title">ทั้งหมด ${S.log.length} รายการ</h2></div>
      <div class="sess-list">${S.log.slice().reverse().map(sessRow).join('') || '<div class="sub">ยังไม่มีการเดิน</div>'}</div></div>
    <div class="sample">เก็บเฉพาะจำนวนก้าว เวลา และความรู้สึก · ไม่เก็บพิกัด GPS</div>
  </section>`;
};

V.device = () => {
  const s = S.device, bt = 'bluetooth' in navigator;
  speech = `ตัวหนีบนับก้าว ${S.user.deviceId} ข้อมูลตัวอย่าง แบตเตอรี่ ${s.battery} เปอร์เซ็นต์`;
  const rule = (t) => `<div class="check"><span class="ok">${ic('check', 15, 'currentColor', 3)}</span><span>${t}</span></div>`;
  const srv = serverOnline ? `ออนไลน์${serverInfo?.count != null ? ` · บันทึกแล้ว ${serverInfo.count} ครั้ง` : ''}` : 'ออฟไลน์ (ตรวจในเครื่อง)';
  return `<section class="view">
    ${sampleBar()}
    <div class="top">${back('step')}<div style="flex:1;min-width:0"><h1 class="h title">ตัวหนีบนับก้าว</h1></div>${tools()}</div>
    <div class="card row" style="gap:18px;background:linear-gradient(135deg,#ECFDF3,#FFFFFF);border:1.5px solid #BBF7D0">
      <svg width="90" height="114" viewBox="0 0 86 110" aria-hidden="true" style="flex:none"><rect x="12" y="6" width="62" height="98" rx="31" fill="#fff" stroke="#86EFAC" stroke-width="3.5"/><circle cx="43" cy="48" r="21" fill="#DCFCE7"/><circle cx="43" cy="48" r="13" fill="#15803D"/><rect x="34" y="82" width="18" height="6" rx="3" fill="#4ADE80"/></svg>
      <div style="line-height:1.55;min-width:0">
        <span class="tag s" style="margin-bottom:4px">ข้อมูลตัวอย่าง · ตัวหนีบยังไม่ส่งข้อมูลจริง</span>
        <div class="h" style="font-size:1.35rem">${esc(S.user.deviceId)}</div>
        <span class="batt" style="color:var(--god);font-weight:700"><i><b style="width:${s.battery * 0.22}px"></b></i>แบตเตอรี่ ${s.battery}%</span>
      </div>
    </div>
    <div class="card"><div class="h" style="font-size:1.15rem;margin-bottom:12px">ข้อมูลเดินทางอย่างไร</div>
      <div class="flow">
        <div class="n"><span class="ico">${ic('clip', 28)}</span><b>ตัวหนีบที่เอว</b><span class="sub" style="font-size:.9rem">นับก้าว + เซ็น</span></div><span class="ar">${ic('arrow', 22)}</span>
        <div class="n"><span class="ico" style="background:var(--suns);color:var(--sunt)">${ic('home', 28)}</span><b>สถานีที่บ้าน</b><span class="sub" style="font-size:.9rem">รับบลูทูธ</span></div><span class="ar">${ic('arrow', 22)}</span>
        <div class="n"><span class="ico" style="background:var(--skys);color:var(--skyd)">${ic('server', 28)}</span><b>เซิร์ฟเวอร์</b><span class="sub" style="font-size:.9rem">ตรวจลายเซ็น</span></div>
      </div>
    </div>
    <div class="card">
      <div class="kv"><span class="sub">สถานีรับข้อมูล</span><b>${esc(s.hub)}</b></div>
      <div class="kv"><span class="sub">ส่งล่าสุด</span><b>${ago(s.lastSyncAt)}</b></div>
      <div class="kv"><span class="sub">เลขลำดับข้อมูล</span><b class="tnum">${S.seq}</b></div>
      <div class="kv"><span class="sub">ลายเซ็น</span><b>HMAC-SHA256</b></div>
      <div class="kv"><span class="sub">เซิร์ฟเวอร์</span><b id="srv-info" style="color:${serverOnline ? 'var(--go)' : 'var(--sunt)'}">${srv}</b></div>
    </div>
    <div class="card"><div class="row" style="gap:8px;margin-bottom:6px">${ic('shield', 24, '#15803D')}<b class="h" style="font-size:1.15rem">นับเป็นการเดินจริงเมื่อผ่านทุกข้อ</b></div>
      ${rule(`เดิน ${RULES.cadenceMin}–${RULES.cadenceMax} ก้าวต่อวินาที`)}${rule('จังหวะสม่ำเสมอ ไม่ใช่การเขย่า')}${rule(`เดินติดกันอย่างน้อย ${RULES.minContinuousSec / 60} นาที`)}${rule('ไม่เกิน 150 ก้าวต่อนาที')}${rule('มีลายเซ็นของตัวหนีบ ส่งซ้ำไม่ได้')}${rule('โหมดพักฟื้น / ไม้เท้า / วอล์กเกอร์: ผ่อนปรนใช้เวลาเดิน + Talk Test')}
      <p class="sub" style="margin:8px 0 0">เกณฑ์ตั้งจากการจำลอง (ค่าออกแบบ) ต้องปรับจากการทดลองกับผู้สูงอายุจริง</p></div>
    ${bt ? `<button class="btn blue" data-act="ble">${ic('bt', 24, '#fff')} จับคู่ตัวหนีบทางบลูทูธ</button>` : `<div class="note">${ic('info', 20)} เบราว์เซอร์นี้เชื่อมบลูทูธโดยตรงไม่ได้ (เช่น iPhone และ Firefox) ใช้สถานีรับข้อมูลที่บ้านแทน</div>`}
    <button class="btn ghost sm" data-act="buzz">${ic('bell', 22)} ทดสอบให้ตัวหนีบสั่น (จำลอง)</button>
  </section>`;
};

/* ================================================================ ส่วนที่ 2 · ตัวละคร (สุขภาพใจ) */
V.me = () => {
  const lv = level(), st = stage(), into = xpIntoLevel(S.user.xp), p = perDay();
  const wk = p.reduce((t, d) => t + d.minutes, 0), recentFeel = S.feelings.slice(-7);
  const fun = S.feelings.slice(-5).filter((f) => f === 'fun').length;
  const unlocked = POSES.filter((x) => x.level <= lv);
  const b = badges({ log: S.log, perDay: p, togetherCount: S.togetherCount, feelings: S.feelings, level: lv, stage: st.stage });
  const pv = posePreview && POSES.find((x) => x.id === posePreview);
  const frozen = !!(S.progress.freeze || S.progress.waitingClearance);
  const pose = pv ? pv.id : frozen ? 'sleep' : S.today.done ? 'happy' : 'main', motion = pv ? pv.motion : 'm-breathe';
  speech = `ตัวละครของ${S.user.name} เลเวล ${lv} ขั้น ${st.name} ปลดล็อก ${unlocked.length} ท่า ได้เหรียญ ${b.filter((x) => x.got).length} เหรียญ`;
  const stat = (icon, a, c2, w, c) => `<div class="pillar-row"><div class="row" style="justify-content:space-between;font-size:.98rem;gap:8px"><span class="row" style="gap:8px">${ic(icon, 20, c)}<b>${a}</b></span><span class="sub" style="font-weight:700">${c2}</span></div><div class="bar" style="margin-top:6px"><i style="width:${Math.min(100, w)}%;background:${c}"></i></div></div>`;
  return `<section class="view">
    ${sampleBar()}
    <div class="top"><div class="col" style="gap:2px;min-width:0"><h1 class="h title">ตัวละครของ${esc(S.user.name)}</h1></div>${tools()}</div>
    ${heroCard(pose, motion, lv, st, into, pv ? `ท่า${pv.name}` : frozen ? 'พักผ่อนให้หายไวๆ นะ' : 'แตะที่ตัวฉันสิ', true)}
    ${charPanel()}
    ${moodCard()}
    ${hobbyPromoCard()}
    ${brainPromoCard()}
    <div class="card col" style="gap:14px">
      <div class="sec-header" style="margin-bottom:0"><h2 class="sec-title">สัปดาห์นี้</h2></div>
      ${stat('feet', 'เดิน', `${wk}/${S.user.weeklyGoal} นาที`, (wk / Math.max(1, S.user.weeklyGoal)) * 100, '#16A34A')}
      ${stat('smile', 'รู้สึกสนุก', `${fun}/5 ครั้งล่าสุด`, fun * 20, '#D97706')}
      ${stat('team', 'เดินกับเพื่อน', `${S.togetherCount} ครั้ง`, S.togetherCount * 25, '#2563EB')}
    </div>
    ${!isSeatedOnlyMode() ? `<button class="btn go" data-act="start">${ic('feet', 28, '#fff')} ไปเดินให้ตัวละครโต</button>` : ''}
    ${recentFeel.length ? `<div class="card section-card"><div class="sec-header"><h2 class="sec-title">ความรู้สึกหลังเดิน</h2><span class="sub" style="font-size:.95rem">${recentFeel.length} ครั้งล่าสุด</span></div>
      <div class="moods">${recentFeel.map((f) => `<div class="mood-item">${face(f, 40)}<b>${FEEL_SHORT[f]}</b></div>`).join('')}</div></div>` : ''}
    <div class="card section-card">
      <div class="sec-header"><h2 class="sec-title">เส้นทางการเติบโต 5 ขั้น</h2><span class="tag" style="background:var(--suns);color:var(--sunt)">ขั้น ${st.stage}/5</span></div>
      <div class="stages-track">${STAGES.map((s) => {
        const lock = s.stage > st.stage, cur = s.stage === st.stage;
        return `<div class="stage-node ${cur ? 'current' : ''} ${lock ? 'locked' : ''}"><div class="sn-art">${sprite(s.stage === 5 ? 'main' : 'greet', 78 * SCALE[s.stage], lock ? 'filter:grayscale(1) opacity(.38)' : '')}</div>
          <div class="sn-name">${({ 'นักเดินหน้าใหม่': 'หน้าใหม่', 'นักเดินประจำ': 'ประจำ', 'ตำนานแห่งก๊วน': 'ตำนาน' })[s.name] || s.name}</div><div class="sn-lv">Lv.${s.fromLevel}</div></div>`;
      }).join('')}</div>
    </div>
    <div class="card section-card">
      <div class="sec-header"><h2 class="sec-title">ท่าทางของตัวละคร</h2><span class="sub" style="font-size:.95rem">ปลดล็อก ${unlocked.length}/${POSES.length}</span></div>
      <div class="poses">${POSES.map((x) => {
        const lock = x.level > lv;
        return `<button class="pose ${lock ? 'lock' : ''}" data-pose="${x.id}" aria-pressed="${posePreview === x.id}" ${lock ? `aria-label="${x.name} ปลดล็อกที่เลเวล ${x.level}"` : ''}><span class="pi">${sprite(x.id, 62)}</span>${lock ? `<span class="row" style="gap:3px">${ic('lock', 14, 'currentColor', 2.4)}Lv.${x.level}</span>` : `<span>${x.name}</span>`}</button>`;
      }).join('')}</div>
    </div>
    <div class="card section-card">
      <div class="sec-header"><h2 class="sec-title">เหรียญความสำเร็จ</h2><span class="sub" style="font-size:.95rem">${b.filter((x) => x.got).length}/${b.length}</span></div>
      <div class="badges">${b.map((x) => `<div class="bdg ${x.got ? 'got' : 'lock'}"><span class="ico">${ic(x.got ? x.icon : 'lock', 24, 'currentColor', 2.2)}</span><div><b>${x.name}</b><span>${x.got ? 'ได้แล้ว' : `${x.how} · ${x.prog}`}</span></div></div>`).join('')}</div>
    </div>
  </section>`;
};

/* ================================================================ ส่วนที่ 3 · ก๊วน (สุขภาพสังคม + เกราะคะแนนคนพักฟื้น) */
V.team = () => {
  const teams = allTeams(), rank = teams.findIndex((t) => t.mine) + 1, mine = teams.find((t) => t.mine);
  const hasScore = mine.score !== null;
  const otherWithScore = teams.filter((t) => !t.mine && t.score !== null);
  const gap = !hasScore || !otherWithScore.length ? 0 : (rank === 1 ? mine.score - otherWithScore[0].score : teams[0].score - mine.score);
  const notYet = S.team.members.filter((m) => !m.today && !m.me && !m.frozen);
  const walked = S.team.members.filter((m) => m.today && !m.frozen);
  const frozenCount = S.team.members.filter((m) => m.frozen).length;
  const mt = S.team.meetup;
  speech = hasScore
    ? `${S.team.name} ${S.team.members.length} คน คะแนน ${Math.round(mine.score)} อันดับ ${rank} ของตำบล วันนี้เดินแล้ว ${walked.length} คน`
    : `${S.team.name} สมาชิกทุกคนกำลังพักผ่อน`;

  return `<section class="view">
    ${sampleBar()}
    <div class="top"><div class="col" style="gap:2px;min-width:0"><h1 class="h title">${esc(S.team.name)}</h1><div class="sub">${S.team.members.length} คน${hasScore ? ` · อันดับ ${rank} ของตำบล` : ' · กำลังพักผ่อน'} · วันนี้เดินแล้ว ${walked.length} คน${frozenCount ? ` · พักฟื้น ${frozenCount} คน` : ''}</div></div>${tools()}</div>
    <div class="scene"><div class="path"></div><div style="position:absolute;left:22px;top:20px;width:48px;height:48px;border-radius:50%;background:#FFE28A;box-shadow:0 0 0 10px rgba(255,226,138,.3)"></div>
      <div class="row">${S.team.members.slice(0, 6).map((m) => `<div class="member"><div style="display:flex;justify-content:center;height:96px;align-items:flex-end">${sprite(m.frozen ? 'sleep' : m.today ? m.look : 'sleep', 92)}</div>${m.frozen ? `<span class="badge" style="background:var(--sky)">${ic('heart', 13, '#fff', 3)}</span>` : m.today ? `<span class="badge">${ic('check', 13, '#fff', 3.4)}</span>` : ''}<div class="nm">${esc(m.name)}</div><div class="nm-sub" style="${m.frozen ? 'color:var(--skyd)' : ''}">${m.frozen ? 'พักฟื้น' : m.today ? 'เดินแล้ว' : 'รอเดิน'}</div></div>`).join('')}</div></div>
    <button class="card row" data-go="league" style="width:100%;text-align:left;gap:16px;background:linear-gradient(135deg,#EFF6FF,#FFFFFF);border:1.5px solid #BFDBFE">
      ${ring(hasScore ? mine.score / 100 : 0, 96, 10, '#2F6BFF', `<span class="h tnum" style="font-size:${hasScore ? '1.55rem' : '1rem'};color:var(--skyd)">${hasScore ? Math.round(mine.score) : 'พักผ่อน'}</span><span class="sub" style="font-size:.9rem">${hasScore ? 'คะแนน' : 'ทั้งก๊วน'}</span>`)}
      <span style="flex:1;line-height:1.45;min-width:0"><b class="h" style="font-size:1.2rem;font-weight:700">${hasScore ? `อันดับ ${rank} ของตำบล` : 'ก๊วนกำลังพักผ่อน'}</b><br>
        <span class="sub">${hasScore && otherWithScore.length ? `7 วันล่าสุด · ${rank === 1 ? `นำ${esc(otherWithScore[0].name)} ${Math.round(gap)} คะแนน` : `ตามอันดับ 1 อยู่ ${Math.round(gap)} คะแนน`}` : 'สมาชิกที่พักฟื้นถูกยกเว้นจากตัวหาร ไม่ทำให้คะแนนก๊วนตก'}</span></span>
      <span class="db-link" style="color:var(--skyd)">${ic('chev', 22)}</span>
    </button>
    ${frozenCount ? `<div class="note row" style="background:var(--skys);color:var(--skyd);border:1px solid #93C5FD">${ic('shield', 22, '#1E40AF')}<span>สมาชิกที่พักฟื้น (${frozenCount} คน) ได้รับการยกเว้นจากตัวหารคะแนนก๊วน และยังส่งเสียงชมให้เพื่อนได้ตามปกติค่ะ</span></div>` : ''}
    ${mt ? `<div class="note row" style="background:var(--skys);color:var(--skyd);border:1px solid #93C5FD">${ic('clock', 26, '#1E40AF')}<span><b>นัดเดินพรุ่งนี้ ${esc(mt)}</b><br>(ต้นแบบ) บันทึกในเครื่องนี้ · ระบบจริงจะแจ้งทุกคนในก๊วน</span></div>` : ''}
    <div class="note row" style="background:var(--suns);border:1px solid #FDE68A"><span class="stack">${walked.slice(0, 3).map((m) => head(m.head, 40)).join('')}</span>
      <span style="line-height:1.45"><b>เช้านี้เดินด้วยกัน ${S.team.togetherMin} นาที</b><br><span style="color:var(--sunt)">ได้โบนัสเดินด้วยกัน</span></span></div>
    <button class="btn go" data-act="meet">${ic('clock', 26, '#fff')} ${mt ? 'เปลี่ยนเวลานัดเดิน' : 'นัดเพื่อนเดินพรุ่งนี้'}</button>
    <div class="grid2">
      <button class="btn ghost sm" data-act="cheer">${ic('star', 22, '#D97706')} ส่งเสียงชม</button>
      <button class="btn ghost sm" data-act="nudge" ${notYet.length ? '' : 'disabled'}>${ic('team', 22, '#2F6BFF')} ${notYet.length ? `ชวน${esc(notYet[notYet.length - 1].name)}` : 'เดินครบทุกคนแล้ว'}</button>
    </div>
    <div class="card section-card">
      <div class="sec-header" style="margin-bottom:6px"><h2 class="sec-title">ความเคลื่อนไหวในก๊วน</h2></div>
      <div>${S.team.feed.slice(0, 5).map((f) => `<div class="feed">${head(f.head, 42)}<div style="flex:1;min-width:0"><b>${esc(f.who)}</b> <span>${esc(f.text)}</span></div><span class="tm">${esc(f.time)} น.</span></div>`).join('')}</div>
    </div>
    <div class="grid2">
      <button class="card col" data-go="invite" style="text-align:left;gap:6px">${ic('team', 28, '#2F6BFF')}<b class="h" style="font-weight:700">ชวนเพื่อนบ้าน</b><span class="sub" style="font-size:.95rem">สแกนคิวอาร์ตอนเจอกัน</span></button>
      <button class="card col" data-go="family" style="text-align:left;gap:6px">${ic('heart', 28, '#E5486B')}<b class="h" style="font-weight:700">มุมลูกหลาน</b><span class="sub" style="font-size:.95rem">${S.requests.length ? `คำขอเข้าก๊วน ${S.requests.length} รายการ` : 'ดูความคืบหน้า'}</span></button>
    </div>
    <div class="sample">ข้อมูลก๊วนเป็นตัวอย่าง (ต้นแบบยังไม่มีบัญชีผู้ใช้)</div>
  </section>`;
};

V.league = () => {
  const teams = allTeams(), scored = teams.filter((t) => t.score !== null), top = scored.slice(0, 3), mine = teams.find((t) => t.mine);
  const order = [top[1], top[0], top[2]].filter(Boolean);
  const col = { 0: 'linear-gradient(180deg,#FDE047,#F59E0B)', 1: 'linear-gradient(180deg,#E2E8F0,#CBD5E1)', 2: 'linear-gradient(180deg,#FED7AA,#F97316)' };
  speech = top[0] ? `ลีกตำบล อันดับ 1 ${top[0].name} ${Math.round(top[0].score)} คะแนน` : 'ลีกตำบล';
  return `<section class="view">
    ${sampleBar()}
    <div class="top">${back('team')}<div style="flex:1;min-width:0"><h1 class="h title">ลีกตำบล</h1><div class="sub">คะแนน 7 วันล่าสุด · อัปเดตทุกเช้า</div></div></div>
    <div class="card" style="padding-top:20px">
      <div class="podium">${order.map((t) => {
        const i = scored.indexOf(t), h = [150, 118, 96][i];
        return `<div class="pc">${sprite(i === 0 ? 'happy' : i === 1 ? 'greet' : 'cute', i === 0 ? 94 : 78)}<div class="h" style="font-size:.98rem;text-align:center;margin:4px 0">${esc(t.name)}</div>
          <div class="blk" style="height:${h}px;background:${col[i]};${t.mine ? 'box-shadow:0 0 0 3px #2563EB inset' : ''}"><span class="h tnum" style="font-size:1.85rem;color:#1E293B">${Math.round(t.score)}</span><span style="font-size:.9rem;font-weight:700;color:#334155">อันดับ ${i + 1}</span></div></div>`;
      }).join('')}</div>
      <div style="border-top:1px solid var(--line);padding-top:10px;margin-top:8px">${teams.slice(3).map((t, i) => `<div class="row" style="justify-content:space-between;padding:6px 4px"><span><b>อันดับ ${i + 4}</b> · ${esc(t.name)}</span><b class="h tnum">${t.score === null ? 'พักผ่อน' : Math.round(t.score)}</b></div>`).join('')}</div>
    </div>
    <div class="card"><div class="row" style="gap:8px">${ic('scale', 22, '#1E40AF')}<b class="h" style="font-size:1.15rem">คะแนนยุติธรรม คนเดินช้าและคนพักฟื้นไม่ถ่วงก๊วน</b></div>
      <p class="sub" style="font-size:.98rem;margin:6px 0 10px">แต่ละคนมีเป้าของตัวเอง เดินครบเป้าได้ 100 เท่ากัน · สมาชิกที่อยู่ในโหมดพักฟื้นจะถูกยกเว้นจากตัวหารชั่วคราว</p>
      ${mine.members.map((m) => {
        if (m.frozen) return `<div class="lrow"><span style="width:70px;font-weight:700">${esc(m.name)}</span><span class="tag" style="background:var(--skys);color:var(--skyd);flex:1;justify-content:center">กำลังพักฟื้น · ยกเว้นจากตัวหาร</span></div>`;
        const sc = memberScore(m.minutes, m.goal);
        return `<div class="lrow"><span style="width:70px;font-weight:700">${esc(m.name)}</span><span class="sub tnum" style="width:82px">${m.minutes}/${m.goal}</span><div class="bar"><i style="width:${sc}%;background:#2563EB"></i></div><b class="tnum" style="width:48px;text-align:right">${sc.toFixed(sc % 1 ? 1 : 0)}</b></div>`;
      }).join('')}
      <div class="row" style="justify-content:space-between;border-top:1px solid #EEF1ED;margin-top:10px;padding-top:10px"><b>เฉลี่ยสมาชิกที่ไม่ได้พักฟื้น</b><b class="h tnum" style="color:var(--skyd);font-size:1.2rem">${mine.score === null ? 'ก๊วนกำลังพักผ่อน' : `${mine.score.toFixed(1)} ≈ ${Math.round(mine.score)}`}</b></div>
    </div>
    <div class="sample">ข้อมูลก๊วนทั้งหมดเป็นข้อมูลตัวอย่าง</div>
  </section>`;
};

function pseudoQr(seed) {
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const n = 25; let cells = '';
  const fin = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if ((x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)) continue;
    if (rnd() < 0.48) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }
  return `<svg width="190" height="190" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img" aria-label="คิวอาร์ตัวอย่าง ยังใช้สแกนจริงไม่ได้"><rect width="${n}" height="${n}" fill="#fff"/><g fill="#152019">${cells}${fin(0, 0)}${fin(n - 7, 0)}${fin(0, n - 7)}</g></svg>`;
}

V.invite = () => {
  speech = 'ชวนเพื่อนเข้าก๊วน ให้เพื่อนสแกนคิวอาร์ตอนเจอกัน คิวอาร์นี้เป็นตัวอย่าง';
  return `<section class="view">
    ${sampleBar()}
    <div class="top">${back('team')}<div style="flex:1;min-width:0"><h1 class="h title">ชวนเพื่อนบ้าน</h1></div>${tools()}</div>
    <div class="card" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:22px 16px">
      <div style="padding:12px;border-radius:20px;box-shadow:0 0 0 2px #DBEAFE inset;background:#fff">${inviteLeft > 0 ? pseudoQr(7 + Math.floor(Date.now() / 600000)) : '<div style="width:190px;height:190px;display:flex;align-items:center;justify-content:center" class="sub">หมดอายุแล้ว</div>'}</div>
      <div class="sample">(ต้นแบบ) คิวอาร์ตัวอย่าง ยังสแกนจริงไม่ได้</div>
      <div class="h" style="font-size:1.25rem;text-align:center">ให้เพื่อนสแกนตอนเจอกัน</div>
      ${inviteLeft > 0 ? `<span class="pill" style="background:var(--suns);color:var(--sunt)">${ic('clock', 18, '#9A4D00')} หมดอายุใน <span id="inv-left" class="tnum">${mmss(inviteLeft)}</span></span>` : '<button class="btn go sm" data-act="newqr">สร้างคิวอาร์ใหม่</button>'}
    </div>
    <button class="btn ghost sm" data-act="line" style="justify-content:flex-start;text-align:left"><span style="width:38px;height:38px;border-radius:12px;background:#06C755;display:flex;align-items:center;justify-content:center;flex:none">${ic('chat', 20, '#fff')}</span> ให้ลูกหลานส่งลิงก์เชิญทาง LINE</button>
    <button class="btn ghost sm" data-act="nophone" style="justify-content:flex-start;text-align:left"><span style="width:38px;height:38px;border-radius:12px;background:var(--leafs);display:flex;align-items:center;justify-content:center;flex:none">${ic('clip', 20, '#15803D')}</span> เพื่อนไม่มีมือถือ ใช้ตัวหนีบอย่างเดียว</button>
    <div class="note" style="background:var(--skys)"><div class="row" style="gap:8px;margin-bottom:4px">${ic('shield', 24, '#2F6BFF')}<b class="h" style="font-size:1.1rem">ทำไมก๊วนปลอดภัยกว่าแชตทั่วไป</b></div>
      ${[['search', 'คนแปลกหน้าค้นหาก๊วนไม่เจอ'], ['star', 'ส่งได้เฉพาะเสียงชมที่ตั้งไว้'], ['nolink', 'ไม่มีลิงก์ ไม่มีการโอนเงิน'], ['heart', 'ลูกหลานหรือ อสม. อนุมัติสมาชิกใหม่'], ['team', 'ก๊วนละไม่เกิน 8 คน']].map(([i, t]) => `<div class="row" style="gap:8px;padding-top:6px">${ic(i, 20, '#1E40AF', 2.2)}<span>${t}</span></div>`).join('')}</div>
  </section>`;
};

V.family = () => {
  const f = S.family, labels = ['พ', 'พฤ', 'ศ', 'ส', 'อา', 'จ', 'วันนี้'];
  const walked = f.days.filter((d) => d === 1).length;
  speech = `มุมลูกหลาน ${f.elder} 7 วันล่าสุดเดิน ${walked} วัน ${f.minutes} นาที จากเป้า ${f.goal} นาที ข้อมูลตัวอย่าง`;
  return `<section class="view">
    ${sampleBar()}
    <div class="top">${back('team')}<div class="row" style="flex:1;min-width:0">${head('head_cute', 52)}<div style="min-width:0"><h1 class="h title">ดูแล${esc(f.elder)}</h1></div></div>${tools()}</div>
    <div class="card"><div class="row" style="justify-content:space-between;gap:8px"><b class="h" style="font-size:1.15rem">7 วันล่าสุด</b><span class="tag t-ok">เดิน ${walked} วัน</span></div>
      <div class="days" style="margin-top:10px">${f.days.map((d, i) => `<div><i class="${d === 1 ? 'y' : d === -1 ? 't' : ''}">${d === 1 ? ic('check', 16, '#fff', 3.2) : ''}</i>${labels[i]}</div>`).join('')}</div>
      <div class="row" style="justify-content:space-between;margin-top:14px;gap:8px"><span>เดินรวม <b>${f.minutes} นาที</b> (เป้า ${f.goal} นาที/สัปดาห์)</span><b class="tnum" style="color:var(--skyd)">${Math.round(memberScore(f.minutes, f.goal))}%</b></div>
      <div class="bar" style="margin-top:6px"><i style="width:${memberScore(f.minutes, f.goal)}%;background:#2563EB"></i></div>
      <p class="sub" style="font-size:.98rem;margin:10px 0 0">หลังเดินรู้สึกสนุก ${f.fun} ครั้ง · เหนื่อย ${f.tired} ครั้ง · ภารกิจวันละ ${f.missionMin} นาที</p></div>
    <div class="grid2"><button class="btn blue" data-act="voice" style="flex-direction:column;gap:4px;min-height:96px;font-size:1.05rem">${ic('mic', 26, '#fff')}อัดเสียงให้กำลังใจ</button>
      <button class="btn ghost" data-act="mission" style="flex-direction:column;gap:4px;min-height:96px;font-size:1.05rem">${ic('flag', 26, '#2F6BFF')}ปรับเวลาภารกิจ</button></div>
    ${S.requests.length ? `<div class="card" style="border:1.5px solid #FDE68A;background:#FFFBEB"><div class="row" style="gap:8px;font-weight:700;color:#92400E">${ic('shield', 20, '#92400E')} คำขอเข้าก๊วนใหม่</div>
      ${S.requests.map((r, i) => `<div class="row" style="margin-top:10px">${head('head_think', 44)}<div style="flex:1;line-height:1.4"><b>${esc(r.name)}</b><br><span class="sub">${esc(r.by)}ชวนเมื่อเช้า</span></div></div>
      <div class="grid2" style="margin-top:12px"><button class="btn go sm" data-approve="${i}">${ic('check', 20, '#fff', 3)} อนุมัติ</button><button class="btn ghost sm" data-deny="${i}">ไม่รู้จัก</button></div>`).join('')}</div>` : '<div class="card sub">ไม่มีคำขอเข้าก๊วนใหม่</div>'}
    <div class="note row" style="background:#fff;box-shadow:var(--ring)">${ic('heart', 24, '#E5486B')}<span>ลูกหลานเห็นแค่วันที่เดิน นาที และความรู้สึก ไม่เห็นตำแหน่ง ไม่เห็นรายละเอียดอาการป่วย และไม่เห็นคำตอบแบบประเมินใจ</span></div>
    <div class="sample">ข้อมูลตัวอย่าง · ไม่ใช่เครื่องมือแพทย์ ถ้าไม่สบายโทร 1669</div>
  </section>`;
};

V.settings = () => {
  speech = 'หน้าตั้งค่า ปรับขนาดตัวหนังสือ เสียงอ่าน ภาพเคลื่อนไหว และข้อมูลของฉัน';
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, t]) => `<button data-set="${key}" data-val="${v}" aria-pressed="${String(S.settings[key]) === String(v)}">${t}</button>`).join('')}</div>`;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return `<section class="view">
    ${sampleBar()}
    <div class="top">${back('step')}<div style="flex:1;min-width:0"><h1 class="h title">ตั้งค่า</h1></div></div>
    <div class="card col"><b class="h" style="font-size:1.15rem">ขนาดตัวอักษร</b>${seg('size', [['m', 'ปกติ'], ['l', 'ใหญ่'], ['xl', 'ใหญ่มาก']])}</div>
    <div class="card col"><b class="h" style="font-size:1.15rem">เสียงอ่านภาษาไทย</b>${seg('voice', [[true, 'เปิด'], [false, 'ปิด']])}
      <b class="h" style="font-size:1.15rem;margin-top:6px">ภาพเคลื่อนไหว</b>${seg('motion', [[true, 'แสดง'], [false, 'ลดการเคลื่อนไหว']])}</div>
    <div class="card col"><b class="h" style="font-size:1.15rem">ตัวหนีบนับก้าว</b>
      <div class="sub">${'bluetooth' in navigator ? 'เบราว์เซอร์นี้จับคู่บลูทูธได้' : 'เบราว์เซอร์นี้เชื่อมบลูทูธไม่ได้ ใช้สถานีรับข้อมูลที่บ้านแทน'}</div>
      <button class="btn ghost sm" data-go="device">${ic('clip', 22, '#15803D')} ดูตัวหนีบและเกณฑ์ตรวจเดินจริง</button></div>
    <div class="card col"><b class="h" style="font-size:1.15rem">แอปและข้อมูลของฉัน</b>
      ${installEvt ? `<button class="btn ghost sm" data-act="install">${ic('phone', 22, '#2F6BFF')} ติดตั้งไว้บนหน้าจอหลัก</button>`
        : ios ? '<div class="note">บน iPhone/iPad: แตะปุ่ม<b>แชร์</b> ใน Safari แล้วเลือก <b>"เพิ่มไปยังหน้าจอโฮม"</b></div>'
          : '<div class="sub">เพิ่มลงหน้าจอหลักได้จากเมนูของเบราว์เซอร์ ใช้ได้แม้ไม่มีเน็ต</div>'}
      <button class="btn ghost sm" data-act="export">${ic('download', 22, '#15803D')} ดาวน์โหลดข้อมูลของฉัน</button>
      <a class="btn ghost sm" href="credits#privacy">${ic('lock', 22)} ข้อมูลของฉันเก็บที่ไหน</a></div>
    <div class="card col"><b class="h" style="font-size:1.15rem">โหมดสาธิต</b><span class="sub">ความเร็วเวลาตอนจำลองเดิน</span>${seg('speed', [[1, '×1 เวลาจริง'], [20, '×20'], [60, '×60']])}
      ${isSample() ? `<button class="btn ghost sm" data-act="startMine">${ic('feet', 22)} เลิกดูตัวอย่าง เริ่มใช้ของฉัน</button>` : `<button class="btn ghost sm" data-act="useSample">${ic('refresh', 22)} ดูข้อมูลตัวอย่าง (ป้าแดง)</button>`}
      <button class="btn ghost sm" data-act="reset" style="color:#9F1D39">${ic('x', 22, '#9F1D39')} ลบข้อมูลทั้งหมดในเครื่องนี้</button></div>
    <div class="sample">เก็บเฉพาะ ก้าว เวลา ความรู้สึก และผลประเมินสุขภาพ ในเครื่องนี้เท่านั้น · ไม่เก็บ GPS · ไม่เก็บเอกสารทางการแพทย์</div>
  </section>`;
};

V.check = viewCheck;
V.plan = viewPlan;
V.return = viewReturn;
V.twoq = viewTwoQ;
V.hobby = viewHobby;
V.brain = viewBrain;

/* ---------------------------------------------------------------- เดิน (จำลอง) + ตรวจเดินจริง / โหมดพักฟื้น Talk Test */
function walkElapsed(w = walk) {
  if (!w || !w.segStart) return 0;
  const ms = w.acc + (w.paused ? 0 : Date.now() - w.segStart);
  return (ms / 1000) * S.settings.speed;
}
const walkSteps = (sec, relaxed = false) => Math.round(sec * (relaxed ? 1.15 : 1.8));
async function lockScreen() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener?.('release', () => { wakeLock = null; }); } } catch { wakeLock = null; }
}
function unlockScreen() { try { wakeLock?.release(); } catch { /* ignore */ } wakeLock = null; }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && walk?.segStart && !walk.paused) { lockScreen(); if (lastRoute === 'walk') updateWalkUi(); }
});
function updateWalkUi() {
  if (!walk?.segStart) return;
  const el = walkElapsed(), $ = (id) => document.getElementById(id);
  if ($('w-time')) $('w-time').textContent = mmss(el);
  if ($('w-steps')) $('w-steps').textContent = nf(walkSteps(el, !!walk.relaxed));
  if ($('w-bar')) $('w-bar').style.width = `${Math.min(100, (el / Math.max(1, S.user.dailyGoal * 60)) * 100)}%`;
  if ($('w-state') && el >= S.user.dailyGoal * 60 && !walk.notified) {
    walk.notified = true; $('w-state').innerHTML = '<b>ครบภารกิจแล้ว</b> · กดจบการเดินได้เลย';
    try { navigator.vibrate?.([120, 80, 120]); } catch { /* ignore */ }
  }
}
function startWalk() {
  if (isSeatedOnlyMode()) {
    location.hash = '#/plan';
    toast('ตอนนี้อยู่ในโหมดท่านั่งเบาๆ (ระดับ 0) ทำท่าบนหน้านี้แทนการเดินนะคะ');
    return;
  }
  const relaxed = isRecoveryWalkMode();
  walk = { startedAt: Date.now(), segStart: Date.now(), acc: 0, paused: false, together: false, relaxed, talkOk: true };
  location.hash = '#/walk';
  clearInterval(tick); tick = setInterval(updateWalkUi, 250);
  lockScreen();
}

async function finish(kind = 'walk', durationSec = null) {
  clearInterval(tick); unlockScreen();
  const dur = Math.round(durationSec ?? walkElapsed());
  const together = !!walk?.together;
  const relaxed = kind === 'walk' && (walk?.relaxed ?? isRecoveryWalkMode());
  const talkOk = walk?.talkOk !== false;
  walk = null;

  let a;
  let steps;
  if (relaxed) {
    a = analyzeRecoveryWalk({ durationSec: dur, talkTestOk: talkOk, modeLabel: S.progress.recovery ? 'โหมดพักฟื้น' : 'ใช้อุปกรณ์ช่วยเดิน' });
    steps = a.steps;
  } else {
    const len = Math.max(30, Math.min(kind === 'walk' ? dur : Math.max(dur, 200), 300));
    a = analyze(synth(kind, len), RULES.hz);
    steps = Math.round(a.steps * (kind === 'walk' && dur > len ? dur / len : 1));
    if (kind === 'walk') {
      const cont = a.checks.find((c) => c.id === 'continuous');
      cont.ok = dur >= RULES.minContinuousSec; cont.label = `เดินต่อเนื่อง ${fmtMin(dur)}`;
      a.ok = a.checks.every((c) => c.ok); a.reason = a.ok ? 'walk' : 'short';
    }
  }

  const startedAt = Math.max(Date.now() - dur * 1000, (S.lastEnd || 0) + 1000);
  S.lastEnd = startedAt + dur * 1000;
  const session = {
    deviceId: S.user.deviceId, seq: S.seq + 1, startedAt, durationSec: dur, steps,
    cadence: Number(a.cadence.toFixed(2)), cv: Number(a.cv.toFixed(3)), verdict: a.ok ? 'walk' : a.reason,
  };
  const signed = await signSession(session, S.user.demoKey);
  let sig = { ok: true, label: `มีลายเซ็นของตัวหนีบ ${S.user.deviceId}`, rule: 'ตรวจแล้ว' };
  try {
    if (serverOnline) {
      const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(signed) });
      const j = await res.json();
      sig = j.ok ? { ok: true, label: `เซิร์ฟเวอร์ตรวจลายเซ็น${j.stateless ? '' : 'และเลขลำดับ'}แล้ว (${j.stepsPerMin} ก้าว/นาที)`, rule: 'ผ่าน' }
        : { ok: false, label: (j.reasons || ['ไม่ผ่าน']).join(' · '), rule: 'ไม่ผ่าน' };
      if (j.ok && j.stateless) {
        const v = await verifySession(signed, S.user.demoKey, { lastSeq: S.seq, sessions: [] });
        if (!v.ok) sig = { ok: false, label: v.reasons.join(' · '), rule: 'ไม่ผ่าน' };
      }
      if (serverInfo?.count != null && j.ok) serverInfo.count += 1;
    } else {
      const v = await verifySession(signed, S.user.demoKey, { lastSeq: S.seq, sessions: [] });
      sig = { ok: v.ok, label: v.ok ? `มีลายเซ็นของตัวหนีบ ${S.user.deviceId}` : v.reasons.join(' · '), rule: 'ตรวจในเครื่อง (ออฟไลน์)' };
    }
  } catch { sig.rule = 'ตรวจในเครื่อง (ต่อเซิร์ฟเวอร์ไม่ได้)'; }
  S.seq = session.seq;
  S.device.lastSyncAt = Date.now();

  const counted = a.ok && sig.ok;
  const min = counted ? Math.max(1, Math.round(dur / 60)) : 0;
  const result = {
    counted, sim: true, relaxed, talkWarn: !!a.talkWarn, gaitOk: a.ok, reason: a.reason,
    durationSec: dur, steps, together, checks: a.checks, signature: sig,
    xpGain: 0, levelUp: false, stageUp: false, feeling: null, feelingRecorded: false, goalBeforeFeel: S.user.dailyGoal,
  };
  S.log.push({ day: todayKey(), time: new Date(startedAt).toTimeString().slice(0, 5), minutes: min, durationSec: dur, steps, counted, relaxed, reason: a.reason, feeling: null, together: counted && together, seq: session.seq, sim: true });
  if (S.log.length > 60) S.log = S.log.slice(-60);
  const now = new Date().toTimeString().slice(0, 5);
  if (counted) {
    selectedDayIdx = 6; markActive();
    if (together) { S.togetherCount += 1; S.team.togetherMin += min; }
    syncMe();
    if (!S.today.done && tMin() >= S.user.dailyGoal) {
      const lvBefore = level(), stBefore = stage().stage;
      S.today.done = true; S.user.xp += XP_PER_MISSION; result.xpGain = XP_PER_MISSION;
      const tr = addTraining(S.training, { type: 'walk', date: todayKey(), metGoal: true });
      S.training = tr.log;
      result.levelUp = level() > lvBefore; result.stageUp = stage().stage > stBefore;
      S.team.feed.unshift({ who: S.user.name, head: 'head_happy', text: `เดินครบภารกิจ ${tMin()} นาที${result.levelUp ? ` · ขึ้นเลเวล ${level()}` : ''}`, time: now });
    }
  }
  S.lastResult = result;
  pendingCelebrate = result.levelUp ? ['main', 'm-grow'] : CELEB[Math.floor(Math.random() * CELEB.length)];
  commit();
  if (location.hash === '#/done') render(); else location.hash = '#/done';
  if (counted && result.xpGain) setTimeout(() => confetti(document.getElementById('hero') || app, result.levelUp ? 60 : 36), 160);
}

/* ---------------------------------------------------------------- แผ่นตัวเลือก */
function sheet(title, options, onPick, note = '') {
  const opener = document.activeElement;
  const el = document.createElement('div');
  el.className = 'sheet';
  el.innerHTML = `<div class="panel" role="dialog" aria-modal="true" aria-labelledby="sheet-t"><b class="h" id="sheet-t" style="font-size:1.25rem">${esc(title)}</b>${note ? `<p class="sub" style="margin:0">${esc(note)}</p>` : ''}${options.map((o, i) => `<button class="btn ghost sm" data-i="${i}">${esc(o)}</button>`).join('')}<button class="btn sm" data-i="-1">ยกเลิก</button></div>`;
  const close = (i) => {
    el.remove(); document.removeEventListener('keydown', onKey, true);
    try { opener?.focus?.(); } catch { /* ignore */ }
    if (i >= 0) onPick(i, options[i]);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(-1); return; }
    if (e.key === 'Tab') {
      const f = [...el.querySelectorAll('button')]; if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (e.target === el || b) close(b ? Number(b.dataset.i) : -1); });
  document.addEventListener('keydown', onKey, true);
  (app.closest('.device') || app).appendChild(el);
  el.querySelector('button')?.focus();
}

/* ---------------------------------------------------------------- โหมดตัวอย่าง / ของฉัน */
function newMineState(name) {
  const d = defaults();
  d.mode = 'mine';
  d.user = { ...d.user, name, xp: 0, chairReps: null };
  d.log = []; d.feelings = []; d.togetherCount = 0; d.seq = 0; d.lastEnd = 0; d.lastResult = null;
  d.assessment = null; d.prevStats = null; d.lastRetestCompare = null;
  d.progress = { ...d.progress, stack: 0, tier: 1, freeze: null, waitingClearance: false, recovery: null, transitionWeek: false, needRetest: false };
  d.activeDates = []; d.strengthDates = []; d.mood = []; d.unwellDates = []; d.brainGames = []; d.cheersLog = []; d.hobbyHistory = [];
  d.lastActiveDate = todayKey();
  d.device = { ...d.device, hub: 'สถานีรับข้อมูลที่บ้าน', lastSyncAt: null };
  d.team.members = d.team.members.map((m) => (m.me ? { ...m, name, minutes: 0, goal: 50, today: false, frozen: false } : m));
  d.settings = { ...S.settings };
  return d;
}

/* ---------------------------------------------------------------- การกระทำ */
const POKE = ['วันนี้ไปเดินรับแดดกันไหม', 'ขาแข็งแรงขึ้นทุกวันเลย', 'คิดถึงเพื่อนในก๊วนจัง', 'เดินด้วยกันสนุกกว่า', 'อย่าลืมจิบน้ำหลังเดินนะ'];
const ACT = {
  speak: () => speak(speech, S.settings.voice),
  cycleSize: () => {
    const order = ['m', 'l', 'xl'], names = { m: 'ขนาดตัวอักษร: ปกติ', l: 'ขนาดตัวอักษร: ใหญ่', xl: 'ขนาดตัวอักษร: ใหญ่มาก' };
    S.settings.size = order[(order.indexOf(S.settings.size) + 1) % order.length] || 'm';
    commit(); applySettings(); render(); toast(names[S.settings.size]);
  },
  start: startWalk,
  pause: () => {
    if (!walk) return;
    if (walk.paused) { walk.segStart = Date.now(); walk.paused = false; lockScreen(); }
    else { walk.acc += Date.now() - walk.segStart; walk.paused = true; unlockScreen(); }
    render();
  },
  together: () => { walk.together = !walk.together; render(); },
  toggleTalk: () => { if (walk) { walk.talkOk = !walk.talkOk; render(); } },
  finish: () => finish('walk'),
  share: () => toast('(ต้นแบบ) ระบบจริงจะส่งผลให้เพื่อนในก๊วนเห็น'),
  poke: () => {
    const opts = POSES.filter((x) => x.level <= level() && x.id !== 'sleep' && x.id !== 'angry');
    posePreview = opts[Math.floor(Math.random() * opts.length)].id;
    render();
    const bub = document.querySelector('#hero .bubble');
    if (bub) bub.textContent = POKE[Math.floor(Math.random() * POKE.length)];
    confetti(document.getElementById('hero'), 14);
  },
  cheer: () => sheet('ส่งเสียงชมให้ทั้งก๊วน', ['เก่งมากทุกคน', 'พรุ่งนี้เดินด้วยกันนะ', 'สู้ๆ สุขภาพดีไปด้วยกัน', 'ขอบคุณที่ชวนเดิน'], (_, t) => {
    S.team.feed.unshift({ who: S.user.name, head: 'head_greet', text: `ส่งเสียงชม "${t}"`, time: new Date().toTimeString().slice(0, 5) });
    S.cheersLog = [...(S.cheersLog || []), todayKey()].slice(-30);
    const tr = addTraining(S.training, { type: 'social', date: todayKey(), metGoal: true });
    S.training = tr.log;
    commit(); render(); toast(`ส่งเสียงชม "${t}" ให้ทั้งก๊วนแล้ว${tr.gained ? ` · +${tr.gained} แต้มมิตรภาพ` : ''}`);
  }),
  nudge: () => { const m = S.team.members.filter((x) => !x.today && !x.me && !x.frozen).pop(); if (m) toast(`(ต้นแบบ) ระบบจริงจะส่งคำชวนให้${m.name} และตัวหนีบจะสั่นเบาๆ`); },
  meet: () => sheet('นัดเพื่อนเดินพรุ่งนี้', ['06:00 น. หน้าศาลาหมู่บ้าน', '06:30 น. ลานวัด', '17:00 น. รอบหมู่บ้าน'], (_, t) => {
    S.team.meetup = t; S.team.feed.unshift({ who: S.user.name, head: 'head_greet', text: `นัดเดินพรุ่งนี้ ${t}`, time: new Date().toTimeString().slice(0, 5) });
    commit(); render(); toast('(ต้นแบบ) บันทึกนัดในเครื่องนี้ · ระบบจริงจะแจ้งทุกคนในก๊วน');
  }),
  newqr: () => { inviteLeft = 600; render(); },
  line: () => toast('(ต้นแบบ) ระบบจริงจะสร้างลิงก์เชิญให้หลานส่งทาง LINE ใช้ได้ครั้งเดียว'),
  nophone: () => toast('เพื่อนที่ไม่มีมือถือ ใช้ตัวหนีบอย่างเดียวได้ ข้อมูลส่งผ่านสถานีรับข้อมูลที่บ้าน'),
  voice: () => toast('(ต้นแบบ) ระบบจริงจะอัดเสียงหลาน แล้วให้ตัวหนีบและสถานีที่บ้านเล่นให้ฟัง'),
  mission: () => sheet(`ตั้งภารกิจต่อวันให้${S.family.elder}`, ['10 นาที', '15 นาที', '20 นาที'], (i) => { S.family.missionMin = [10, 15, 20][i]; commit(); render(); toast(`(ต้นแบบ) ตั้ง ${S.family.missionMin} นาทีในเครื่องนี้ · ระบบจริงจะส่งไปที่ตัวหนีบ`); }),
  buzz: () => { try { navigator.vibrate?.([200, 100, 200]); } catch { /* ignore */ } toast('(จำลอง) ระบบจริงจะสั่งให้ตัวหนีบสั่น'); },
  ble: async () => {
    if (!('bluetooth' in navigator)) return toast('เบราว์เซอร์นี้เชื่อมบลูทูธไม่ได้ ใช้สถานีรับข้อมูลแทน');
    try {
      await navigator.bluetooth.requestDevice({ filters: [{ namePrefix: 'KRJ-' }], optionalServices: ['6e3a0001-6b72-4a00-9b4b-7275616d6a61'] });
      toast('จับคู่แล้ว · ยังไม่รับข้อมูลก้าวจากตัวหนีบ (ต้นแบบ)');
    } catch { toast('ยังไม่ได้จับคู่ (ยกเลิก หรือไม่พบตัวหนีบใกล้ๆ)'); }
  },
  install: async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice.catch(() => null); installEvt = null; render(); },
  export: () => {
    const { demoKey, ...user } = S.user;
    const data = { app: 'ก้าวรวมใจ', exportedAt: new Date().toISOString(), mode: S.mode, user, log: S.log, feelings: S.feelings, assessment: S.assessment, mood: S.mood, progress: S.progress, hobbyHistory: S.hobbyHistory, brainGames: S.brainGames, settings: S.settings };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `kaoruamjai-${todayKey()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('ดาวน์โหลดข้อมูลแล้ว');
  },
  reset: () => sheet('ลบข้อมูลทั้งหมดในเครื่องนี้?', ['ลบทั้งหมดและเริ่มใหม่'], () => {
    S = reset(); posePreview = null; selectedDayIdx = 6; welcomeStep = 0; applySettings(); syncServerSeq();
    toast('ลบข้อมูลแล้ว'); location.hash = '#/welcome'; render();
  }, 'จะลบ ประวัติการเดิน ผลประเมินสุขภาพ ความรู้สึก และค่าตั้ง ในเบราว์เซอร์นี้ · กู้คืนไม่ได้ · ดาวน์โหลดเก็บไว้ก่อนได้ที่หน้าตั้งค่า'),
  startMine: () => { welcomeStep = 1; location.hash = '#/welcome'; render(); setTimeout(() => document.getElementById('w-name')?.focus(), 80); },
  welcomeBack: () => { welcomeStep = 0; render(); },
  useSample: () => {
    const keep = S.settings; S = defaults(); S.settings = keep; S.mode = 'sample'; firstVisit = false; ensureGoals(); syncMe(); commit();
    welcomeStep = 0; location.hash = '#/step'; render(); toast('กำลังดูข้อมูลตัวอย่างของป้าแดง');
  },
  mineGo: () => {
    const name = (document.getElementById('w-name')?.value || '').trim().slice(0, 20);
    if (!name) { toast('ใส่ชื่อก่อนนะ'); document.getElementById('w-name')?.focus(); return; }
    S = newMineState(name); firstVisit = false; ensureGoals(); syncMe(); commit();
    welcomeStep = 0; startCheck(); location.hash = '#/check'; render();
  },
};

function onClick(e) {
  const dayStep = e.target.closest('[data-day-step]');
  if (dayStep) { selectedDayIdx = Math.max(0, Math.min(6, selectedDayIdx + Number(dayStep.dataset.dayStep))); render(); return; }
  const dayBar = e.target.closest('[data-day-idx]');
  if (dayBar) { selectedDayIdx = Number(dayBar.dataset.dayIdx); render(); return; }
  const go = e.target.closest('[data-go]');
  if (go) { location.hash = `#/${go.dataset.go}`; return; }
  const a = e.target.closest('[data-act]');
  if (a && ACT[a.dataset.act]) { ACT[a.dataset.act](); return; }
  if (handleHealthClick(e)) return;
  if (handleExtrasClick(e)) return;
  const ps = e.target.closest('[data-pose]');
  if (ps) {
    const p = POSES.find((x) => x.id === ps.dataset.pose);
    if (p.level > level()) { toast(`ท่า${p.name} ปลดล็อกที่เลเวล ${p.level}`); return; }
    posePreview = p.id; render(); document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
  }
  const f = e.target.closest('[data-feel]');
  if (f && S.lastResult) {
    const nextFeel = f.dataset.feel;
    // กันบั๊กกดปุ่มความรู้สึกซ้ำในรอบเดินเดียวแล้วนับเหนื่อยเบิ้ล 2 ครั้ง
    if (S.lastResult.feelingRecorded) {
      S.feelings[S.feelings.length - 1] = nextFeel;
      if (S.feelLog?.length) S.feelLog[S.feelLog.length - 1] = { date: todayKey(), f: nextFeel };
    } else {
      S.feelings.push(nextFeel);
      logFeeling(nextFeel);
      S.lastResult.feelingRecorded = true;
    }
    S.lastResult.feeling = nextFeel;
    const last = S.log[S.log.length - 1]; if (last) last.feeling = nextFeel;
    const baseGoal = S.lastResult.goalBeforeFeel ?? S.user.dailyGoal;
    S.user.dailyGoal = adjustDailyGoal(baseGoal, S.feelings);
    commit(); render();
    toast(S.user.dailyGoal < baseGoal ? `เหนื่อย 2 ครั้งติด ลดภารกิจเหลือ ${S.user.dailyGoal} นาทีให้แล้ว` : `บันทึกว่า "${FEEL_SHORT[nextFeel]}" แล้ว`);
    return;
  }
  const set = e.target.closest('[data-set]');
  if (set) {
    let v = set.dataset.val; if (v === 'true') v = true; else if (v === 'false') v = false; else if (/^\d+$/.test(v)) v = Number(v);
    S.settings[set.dataset.set] = v; commit(); applySettings(); render(); return;
  }
  const ap = e.target.closest('[data-approve]');
  if (ap) { const r = S.requests.splice(Number(ap.dataset.approve), 1)[0]; S.team.members.push({ name: r.name, minutes: 0, goal: 50, today: false, frozen: false, look: 'think', head: 'head_think' }); commit(); render(); toast(`(ต้นแบบ) ${r.name} เข้าก๊วนในเครื่องนี้แล้ว`); return; }
  const dn = e.target.closest('[data-deny]');
  if (dn) { const r = S.requests.splice(Number(dn.dataset.deny), 1)[0]; commit(); render(); toast(`ปฏิเสธคำขอของ${r.name}แล้ว`); }
}
app.addEventListener('click', onClick);
intro.addEventListener('click', onClick);
app.addEventListener('input', (e) => { handleHealthInput(e); });
app.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'w-name') ACT.mineGo(); });

/* ---------------------------------------------------------------- แผงข้างจอใหญ่ + แผงสาธิตสำหรับกรรมการ */
function renderIntro(part) {
  const p = PARTS[part];
  intro.dataset.part = part;
  intro.innerHTML = `<div class="cap" data-part="${part}"><span class="cap-k">ส่วนที่ ${p.no} · ${p.health}</span><h2 class="cap-t">${p.title}</h2><p class="cap-d">${p.desc}</p></div>
    <ol class="parts3" aria-label="ระบบ 3 ส่วน">${Object.entries(PARTS).map(([k, x]) => `<li data-part="${k}" aria-current="${part === k}">
      <button data-go="${x.tab}"><span class="n">${x.no}</span><span><b>${x.name}</b><small>${x.health}</small></span></button></li>`).join('')}</ol>`;
}

const DEMO_PAGES = {
  body: [['step', 'หน้าแรก'], ['plan', 'ท่าวันนี้'], ['check', 'แบบประเมิน'], ['device', 'ตัวหนีบ'], ['history', 'ประวัติ']],
  mind: [['me', 'ตัวละคร'], ['hobby', 'งานอดิเรก'], ['brain', 'ฝึกสมอง'], ['twoq', 'คุยเรื่องใจ']],
  social: [['team', 'ก๊วน'], ['league', 'ลีก'], ['invite', 'ชวนเพื่อน'], ['family', 'ลูกหลาน']],
};
const DEMO_ACTS = [
  ['walk', 'feet', 'เดินจริงครบภารกิจ', 'ตัวละครฉลอง ได้ 40 แต้ม'],
  ['shake', 'x', 'เขย่าด้วยมือ', 'ลองโกง ระบบไม่นับ'],
  ['short', 'clock', 'เดินสั้น 1 นาที', 'ยังไม่ถึง 3 นาที'],
  ['tomorrow', 'sun', 'ข้ามไปวันใหม่', 'เริ่มภารกิจวันใหม่'],
  ['levelup', 'star', 'ใกล้เลเวลอัป', 'เดินอีกครั้งแล้วตัวละครโต'],
  ['bp', 'pulse', 'ความดันสูงวันนี้', 'ป้าแดง 168/92 → ทำเบาๆ'],
  ['sick', 'heart', 'พักป่วย 10 วัน (โซน 2)', 'เริ่ม Tier 1 ขั้น A + ไม่ถ่วงก๊วน'],
  ['longfreeze', 'shield', 'พักผ่าตัด 35 วัน (โซน 3)', 'ยืนยันตนเอง + ทบทวนยา + ทดสอบซ้ำ'],
  ['absence', 'bell', 'หายเงียบ 10 วัน (ลืมพัก)', 'ทดสอบ Retroactive Freeze คืนสแตก'],
  ['rain', 'smile', 'ฟ้าในใจครึ้ม 3 วัน', 'ชวนตอบคำถาม 2 ข้อ'],
  ['week3', 'calendar', 'จบสัปดาห์: ฝึก 3 วัน', 'สแตกเพิ่ม / ขยับขั้นฟื้นตัว'],
  ['week0rec', 'pause', 'จบสัปดาห์ฟื้นตัว: ฝึก 0 วัน', 'พิสูจน์ว่าไม่ดันระดับอัตโนมัติ'],
];
function renderDemo() {
  const route = lastRoute || 'step', open = demo.classList.contains('open');
  demo.innerHTML = `<button class="demo-toggle" data-demo-toggle aria-expanded="${open}">${ic(open ? 'x' : 'gear', 20, 'currentColor', 2.4)} ${open ? 'ปิดแผงสาธิต' : 'แผงสาธิต'}</button><div class="panel-demo">
    <div class="ph"><div><b>แผงสาธิต v3.1</b></div><span class="srv ${serverOnline ? 'on' : ''}"><i></i>${serverOnline ? 'เซิร์ฟเวอร์ออนไลน์' : 'ออฟไลน์'}</span></div>
    <div><div class="lbl">ไปที่หน้า</div><div class="chips">${Object.entries(DEMO_PAGES).flatMap(([k, list]) => list.map(([r, t]) => `<button data-part="${k}" data-demo-go="${r}" aria-current="${route === r}"><i></i>${t}</button>`)).join('')}</div></div>
    <div><div class="lbl">จำลองเหตุการณ์ (Recovery v3.1)</div><div class="acts">${DEMO_ACTS.map(([k, i, t, s], n) => `<button class="act ${n ? '' : 'main'}" data-demo="${k}"><span class="ai">${ic(i, 20, 'currentColor', 2.4)}</span><span><b>${t}</b><small>${s}</small></span></button>`).join('')}</div></div>
    <div class="foot-row"><small>ข้อมูลตัวอย่าง · ไม่ใช่เครื่องมือแพทย์</small><button data-act-demo="reset">ลบข้อมูล</button></div>
  </div>`;
}
demo.addEventListener('click', (e) => {
  if (e.target.closest('[data-demo-toggle]')) { demo.classList.toggle('open'); renderDemo(); return; }
  if (e.target.closest('[data-act-demo="reset"]')) { ACT.reset(); return; }
  const g = e.target.closest('[data-demo-go]');
  if (g) { if (g.dataset.demoGo === 'check') startCheck(); location.hash = `#/${g.dataset.demoGo}`; return; }
  const d = e.target.closest('[data-demo]');
  if (!d) return;
  const k = d.dataset.demo;
  if (walk && tick) clearInterval(tick);
  if (k === 'walk') { walk = { together: true, relaxed: isRecoveryWalkMode(), talkOk: true }; finish('walk', S.user.dailyGoal * 60 + 20); }
  if (k === 'shake') { walk = {}; finish('shake', 240); }
  if (k === 'short') { walk = {}; finish('short', 60); }
  if (k === 'tomorrow') {
    S.log.forEach((s) => { s.day = shiftKey(s.day, -1); });
    S.today = { date: todayKey(), done: false }; S.readiness = null; S.planDone = { date: todayKey(), ids: [] };
    S.team.members.forEach((m) => { m.today = false; }); S.team.meetup = null; selectedDayIdx = 6;
    syncMe(); commit(); location.hash = '#/step'; render(); toast('เริ่มวันใหม่แล้ว');
  }
  if (k === 'levelup') { S.user.xp = Math.max(S.user.xp, (level() * XP_PER_LEVEL) - 10); S.today.done = false; commit(); render(); toast('ตั้งแต้มใกล้เลเวลถัดไปแล้ว ลองกด "เดินจริงครบภารกิจ"'); }
  if (k === 'bp') { location.hash = '#/plan'; S.readiness = null; commit(); render(); toast('ตอบคำถามความพร้อม แล้วเปิด "มีเครื่องวัดความดัน" ใส่ 168/92'); }
  if (k === 'sick') {
    S.progress = startFreeze({ ...S.progress, tier: effectiveTier() || 2 }, { date: addDays(todayKey(), -10), reason: 'sick' });
    syncMe(); ensureGoals(); commit(); location.hash = '#/plan'; render();
    toast('จำลอง: พักเพราะไม่สบายมา 10 วัน (สแตกไม่ลด · ไม่ถ่วงคะแนนก๊วน)');
  }
  if (k === 'longfreeze') {
    S.progress = startFreeze({ ...S.progress, tier: effectiveTier() || 3 }, { date: addDays(todayKey(), -35), reason: 'surgery' });
    syncMe(); ensureGoals(); commit(); location.hash = '#/return'; render();
    toast('จำลอง: พักผ่าตัดมา 35 วัน (โซน 3 · ยืนยันตนเอง + ทบทวนยา + ทดสอบซ้ำ)');
  }
  if (k === 'absence') {
    S.progress.freeze = null; S.progress.waitingClearance = false;
    S.lastActiveDate = addDays(todayKey(), -10);
    S.absenceDismissedDate = null;
    commit(); location.hash = '#/step'; render();
    toast('จำลอง: หายเงียบไป 10 วันโดยไม่ได้กดพัก ดูการ์ดทักทายด้านบน');
  }
  if (k === 'rain') { for (let i = 0; i < 3; i++) S.mood = [...S.mood.filter((m) => m.date !== addDays(todayKey(), -i)), { date: addDays(todayKey(), -i), sky: 'rain' }]; S.last2Q = null; commit(); location.hash = '#/me'; render(); toast('จำลอง: ฟ้าในใจครึ้ม 3 วันติด'); }
  if (k === 'week3') { toast(demoEndWeek(3)); render(); }
  if (k === 'week0rec') { toast(demoEndWeek(0)); render(); }
});

/* ---------------------------------------------------------------- router */
function render() {
  let route = (location.hash.replace('#/', '') || 'step').split('?')[0];
  if (route === 'today') route = 'step';
  if (route === 'step' && firstVisit) route = 'welcome';
  if (!V[route]) { route = 'step'; try { history.replaceState(null, '', '#/step'); } catch { /* ignore */ } }
  if (route !== 'welcome') firstVisit = false;
  const part = ROUTE_PART[route];
  syncMe();
  const html = V[route]();
  if (!html) return;
  const tabbed = !['walk', 'done', 'settings', 'welcome', 'check', 'return'].includes(route);
  app.dataset.part = part;
  app.innerHTML = html + (tabbed ? nav(part) : '');
  if (route !== lastRoute) { app.querySelector('.view')?.classList.add('reveal'); window.scrollTo(0, 0); app.scrollTop = 0; }
  if (route !== 'me') posePreview = null;
  lastRoute = route;
  clearInterval(inviteTimer);
  if (route === 'invite' && inviteLeft > 0) {
    inviteTimer = setInterval(() => {
      inviteLeft -= 1;
      const el = document.getElementById('inv-left');
      if (inviteLeft <= 0) { clearInterval(inviteTimer); render(); } else if (el) el.textContent = mmss(inviteLeft);
    }, 1000);
  }
  document.title = `ก้าวรวมใจ · ${TITLES[route]}`;
  if (intro.dataset.part !== part) renderIntro(part);
  renderDemo();
}

let transitioning = false;
function navigate() {
  const reduce = !S.settings.motion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduce || transitioning || document.hidden) { render(); return; }
  transitioning = true;
  let vt;
  try { vt = document.startViewTransition(render); } catch { transitioning = false; render(); return; }
  const quiet = () => {};
  vt.ready.catch(quiet);
  vt.updateCallbackDone.catch(quiet);
  vt.finished.catch(quiet).finally(() => { transitioning = false; });
}
window.addEventListener('hashchange', navigate);

/* ---------------------------------------------------------------- เซิร์ฟเวอร์ */
async function syncServerSeq() {
  try {
    const r = await fetch(`/api/sessions?deviceId=${encodeURIComponent(S.user.deviceId)}`, { cache: 'no-store' });
    if (!r.ok) return;
    serverInfo = await r.json();
    if (serverInfo.lastSeq > S.seq) { S.seq = serverInfo.lastSeq; commit(); }
    const lastEnd = Math.max(0, ...(serverInfo.sessions || []).map((x) => x.startedAt + x.durationSec * 1000));
    if (lastEnd > (S.lastEnd || 0)) { S.lastEnd = lastEnd; commit(); }
  } catch { /* ignore */ }
}
async function checkServer() {
  const was = serverOnline;
  try { const r = await fetch('/api/health', { cache: 'no-store' }); serverOnline = r.ok; } catch { serverOnline = false; }
  if (serverOnline) await syncServerSeq();
  renderDemo();
  if (was !== serverOnline && lastRoute === 'device') render();
}

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (lastRoute === 'settings') render(); });

initHealth({ S: () => S, commit, render: () => render(), toast, sheet, setSpeech: (t) => { speech = t; } });
initExtras({
  S: () => S, commit, render: () => render(), toast, setSpeech: (t) => { speech = t; },
  currentAssessment, effectiveTier, isServerOnline: () => serverOnline,
});
const weekNotes = rollWeeks();
ensureGoals();
if (weekNotes.length) commit();
applySettings();
render();
if (weekNotes.length) setTimeout(() => toast(weekNotes[weekNotes.length - 1]), 400);
checkServer();
setInterval(checkServer, 20000);
initPwa();
window.__krjOk = true;
