// ก้าวรวมใจ — เช็กอินอารมณ์ประจำวัน ("ท้องฟ้าวันนี้") และการชวนตอบ 2Q
// หลักความปลอดภัย:
//  • ไม่คิดเป็นคะแนน ไม่เป็นค่าพลัง ไม่ขึ้นลีก ไม่โชว์ให้ก๊วนเห็น
//  • ไม่ส่งข้อมูลอารมณ์ให้ Gemini หรือบริการภายนอกใดๆ
//  • แอปไม่วินิจฉัย ทำได้แค่คัดกรองเบื้องต้นด้วย 2Q ของกรมสุขภาพจิต แล้วส่งต่อให้ อสม./รพ.สต.
//  • แจ้งลูกหลานได้เฉพาะเมื่อผู้สูงอายุยินยอม และส่งแค่ "ควรไปคุยกับเจ้าหน้าที่" ไม่ส่งคำตอบ

import { daysBetween } from './plan-progress.js';

export const SKY = Object.freeze({
  sun: { label: 'แจ่มใส', hint: 'วันนี้ใจสบาย' },
  cloud: { label: 'มีเมฆ', hint: 'เฉยๆ' },
  rain: { label: 'ฝนตก', hint: 'วันนี้ใจหม่น' },
});

/** บันทึกท้องฟ้าวันนี้ (วันละ 1 ค่า ถ้ากดใหม่จะแทนค่าเดิม) */
export function addMood(log = [], date, sky) {
  if (!SKY[sky]) throw new Error(`ไม่รู้จักค่า "${sky}"`);
  return [...log.filter((e) => e.date !== date), { date, sky }].sort((a, b) => a.date.localeCompare(b.date));
}

export const MOOD_TRIGGER = Object.freeze({
  rainDays: 3, windowDays: 7, // design: ฝน ≥ 3 วันใน 7 วัน → ชวนตอบ 2Q
  cooldownDays: 14,           // 2Q ถามย้อนหลัง 2 สัปดาห์ จึงไม่ชวนซ้ำภายใน 14 วัน
  src: 'จำนวนวันที่ชวนเป็นค่าออกแบบ · ระยะ 14 วันตามคำถาม 2Q ("ใน 2 สัปดาห์ที่ผ่านมา รวมวันนี้")',
});

/** ควรชวนตอบ 2Q ไหม — ชวนเท่านั้น ไม่บังคับ */
export function moodPrompt(log = [], today, last2QDate = null) {
  if (last2QDate && daysBetween(last2QDate, today) < MOOD_TRIGGER.cooldownDays) return { offer2Q: false, reason: 'เพิ่งตอบ 2Q ไปไม่ถึง 14 วัน' };
  const rain = log.filter((e) => e.sky === 'rain' && daysBetween(e.date, today) >= 0 && daysBetween(e.date, today) < MOOD_TRIGGER.windowDays).length;
  return rain >= MOOD_TRIGGER.rainDays
    ? { offer2Q: true, rainDays: rain, reason: `ช่วงนี้ใจหม่น ${rain} วันใน 7 วัน` }
    : { offer2Q: false, rainDays: rain, reason: '' };
}

// ข้อความ 2Q ตามที่ศูนย์สุขภาพจิตที่ 2 กรมสุขภาพจิตเผยแพร่ (ห้ามแก้ถ้อยคำ)
export const TWO_Q = Object.freeze({
  src: 'แบบคัดกรองโรคซึมเศร้าด้วย 2 คำถาม (2Q) กรมสุขภาพจิต · ผู้ใช้คัดกรองในชุมชน: อสม. พยาบาล เจ้าหน้าที่สาธารณสุข',
  url: 'https://www.mhc2.go.th/2q/start.php',
  questions: Object.freeze([
    'ใน 2 สัปดาห์ที่ผ่านมา รวมวันนี้ท่านรู้สึกหดหู่ เศร้า หรือท้อแท้สิ้นหวัง หรือไม่',
    'ใน 2 สัปดาห์ที่ผ่านมา รวมวันนี้ท่านรู้สึกเบื่อ ทำอะไรก็ไม่เพลิดเพลิน หรือไม่',
  ]),
});

export const HELP = Object.freeze({
  mentalHotline: { number: '1323', text: 'สายด่วนสุขภาพจิต กรมสุขภาพจิต โทรฟรี 24 ชั่วโมง' },
  emergency: { number: '1669', text: 'เจ็บป่วยฉุกเฉิน' },
});

/** แปลผล 2Q — ตอบ "ใช่" ข้อใดข้อหนึ่ง = มีแนวโน้ม ควรได้รับการประเมินต่อ (9Q) โดยเจ้าหน้าที่ */
export function score2Q(answers) {
  if (!Array.isArray(answers) || answers.length !== 2 || answers.some((a) => typeof a !== 'boolean')) throw new Error('ต้องตอบ 2Q ครบ 2 ข้อ (ใช่/ไม่ใช่)');
  const positive = answers.some(Boolean);
  return positive
    ? { positive: true, text: 'คำตอบของท่านบอกว่าช่วงนี้อาจเหนื่อยใจ ควรได้คุยกับ อสม. หรือเจ้าหน้าที่ รพ.สต. ใกล้บ้าน เพื่อประเมินต่ออย่างละเอียด', next: 'แบบประเมิน 9Q โดยเจ้าหน้าที่ (แอปไม่ทำ 9Q เอง)', help: HELP.mentalHotline }
    : { positive: false, text: 'ไม่พบแนวโน้มจากการคัดกรอง ถ้าวันไหนรู้สึกไม่ดี คุยกับคนที่ไว้ใจหรือโทร 1323 ได้เสมอ', next: null, help: HELP.mentalHotline };
}

/** ข้อความที่ส่งให้ลูกหลาน — ส่งได้เฉพาะเมื่อยินยอม และไม่มีคำตอบ 2Q อยู่ในนั้น */
export function familyNotice(result, consent, elderName) {
  if (consent !== true || !result?.positive) return null;
  return { to: 'family', text: `${elderName} อยากให้ช่วยพาไปคุยกับ อสม. หรือเจ้าหน้าที่ รพ.สต. เรื่องสุขภาพใจ` };
}
