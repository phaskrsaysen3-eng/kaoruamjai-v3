// ก้าวรวมใจ — รันก่อนวาดหน้า (สคริปต์ธรรมดา ไม่ใช่ module · แยกไฟล์เพื่อให้ CSP ไม่ต้องอนุญาต inline script)
// 1) ตั้งค่าที่กันหน้ากระพริบ: มี JS · ขนาดอักษร · เคารพ "ลดการเคลื่อนไหว" ทั้งของเครื่องและของแอป
// 2) P12: ถ้าเบราว์เซอร์เก่าเกินจนแอปเริ่มไม่ได้ ให้ขึ้นข้อความแทนจอขาว
(function () {
  var r = document.documentElement, m = true, size = 'm';
  try {
    var s = JSON.parse(localStorage.getItem('kaoruamjai.v2'));
    if (s && s.settings) { if (s.settings.motion === false) m = false; if (s.settings.size) size = s.settings.size; }
  } catch (e) { /* โหมดส่วนตัวหรือถูกบล็อก ใช้ค่าเริ่มต้น */ }
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) m = false;
  r.className += ' js';
  r.setAttribute('data-motion', m ? 'on' : 'off');
  r.setAttribute('data-size', size);

  window.addEventListener('load', function () {
    if (!document.getElementById('app')) return;
    setTimeout(function () {
      if (window.__krjOk) return;
      var el = document.getElementById('app');
      if (el) {
        el.innerHTML = '<div style="padding:28px;font-size:20px;line-height:1.6;font-family:Tahoma,sans-serif">' +
          '<b>เบราว์เซอร์นี้เก่าเกินไป</b><br>กรุณาอัปเดตเบราว์เซอร์ หรือเปิดด้วย Chrome / Safari รุ่นใหม่ ' +
          '(iOS Safari 15 ขึ้นไป · Chrome/Edge 100 ขึ้นไป · Samsung Internet 18 ขึ้นไป · Firefox 100 ขึ้นไป)</div>';
      }
    }, 4000);
  });
})();

// โหลดฟอนต์ Google แบบไม่บังหน้า: เริ่มด้วยฟอนต์สำรองของเครื่อง แล้วสลับเมื่อฟอนต์มาถึง (ไม่ใช้ onload inline เพราะ CSP)
(function () {
  function on(l) { l.media = 'all'; }
  var links = document.querySelectorAll('link[data-font]');
  for (var i = 0; i < links.length; i++) {
    var l = links[i];
    if (l.sheet) on(l); else l.addEventListener('load', on.bind(null, l));
  }
})();
