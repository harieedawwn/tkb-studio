(function () {
  'use strict';
  var TKB = (window.TKB = window.TKB || {});

  var P = 'Điện thoại', T = 'Máy tính bảng', L = 'Laptop / PC', A = 'In giấy';
  var list = [
    { id: 'phone-16-9', label: 'Điện thoại 16:9', group: P, w: 9, h: 16, note: 'Máy đời cũ: iPhone 6/7/8/SE, Galaxy S6–S7' },
    { id: 'phone-18-9', label: 'Điện thoại 18:9', group: P, w: 9, h: 18, note: 'Máy đời 2017–2019: Galaxy S8, LG G6, Redmi 5' },
    { id: 'phone-195-9', label: 'Điện thoại 19.5:9', group: P, w: 18, h: 39, note: 'iPhone X trở lên (X, 11, 12, 13, 14, 15, 16)' },
    { id: 'phone-20-9', label: 'Điện thoại 20:9', group: P, w: 9, h: 20, note: 'Oppo, Realme, Vivo, Samsung A, Redmi — đa số máy màn dài' },
    { id: 'phone-21-9', label: 'Điện thoại 21:9', group: P, w: 9, h: 21, note: 'Sony Xperia và vài máy màn rất dài' },
    { id: 'tablet-4-3', label: 'Máy tính bảng 4:3', group: T, w: 3, h: 4, note: 'iPad thường, iPad mini, iPad Air (gần 4:3)' },
    { id: 'tablet-16-10', label: 'Máy tính bảng 16:10', group: T, w: 10, h: 16, note: 'Galaxy Tab, Xiaomi Pad, Lenovo Tab (đặt dọc)' },
    { id: 'laptop-16-9', label: 'Laptop 16:9', group: L, w: 16, h: 9, note: 'Laptop và màn hình Full HD phổ biến' },
    { id: 'laptop-16-10', label: 'Laptop 16:10', group: L, w: 16, h: 10, note: 'MacBook Air/Pro, Dell XPS, nhiều laptop mới' },
    { id: 'laptop-3-2', label: 'Laptop 3:2', group: L, w: 3, h: 2, note: 'Surface Laptop, Surface Pro, Framework' },
    { id: 'ultrawide-21-9', label: 'Màn siêu rộng 21:9', group: L, w: 21, h: 9, note: 'Màn hình ultrawide cho bàn học' },
    { id: 'print-a4', label: 'Giấy A4', group: A, w: 210, h: 297, note: 'In ra dán bàn học, dán tường (dọc)' },
    { id: 'square', label: 'Vuông 1:1', group: A, w: 1, h: 1, note: 'Ảnh vuông, đăng mạng xã hội' }
  ];

  function ratio(s) { return s.w / s.h; }
  function near(a, b, tol) { return Math.abs(a - b) / b <= tol; }

  function byRatio(size) {
    if (!size || !(size.w > 0) || !(size.h > 0)) return null;
    var r = ratio(size);
    for (var i = 0; i < list.length; i++) if (near(r, ratio(list[i]), 0.01)) return list[i].id;
    return null;
  }

  function flip(size) { return { w: size.h, h: size.w }; }

  function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }

  // Small fraction approximating r (denominator <= 40) within 1%, else reduced pixels
  function reduce(w, h) {
    var r = w / h, best = null;
    for (var d = 1; d <= 40; d++) {
      var n = Math.round(r * d);
      if (n > 0 && near(n / d, r, 0.01)) { best = { w: n, h: d }; break; }
    }
    if (best) { var g = gcd(best.w, best.h); return { w: best.w / g, h: best.h / g }; }
    var g2 = gcd(w, h) || 1;
    return { w: w / g2, h: h / g2 };
  }

  function detect() {
    var sw = 0, sh = 0, dpr = 1;
    try {
      dpr = window.devicePixelRatio || 1;
      sw = (window.screen && window.screen.width) || 0;
      sh = (window.screen && window.screen.height) || 0;
    } catch (e) {}
    var pw = Math.round(sw * dpr), ph = Math.round(sh * dpr);
    if (!(pw > 0 && ph > 0)) { return { size: { w: 9, h: 20 }, id: 'phone-20-9', label: list[3].label }; }
    var r = pw / ph, best = null, bestD = Infinity;
    for (var i = 0; i < list.length; i++) {
      var d = Math.abs(r - ratio(list[i])) / ratio(list[i]);
      if (d < bestD) { bestD = d; best = list[i]; }
    }
    if (best && bestD <= 0.03) return { size: { w: best.w, h: best.h }, id: best.id, label: best.label };
    var s = reduce(pw, ph);
    return { size: s, id: byRatio(s), label: 'Màn hình ' + s.w + ':' + s.h };
  }

  function pixels(size, short) {
    var m = Math.min(size.w, size.h);
    return { w: Math.max(1, Math.round(short * size.w / m)), h: Math.max(1, Math.round(short * size.h / m)) };
  }

  TKB.devices = { list: list, byRatio: byRatio, flip: flip, detect: detect, pixels: pixels };
  TKB.QUALITY = [
    { id: '720p', label: '720p', short: 720 },
    { id: '1080p', label: '1080p (Full HD)', short: 1080 },
    { id: '2k', label: '2K', short: 1440 },
    { id: '4k', label: '4K', short: 2160 }
  ];
})();
