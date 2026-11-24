// ก้าวรวมใจ — สถานะของแอป (เก็บในเครื่องด้วย localStorage) · ข้อมูลทั้งหมดในไฟล์นี้เป็นข้อมูลตัวอย่างสำหรับสาธิต
// ตัวเลขที่ต้องตรงกับเอกสาร: ก๊วนบ้านสวน 86 · วัดใหม่ 81 · ตลาดเช้า 74 · ริมคลอง 69 · ป้าแดงเลเวล 7 (640 แต้ม)
const KEY = 'kaoruamjai.v2';
const DAY = 86400000;

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** วันที่ย้อนหลัง n วัน (0 = วันนี้) */
export function dayKey(n = 0, from = new Date()) { return todayKey(new Date(from.getTime() - n * DAY)); }
/** เลื่อนวันที่ (YYYY-MM-DD) ไปข้างหน้า/ถอยหลัง n วัน */
export function shiftKey(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return todayKey(new Date(new Date(y, m - 1, d, 12).getTime() + n * DAY));
}

// ประวัติตัวอย่าง 6 วันก่อนหน้า: 15 + 12 + 0 + 15 + 10 + 18 = 70 นาที (ตรงกับเป้าสัปดาห์ 70 นาทีของป้าแดง)
function sampleLog() {
  const rows = [
    [6, '06:10', 15, 'walk', 'fun', false],
    [5, '06:25', 12, 'walk', 'fun', true],
    [4, '16:40', 4, 'shake', null, false],
    [3, '06:05', 15, 'walk', 'neutral', true],
    [2, '17:10', 10, 'walk', 'fun', false],
    [1, '06:15', 18, 'walk', 'fun', true],
  ];
  return rows.map(([ago, time, min, verdict, feeling, together], i) => ({
    day: dayKey(ago), time, minutes: verdict === 'walk' ? min : 0, durationSec: min * 60,
    steps: Math.round(min * 60 * (verdict === 'walk' ? 1.8 : 2.6)), counted: verdict === 'walk', reason: verdict,
    feeling, together, seq: i - 1, sample: true,
  }));
}

// ผลประเมินตัวอย่างของป้าแดง (หญิง 66 · ลุก-นั่ง 13 → ระดับ 2 = 15 นาที/วัน 70 นาที/สัปดาห์)
export function demoAssessmentInput() {
  return {
    consent: true, age: 66, sex: 'F', heightCm: 152, weightKg: 56, activityMin: 60,
    parq: [true, false, false, false, true, false, false], parqFollowUp: 'all_no', doctorCleared: false,
    stayIndependent: Array(12).fill(false), falls: 0, fallInjury: false, unableToGetUp: false, syncope: false,
    conditions: ['hypertension'], surgery: [], aids: [], meds: [],
    test: { chairStand: 13, usedArms: false, armCurl: 15, armStdWeight: false, step2min: 80, upGoSec: 5.5, balanceSecs: [10, 10, 10, 4] },
  };
}

/** ฟิลด์ของระบบสุขภาพ (แบบประเมิน · แผนท่า · โหมดพักฟื้น v3.1 · ท้องฟ้าใจ · 2Q · งานอดิเรก · ฝึกสมอง) */
export function healthDefaults(withDemoAssessment = true) {
  const weekStart = dayKey((new Date().getDay() + 6) % 7); // วันจันทร์ของสัปดาห์นี้
  return {
    assessment: withDemoAssessment ? { date: dayKey(10), input: demoAssessmentInput(), sample: true } : null,
    prevStats: null,
    lastRetestCompare: null,
    progress: {
      stack: 3, zeroWeeks: 0, tier: 2,
      freeze: null, waitingClearance: false, recovery: null,
      transitionWeek: false, needRetest: false, weekStart,
    },
    lastActiveDate: withDemoAssessment ? dayKey(1) : todayKey(),
    absenceDismissedDate: null,
    unwellDates: [],
    activeDates: [dayKey(1), dayKey(3)],
    strengthDates: [dayKey(2)],
    training: [],
    planDone: { date: todayKey(), ids: [] },
    planXpDate: null,
    readiness: null,
    feelLog: [],
    mood: [{ date: dayKey(2), sky: 'sun' }, { date: dayKey(1), sky: 'cloud' }],
    last2Q: null, twoQ: null, familyConsent: false,
    hobbyHistory: [],
    hobbyCurrent: null,
    brainGames: withDemoAssessment
      ? [{ date: dayKey(5), accuracy: 0.85, kind: 'match' }, { date: dayKey(3), accuracy: 0.9, kind: 'calc' }, { date: dayKey(1), accuracy: 0.8, kind: 'match' }]
      : [],
    cheersLog: withDemoAssessment ? [dayKey(3), dayKey(1)] : [],
  };
}

/** เติมฟิลด์ที่ขาดให้ข้อมูลเดิมในเครื่อง โดยไม่ลบของเดิม */
export function migrate(s) {
  const isSample = s.user?.name === 'ป้าแดง' && s.log?.some((x) => x.sample);
  const h = healthDefaults(isSample);
  for (const [k, v] of Object.entries(h)) if (s[k] === undefined) s[k] = v;
  s.progress = { ...h.progress, ...(s.progress || {}) };
  if (!Array.isArray(s.unwellDates)) s.unwellDates = [];
  if (!Array.isArray(s.hobbyHistory)) s.hobbyHistory = [];
  if (!Array.isArray(s.brainGames)) s.brainGames = [];
  if (!Array.isArray(s.cheersLog)) s.cheersLog = [];
  if (!s.mode) s.mode = isSample ? 'sample' : 'mine';
  return s;
}

export function defaults() {
  return {
    v: 2,
    mode: 'sample',
    ...healthDefaults(true),
    user: { name: 'ป้าแดง', deviceId: 'clip-001', demoKey: 'demo-key-clip-001', xp: 640, dailyGoal: 15, weeklyGoal: 70, chairReps: 13 },
    today: { date: todayKey(), done: false },
    feelings: ['fun', 'fun', 'neutral', 'fun', 'fun'],
    togetherCount: 3,
    seq: 4,
    lastEnd: 0,
    log: sampleLog(),
    device: { battery: 82, hub: 'สถานีรับข้อมูลบ้านป้าแดง', lastSyncAt: Date.now() - 2 * 60000 },
    team: {
      id: 'baansuan', name: 'ก๊วนบ้านสวน', togetherMin: 12, meetup: null,
      members: [
        { name: 'ป้าแดง', me: true, minutes: 70, goal: 70, today: false, frozen: false, look: 'greet', head: 'head_greet' },
        { name: 'ลุงชัย', minutes: 60, goal: 70, today: true, frozen: false, look: 'main', head: 'head_main' },
        { name: 'ยายบุญ', minutes: 35, goal: 50, today: true, frozen: false, look: 'cute', head: 'head_cute' },
        { name: 'ป้านวล', minutes: 50, goal: 50, today: false, frozen: false, look: 'think', head: 'head_think' },
        { name: 'ตาเพิ่ม', minutes: 37, goal: 50, today: false, frozen: false, look: 'greet', head: 'head_happy' },
      ],
      feed: [
        { who: 'ลุงชัย', head: 'head_main', text: 'เดินครบภารกิจ 15 นาที', time: '06:20' },
        { who: 'ยายบุญ', head: 'head_cute', text: 'ส่งเสียงชม "เก่งมาก!" ให้ทั้งก๊วน', time: '06:45' },
        { who: 'ยายบุญ', head: 'head_cute', text: 'เดินกับลุงชัย ได้โบนัสเดินด้วยกัน', time: '06:32' },
      ],
    },
    otherTeams: [
      { id: 'watmai', name: 'ก๊วนวัดใหม่', members: [{ minutes: 70, goal: 70 }, { minutes: 50, goal: 70 }, { minutes: 40, goal: 50 }, { minutes: 36, goal: 50 }] },
      { id: 'talat', name: 'ก๊วนตลาดเช้า', members: [{ minutes: 52, goal: 70 }, { minutes: 37, goal: 50 }, { minutes: 37, goal: 50 }] },
      { id: 'rimkhlong', name: 'ก๊วนริมคลอง', members: [{ minutes: 48, goal: 70 }, { minutes: 35, goal: 50 }] },
    ],
    family: { elder: 'ยายบุญ', days: [1, 1, 0, 1, 1, 0, -1], minutes: 35, goal: 50, fun: 3, tired: 1, missionMin: 15, voices: 0 },
    requests: [{ name: 'ป้าสมใจ', by: 'ยายบุญ' }],
    settings: { size: 'm', voice: true, motion: true, speed: 20 },
    lastResult: null,
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.v === 2) {
        migrate(s);
        if (s.today?.date !== todayKey()) s.today = { date: todayKey(), done: false };
        if (s.planDone?.date !== todayKey()) s.planDone = { date: todayKey(), ids: [] };
        return s;
      }
    }
  } catch { /* ใช้ค่าเริ่มต้น */ }
  return defaults();
}

export function hasSaved() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* เบราว์เซอร์ไม่ให้เก็บ ก็ทำงานต่อได้ */ }
}

export function reset() {
  try { localStorage.removeItem(KEY); localStorage.removeItem('kaoruamjai.v1'); } catch { /* ignore */ }
  return defaults();
}
