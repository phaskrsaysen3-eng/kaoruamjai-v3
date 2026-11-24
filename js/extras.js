// ก้าวรวมใจ — ระบบเสริมที่เติมให้ครบ: 1) เควสงานอดิเรก (core/hobby.js)  2) มินิเกมฝึกสมอง (MND ใน core/stats.js)
// ยึดกติกา PDPA ม.26: ส่งให้ /api/hobby เฉพาะแท็กความปลอดภัย ไม่ส่งชื่อ โรค หรือเหตุผลการป่วย
import { todayKey } from './store.js';
import { CATEGORIES, MOVEMENT, hobbyTags, getHobbyOptions, recordChoice } from './core/hobby.js';
import { addTraining, mindStat } from './core/stats.js';
import { ic, esc, confetti } from './ui.js';

let ctx;
let hobbyState = { loading: false, options: null, tags: null, active: null, stepDone: new Set(), source: null };
let brainState = null;

export function initExtras(c) { ctx = c; }
const S = () => ctx.S();

const top = (title, back = 'me') => `<div class="top"><button class="round plain" data-go="${back}" aria-label="ย้อนกลับ">${ic('back', 24)}</button><h1 class="h title" style="flex:1">${title}</h1><button class="round" data-act="speak" aria-label="ฟังเสียงอ่านหน้านี้">${ic('speaker', 26)}</button></div>`;

/* ================================================================ 1) เควสงานอดิเรก (Hobby Quests) */
function buildHobbyContext() {
  const s = S(), a = ctx.currentAssessment();
  const assessment = a?.result ? { tier: ctx.effectiveTier(), aiTags: a.result.aiTags || [] } : { tier: ctx.effectiveTier(), aiTags: [] };
  const frozen = !!s.progress.freeze;
  const waitingClearance = !!s.progress.waitingClearance;
  const inRecovery = !!s.progress.recovery && !frozen;
  return {
    tags: hobbyTags(assessment, { freeMinutes: 20, history: s.hobbyHistory || [], frozen, waitingClearance, inRecovery }),
    frozen, waitingClearance, inRecovery,
  };
}

export async function loadHobbyOptions(force = false) {
  const { tags, frozen, waitingClearance, inRecovery } = buildHobbyContext();
  if (!force && hobbyState.options && hobbyState.tags?.movementMax === tags.movementMax) return;
  hobbyState.loading = true;
  hobbyState.tags = tags;
  ctx.render();

  let res = null;
  if (ctx.isServerOnline()) {
    try {
      const r = await fetch('/api/hobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tags),
      });
      if (r.ok) res = await r.json();
    } catch { /* ตกไปใช้คลังสำรองในเครื่อง */ }
  }
  if (!res || !Array.isArray(res.options) || !res.options.length) {
    res = await getHobbyOptions(tags);
  }
  hobbyState = {
    loading: false,
    options: res.options,
    tags,
    active: null,
    stepDone: new Set(),
    source: res.options.some((o) => o.source === 'ai') ? 'ai' : 'fallback',
    frozen, waitingClearance, inRecovery,
  };
  ctx.render();
}

export function hobbyPromoCard() {
  const s = S();
  const locked = !!s.progress.freeze || !!s.progress.waitingClearance;
  const inRec = !!s.progress.recovery && !locked;
  const count = (s.hobbyHistory || []).length;
  const sub = locked
    ? 'โหมดพักฟื้น: เปิดเฉพาะงานอดิเรกนั่งนิ่ง (ไม่บังคับ ไม่คิดแต้มออกกำลังกาย)'
    : inRec
      ? 'โหมดฟื้นตัว: เควสเบาๆ ไม่เกินยืน/เดินช้าๆ'
      : `กิจกรรมสบายใจที่บ้านตามข้อจำกัดความปลอดภัย · ทำแล้ว ${count} ครั้ง`;
  return `<button class="card health-card" data-go="hobby">
    <span class="hc-ic" style="background:var(--suns);color:var(--sunt)">${ic('sparkle', 28)}</span>
    <span class="hc-t"><b>เควสงานอดิเรกวันนี้</b><span class="sub">${sub}</span></span>
    ${ic('chev', 24, '#55625A')}</button>`;
}

export function viewHobby() {
  const { tags, frozen, waitingClearance, inRecovery } = buildHobbyContext();
  if (!hobbyState.options || hobbyState.tags?.movementMax !== tags.movementMax) {
    if (!hobbyState.loading) setTimeout(() => loadHobbyOptions(false), 0);
  }
  ctx.setSpeech(frozen || waitingClearance
    ? 'เควสงานอดิเรกช่วงพักฟื้น ระบบเลือกเฉพาะกิจกรรมนั่งนิ่งที่ทำได้สบายๆ'
    : 'เควสงานอดิเรกวันนี้ เลือกกิจกรรมที่ชอบ 1 อย่างเพื่อผ่อนคลายและฝึกสมอง');

  const modeNote = frozen || waitingClearance
    ? `<div class="note" style="background:var(--skys);color:var(--skyd)"><b>โหมดพักฟื้น · ล็อกระดับนั่งนิ่ง (${MOVEMENT[0]})</b><br>ทำเพื่อผ่อนคลายใจ ไม่มีการบังคับและไม่นับเป็นแต้มออกกำลังกายค่ะ</div>`
    : inRecovery
      ? `<div class="note" style="background:var(--suns);color:var(--sunt)"><b>ช่วงฟื้นตัว</b> · จำกัดงานอดิเรกไม่เกินระดับ "${MOVEMENT[tags.movementMax]}"</div>`
      : '';

  const privacyBox = `<div class="note" style="background:#F8FBF9;border:1px solid var(--line);font-size:.92rem">
    <b>คุ้มครองข้อมูลส่วนบุคคล (PDPA ม.26):</b> ใช้เฉพาะแท็ก <code>movementMax: ${tags.movementMax}</code>${tags.tags.length ? `, <code>${tags.tags.map(esc).join('</code>, <code>')}</code>` : ''} · ไม่ส่งชื่อ โรค หรือเหตุผลการป่วยให้ AI
  </div>`;

  if (hobbyState.loading || !hobbyState.options) {
    return `<section class="view">${top('เควสงานอดิเรก')}${modeNote}<div class="card"><p class="sub">กำลังเตรียมกิจกรรมที่ปลอดภัยสำหรับท่าน...</p></div>${privacyBox}</section>`;
  }

  if (hobbyState.active) {
    const o = hobbyState.active;
    const allDone = o.steps.every((_, i) => hobbyState.stepDone.has(i));
    return `<section class="view">${top('ทำเควสงานอดิเรก', 'hobby')}
      ${modeNote}
      <div class="card stack-v">
        <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
          <span class="tag t-ok">${esc(CATEGORIES[o.category] || o.category)}</span>
          <span class="tag s">${MOVEMENT[o.movement]} · ${o.minutes} นาที</span>
        </div>
        <h2 class="h" style="margin:0;font-size:1.4rem">${esc(o.title)}</h2>
        <p class="sub" style="margin:0">${esc(o.why)}</p>
        ${o.items?.length ? `<div class="sub"><b>ของที่ใช้:</b> ${o.items.map(esc).join(', ')}</div>` : ''}
        <ul class="exl">
          ${o.steps.map((st, i) => `<li class="ex ${hobbyState.stepDone.has(i) ? 'is-done' : ''}">
            <button class="tick" data-ex="hstep:${i}" aria-pressed="${hobbyState.stepDone.has(i)}" aria-label="ทำขั้นที่ ${i + 1} แล้ว">${ic('check', 20, '#fff', 3.2)}</button>
            <div style="flex:1"><b>ขั้นที่ ${i + 1}</b><br><span>${esc(st)}</span></div>
          </li>`).join('')}
        </ul>
        <button class="btn go sm" data-ex="hfinish" ${allDone ? '' : ''}>${ic('check', 24, '#fff', 3)} ทำเสร็จแล้ว</button>
        <button class="btn ghost sm" data-ex="hback">เลือกกิจกรรมอื่น</button>
      </div>
      ${privacyBox}</section>`;
  }

  return `<section class="view">${top('เควสงานอดิเรก')}
    ${modeNote}
    <div class="stack-v">
      ${hobbyState.options.map((o, idx) => `<div class="card stack-v">
        <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:6px">
          <span class="tag t-ok">${esc(CATEGORIES[o.category] || o.category)}</span>
          <span class="tag s">${MOVEMENT[o.movement]} · ${o.minutes} นาที</span>
        </div>
        <b class="h" style="font-size:1.25rem">${esc(o.title)}</b>
        <p class="sub" style="margin:0">${esc(o.why)}</p>
        <button class="btn go sm" data-ex="hpick:${idx}">เลือกทำกิจกรรมนี้</button>
      </div>`).join('')}
    </div>
    <button class="btn ghost sm" data-ex="hreload">${ic('refresh', 22)} ขอชุดกิจกรรมใหม่</button>
    ${privacyBox}</section>`;
}

/* ================================================================ 2) มินิเกมฝึกสมอง (MND ใน stats.js) */
const MATCH_PAIRS = [
  { id: 'lotus', label: 'ดอกบัว', color: '#FCE7F3', ink: '#9D174D' },
  { id: 'sun', label: 'พระอาทิตย์', color: '#FEF3C7', ink: '#92400E' },
  { id: 'leaf', label: 'ใบไม้', color: '#DCFCE7', ink: '#166534' },
  { id: 'water', label: 'สายน้ำ', color: '#DBEAFE', ink: '#1E40AF' },
];

function startMatchGame() {
  const deck = [...MATCH_PAIRS, ...MATCH_PAIRS]
    .map((c, idx) => ({ ...c, uid: idx, open: false, matched: false, r: Math.random() }))
    .sort((a, b) => a.r - b.r);
  brainState = { mode: 'match', deck, flipped: [], tries: 0, matchedPairs: 0, done: false, accuracy: 0, lock: false };
}

function startCalcGame() {
  const qs = [];
  for (let i = 0; i < 5; i++) {
    const a = 10 + Math.floor(Math.random() * 25);
    const b = 3 + Math.floor(Math.random() * 12);
    const add = i % 2 === 0;
    const ans = add ? a + b : a - b;
    const wrongs = [ans + 2, ans - 2, ans + 5, ans - 3].filter((x) => x > 0 && x !== ans).slice(0, 2);
    const choices = [ans, ...wrongs].sort(() => Math.random() - 0.5);
    qs.push({ text: add ? `${a} + ${b} = ?` : `${a} − ${b} = ?`, ans, choices });
  }
  brainState = { mode: 'calc', qs, idx: 0, correct: 0, done: false, accuracy: 0 };
}

function finishBrainGame(accuracy) {
  const s = S();
  const acc = Math.max(0, Math.min(1, Number(accuracy.toFixed(2))));
  brainState.done = true;
  brainState.accuracy = acc;
  s.brainGames = [...(s.brainGames || []), { date: todayKey(), accuracy: acc, kind: brainState.mode }].slice(-30);
  const tr = addTraining(s.training, { type: 'brain', date: todayKey(), metGoal: true });
  s.training = tr.log;
  ctx.commit();
  ctx.render();
  setTimeout(() => confetti(document.querySelector('.view') || document.body, 32), 80);
  ctx.toast(`เล่นจบแล้ว ความแม่นยำ ${Math.round(acc * 100)}%${tr.gained ? ` · +${tr.gained} แต้มฝึกสมอง` : ''}`);
}

export function brainPromoCard() {
  const s = S();
  const m = mindStat(s.brainGames || [], todayKey());
  return `<button class="card health-card" data-go="brain">
    <span class="hc-ic" style="background:var(--leafs);color:var(--god)">${ic('star', 28)}</span>
    <span class="hc-t"><b>มินิเกมฝึกสมอง (MND)</b><span class="sub">${m.level ? `เลเวล ${m.level}/10 · แม่นยำเฉลี่ย ${Math.round(m.accuracy * 100)}%` : m.reason}</span></span>
    ${ic('chev', 24, '#55625A')}</button>`;
}

export function viewBrain() {
  const s = S();
  const m = mindStat(s.brainGames || [], todayKey());
  ctx.setSpeech('มินิเกมฝึกสมอง เล่นสบายๆ ไม่จับเวลา เพื่อฝึกความจำและการคิดเลข');

  if (!brainState) {
    return `<section class="view">${top('มินิเกมฝึกสมอง (MND)')}
      <div class="card stack-v">
        <div class="row" style="justify-content:space-between">
          <b class="h">ค่าพลังสมอง (MND)</b>
          <span class="pill" style="background:var(--leafs);color:var(--god)">${m.level ? `Lv.${m.level}/10` : 'ยังไม่ครบ 3 เกม'}</span>
        </div>
        <p class="sub" style="margin:0">${m.level ? `ความแม่นยำเฉลี่ย ${Math.round(m.accuracy * 100)}% จาก ${m.games} เกมล่าสุดใน 14 วัน` : m.reason} · เล่นสบายๆ ไม่จับเวลา นั่งเล่นตอนพักฟื้นได้</p>
      </div>
      <div class="card stack-v">
        <b class="h" style="font-size:1.2rem">1. จับคู่คำความจำ (4 คู่)</b>
        <p class="sub" style="margin:0">เปิดการ์ดทีละ 2 ใบ จำตำแหน่งแล้วจับคู่ให้ครบ ฝึกความจำระยะสั้น</p>
        <button class="btn go sm" data-ex="bmatch">เริ่มเล่นจับคู่ความจำ</button>
      </div>
      <div class="card stack-v">
        <b class="h" style="font-size:1.2rem">2. คิดเลขสบายๆ (5 ข้อ)</b>
        <p class="sub" style="margin:0">บวกและลบเลขสองหลักเบาๆ เลือกคำตอบที่ถูกต้อง ไม่จำกัดเวลา</p>
        <button class="btn blue sm" data-ex="bcalc">เริ่มเล่นคิดเลขสบายๆ</button>
      </div>
    </section>`;
  }

  if (brainState.done) {
    const latest = mindStat(s.brainGames || [], todayKey());
    return `<section class="view">${top('ผลฝึกสมอง', 'me')}
      <div class="card stack-v" style="text-align:center;background:linear-gradient(135deg,#ECFDF3,#FFFFFF)">
        <span class="tag t-ok" style="align-self:center">เก่งมากค่ะ!</span>
        <h2 class="h" style="margin:0;font-size:1.8rem;color:var(--god)">ความแม่นยำ ${Math.round(brainState.accuracy * 100)}%</h2>
        <p class="sub" style="margin:0">${latest.level ? `ค่าพลังสมอง (MND) ตอนนี้อยู่ที่ เลเวล ${latest.level}/10` : latest.reason}</p>
        <div class="grid2" style="margin-top:8px">
          <button class="btn go sm" data-ex="${brainState.mode === 'match' ? 'bmatch' : 'bcalc'}">เล่นอีกครั้ง</button>
          <button class="btn ghost sm" data-ex="bmenu">เลือกเกมอื่น</button>
        </div>
      </div></section>`;
  }

  if (brainState.mode === 'match') {
    return `<section class="view">${top('จับคู่คำความจำ', 'me')}
      <div class="row" style="justify-content:space-between">
        <span class="pill">จับคู่แล้ว ${brainState.matchedPairs}/4 คู่</span>
        <span class="sub">เปิดไปแล้ว ${brainState.tries} ครั้ง</span>
      </div>
      <div class="card">
        <div class="brain-grid">
          ${brainState.deck.map((c, idx) => `<button class="bcard ${c.open || c.matched ? 'open' : ''} ${c.matched ? 'matched' : ''}" data-ex="bflip:${idx}" ${c.open || c.matched ? 'disabled' : ''} style="${c.open || c.matched ? `background:${c.color};color:${c.ink};border-color:${c.ink}` : ''}">
            ${c.open || c.matched ? `<b>${esc(c.label)}</b>` : '<span>?</span>'}
          </button>`).join('')}
        </div>
      </div>
      <button class="btn ghost sm" data-ex="bmenu">กลับเมนูเกม</button></section>`;
  }

  const q = brainState.qs[brainState.idx];
  return `<section class="view">${top('คิดเลขสบายๆ', 'me')}
    <div class="row" style="justify-content:space-between">
      <span class="pill">ข้อ ${brainState.idx + 1}/${brainState.qs.length}</span>
      <span class="sub">ตอบถูกแล้ว ${brainState.correct} ข้อ</span>
    </div>
    <div class="card stack-v" style="text-align:center;padding:26px 20px">
      <div class="h tnum" style="font-size:2.4rem;color:var(--god)">${esc(q.text)}</div>
      <div class="grid3" style="margin-top:12px">
        ${q.choices.map((ch) => `<button class="btn ghost" data-ex="bans:${ch}" style="font-size:1.5rem">${ch}</button>`).join('')}
      </div>
    </div>
    <button class="btn ghost sm" data-ex="bmenu">กลับเมนูเกม</button></section>`;
}

/* ================================================================ ตัวจัดการคลิก */
export function handleExtrasClick(e) {
  const btn = e.target.closest('[data-ex]');
  if (!btn) return false;
  const raw = btn.dataset.ex;
  const [cmd, arg] = raw.split(':');

  if (cmd === 'hreload') { loadHobbyOptions(true); return true; }
  if (cmd === 'hpick') {
    const o = hobbyState.options?.[Number(arg)];
    if (o) { hobbyState.active = o; hobbyState.stepDone = new Set(); ctx.render(); }
    return true;
  }
  if (cmd === 'hback') { hobbyState.active = null; hobbyState.stepDone = new Set(); ctx.render(); return true; }
  if (cmd === 'hstep') {
    const i = Number(arg);
    if (hobbyState.stepDone.has(i)) hobbyState.stepDone.delete(i);
    else hobbyState.stepDone.add(i);
    ctx.render();
    return true;
  }
  if (cmd === 'hfinish' && hobbyState.active) {
    const s = S();
    const o = hobbyState.active;
    s.hobbyHistory = recordChoice(s.hobbyHistory || [], o, todayKey());
    if (o.category === 'brain' || o.category === 'reading') {
      const tr = addTraining(s.training, { type: 'brain', date: todayKey(), metGoal: true });
      s.training = tr.log;
    }
    hobbyState.active = null;
    hobbyState.options = null;
    ctx.commit();
    ctx.render();
    ctx.toast(`ทำกิจกรรม "${o.title}" เสร็จแล้ว ระบบจำความชอบไว้เสนอครั้งต่อไปค่ะ`);
    return true;
  }

  if (cmd === 'bmenu') { brainState = null; ctx.render(); return true; }
  if (cmd === 'bmatch') { startMatchGame(); ctx.render(); return true; }
  if (cmd === 'bcalc') { startCalcGame(); ctx.render(); return true; }
  if (cmd === 'bflip' && brainState?.mode === 'match' && !brainState.lock) {
    const idx = Number(arg);
    const card = brainState.deck[idx];
    if (!card || card.open || card.matched) return true;
    card.open = true;
    brainState.flipped.push(idx);
    if (brainState.flipped.length === 2) {
      brainState.tries += 1;
      const [i1, i2] = brainState.flipped;
      const c1 = brainState.deck[i1], c2 = brainState.deck[i2];
      if (c1.id === c2.id) {
        c1.matched = c2.matched = true;
        brainState.matchedPairs += 1;
        brainState.flipped = [];
        if (brainState.matchedPairs === MATCH_PAIRS.length) {
          finishBrainGame(Math.min(1, MATCH_PAIRS.length / Math.max(MATCH_PAIRS.length, brainState.tries)));
          return true;
        }
      } else {
        brainState.lock = true;
        ctx.render();
        setTimeout(() => {
          if (brainState?.mode === 'match') {
            c1.open = false; c2.open = false;
            brainState.flipped = [];
            brainState.lock = false;
            ctx.render();
          }
        }, 750);
        return true;
      }
    }
    ctx.render();
    return true;
  }
  if (cmd === 'bans' && brainState?.mode === 'calc' && !brainState.done) {
    const q = brainState.qs[brainState.idx];
    const ok = Number(arg) === q.ans;
    if (ok) brainState.correct += 1;
    ctx.toast(ok ? 'ถูกต้องค่ะ!' : `คำตอบคือ ${q.ans} ไม่เป็นไร ลองข้อต่อไปค่ะ`);
    brainState.idx += 1;
    if (brainState.idx >= brainState.qs.length) {
      finishBrainGame(brainState.correct / brainState.qs.length);
    } else {
      ctx.render();
    }
    return true;
  }
  return false;
}
