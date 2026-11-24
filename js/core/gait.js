// ก้าวรวมใจ — ตรวจว่า "เดินจริง" จากสัญญาณความเร่ง (ใช้ร่วมกันทั้งเบราว์เซอร์ เซิร์ฟเวอร์ และเป็นต้นแบบให้เฟิร์มแวร์)
// ทุกค่าเป็นค่าตั้งต้นจากการจำลอง ต้องปรับจากข้อมูลผู้สูงอายุจริงก่อนใช้งาน
// รองรับโหมดพักฟื้น/ใช้อุปกรณ์ช่วยเดิน: ผ่อนปรนเกณฑ์จังหวะก้าว ใช้การจับเวลาเดินร่วมกับ Talk Test แทน [ออกแบบเอง]

export const RULES = Object.freeze({
  hz: 50,                // อัตราสุ่มสัญญาณ (ครั้ง/วินาที)
  peakG: 1.18,           // ยอดคลื่นที่นับเป็นก้าว (หน่วย g)
  minStepGapSec: 0.25,   // สองก้าวต้องห่างกันอย่างน้อย
  cadenceMin: 1.5,       // ก้าว/วินาที
  cadenceMax: 2.2,
  cvMax: 0.15,           // ความแกว่งของช่วงห่างระหว่างก้าว (สัมประสิทธิ์การแปรผัน)
  minContinuousSec: 180, // ต้องเดินติดกันอย่างน้อย 3 นาที
  breakGapSec: 2.0,      // ช่วงหยุดเกินนี้ถือว่าตัดช่วงเดิน
  recoveryMinSec: 60,    // [ออกแบบเอง] ช่วงพักฟื้นหรือใช้อุปกรณ์ช่วยเดิน เดินอย่างน้อย 1 นาทีถือว่านับ (ไม่เร่งให้ฝืน)
});

/** หาตำแหน่งก้าวจากขนาดความเร่ง (g) — คืนค่าเวลาของแต่ละก้าวเป็นวินาที */
export function detectSteps(mag, hz = RULES.hz, rules = RULES) {
  const times = [];
  let last = -Infinity;
  for (let i = 1; i < mag.length - 1; i++) {
    const v = mag[i];
    if (v >= rules.peakG && v >= mag[i - 1] && v > mag[i + 1]) {
      const t = i / hz;
      if (t - last >= rules.minStepGapSec) { times.push(t); last = t; }
    }
  }
  return times;
}

function mean(a) { return a.reduce((s, x) => s + x, 0) / (a.length || 1); }
function std(a) { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); }

/** วิเคราะห์ช่วงสัญญาณหนึ่งช่วง แล้วตัดสินว่านับเป็นภารกิจได้ไหม */
export function analyze(mag, hz = RULES.hz, rules = RULES) {
  const times = detectSteps(mag, hz, rules);
  const durationSec = mag.length / hz;
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  let longest = 0, runStart = times[0] ?? 0;
  for (let i = 1; i <= times.length; i++) {
    const broke = i === times.length || times[i] - times[i - 1] > rules.breakGapSec;
    if (broke) { longest = Math.max(longest, (times[i - 1] ?? runStart) - runStart); runStart = times[i]; }
  }
  const walkGaps = gaps.filter((g) => g <= rules.breakGapSec);
  const cadence = walkGaps.length ? 1 / mean(walkGaps) : 0;
  const cv = walkGaps.length > 2 ? std(walkGaps) / mean(walkGaps) : 1;

  const checks = [
    { id: 'cadence', ok: cadence >= rules.cadenceMin && cadence <= rules.cadenceMax,
      label: `จังหวะก้าว ${cadence.toFixed(2)} ก้าว/วินาที`, rule: `ช่วงปกติ ${rules.cadenceMin}–${rules.cadenceMax}` },
    { id: 'rhythm', ok: cv <= rules.cvMax,
      label: `ช่วงห่างระหว่างก้าวแกว่ง ${(cv * 100).toFixed(0)}%`, rule: `ไม่เกิน ${rules.cvMax * 100}%` },
    { id: 'continuous', ok: longest >= rules.minContinuousSec,
      label: `เดินต่อเนื่อง ${fmtMin(longest)}`, rule: `อย่างน้อย ${rules.minContinuousSec / 60} นาที` },
  ];
  const ok = times.length > 0 && checks.every((c) => c.ok);
  let reason = 'walk';
  if (!times.length) reason = 'still';
  else if (!checks[0].ok || !checks[1].ok) reason = 'shake';
  else if (!checks[2].ok) reason = 'short';
  return { ok, reason, steps: times.length, durationSec, cadence, cv, longestSec: longest, checks };
}

/**
 * [ออกแบบเอง] โหมดผ่อนปรนสำหรับผู้ที่กำลังฟื้นตัว (RECOVERING) หรือใช้ไม้เท้า/วอล์กเกอร์
 * ไม่บังคับความเร็ว 1.5–2.2 ก้าว/วินาที หรือเดินรวดเดียว 3 นาที เพื่อไม่ให้ผู้สูงอายุฝืนเดินเร็วจนหน้ามืด
 * ใช้การนับเวลาเดินร่วมกับ Talk Test (พูดเป็นประโยคได้ ร้องเพลงไม่ได้ · Borg 12–14)
 */
export function analyzeRecoveryWalk({ durationSec = 0, talkTestOk = true, modeLabel = 'โหมดพักฟื้น' } = {}, rules = RULES) {
  const dur = Math.max(0, Math.round(durationSec));
  const timeOk = dur >= rules.recoveryMinSec;
  const talkOk = talkTestOk !== false;
  const checks = [
    { id: 'mode', ok: true, label: `ผ่อนปรนเกณฑ์จังหวะก้าว (${modeLabel})`, rule: 'เดินช้าได้ ไม่ต้องฝืนเร่งจังหวะ' },
    { id: 'talk', ok: talkOk, label: talkOk ? 'ทดสอบการพูด: พูดเป็นประโยคได้สบาย (Borg 12–14)' : 'ทดสอบการพูด: รู้สึกหอบ พูดไม่เป็นประโยค', rule: 'ควรพูดเป็นประโยคได้ขณะเดิน' },
    { id: 'continuous', ok: timeOk, label: `เวลาเดินรวม ${fmtMin(dur)}`, rule: `อย่างน้อย ${rules.recoveryMinSec / 60} นาที` },
  ];
  const ok = timeOk;
  const reason = !timeOk ? 'short' : 'walk';
  const estSteps = Math.round(dur * 1.15); // ประมาณการก้าวช้า (~1.15 ก้าว/วิ) สำหรับแสดงผล
  return { ok, reason, relaxed: true, talkWarn: !talkOk, steps: estSteps, durationSec: dur, cadence: 1.15, cv: 0.08, longestSec: dur, checks };
}

export function fmtMin(sec) {
  const t = Math.round(sec), m = Math.floor(t / 60), s = t % 60;
  return s ? `${m} นาที ${s} วินาที` : `${m} นาที`;
}

/** สร้างสัญญาณจำลองสำหรับสาธิต: walk = เดินจริง, shake = เขย่ามือ, still = วางเฉย */
export function synth(kind, seconds, hz = RULES.hz, seed = 7) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const n = Math.round(seconds * hz);
  const out = new Float32Array(n);
  if (kind === 'walk') {
    const f = 1.8;
    let phase = 0;
    for (let i = 0; i < n; i++) {
      phase += (2 * Math.PI * f * (1 + (rnd() - 0.5) * 0.06)) / hz;
      out[i] = 1 + 0.32 * Math.max(0, Math.sin(phase)) ** 3 + (rnd() - 0.5) * 0.05;
    }
  } else if (kind === 'shake') {
    for (let i = 0; i < n; i++) {
      const burst = rnd() < 0.5 ? 0.9 : 0.15;
      out[i] = 1 + burst * Math.abs(Math.sin((i / hz) * 2 * Math.PI * (3 + rnd() * 3))) + (rnd() - 0.5) * 0.3;
    }
  } else {
    for (let i = 0; i < n; i++) out[i] = 1 + (rnd() - 0.5) * 0.02;
  }
  return out;
}
