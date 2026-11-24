// ก้าวรวมใจ — โหลดเฉพาะเบราว์เซอร์ที่ไม่รองรับ ES module (เก่ามาก) · แจ้งให้อัปเดตแทนจอขาว
(function () {
  var box = document.createElement('div');
  box.setAttribute('role', 'alert');
  box.style.cssText = 'margin:16px;padding:20px;border-radius:16px;background:#FFF1DC;color:#5A2E00;font:18px/1.6 Tahoma,sans-serif';
  box.innerHTML = '<b>เบราว์เซอร์นี้เก่าเกินไป</b><br>กรุณาอัปเดต หรือเปิดด้วย Chrome / Safari รุ่นใหม่ (iOS Safari 15+ · Chrome/Edge 100+ · Samsung Internet 18+ · Firefox 100+)';
  document.body.insertBefore(box, document.body.firstChild);
})();
