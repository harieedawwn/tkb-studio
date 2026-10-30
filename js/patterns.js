(function () {
  'use strict';
  var TKB = (window.TKB = window.TKB || {});

  var list = [
    { id: 'dots', name: 'Chấm bi' },
    { id: 'grid', name: 'Ô vuông' },
    { id: 'lines', name: 'Dòng kẻ vở' },
    { id: 'checker', name: 'Caro' },
    { id: 'specks', name: 'Đốm nhỏ' },
    { id: 'waves', name: 'Sóng' },
    { id: 'confetti', name: 'Hoa giấy' },
    { id: 'blocks', name: 'Khối vuông' },
    { id: 'plus', name: 'Dấu cộng' },
    { id: 'diagonal', name: 'Sọc chéo' },
    { id: 'scales', name: 'Vảy cá' },
    { id: 'terrazzo', name: 'Đá mài' }
  ];

  // ---- helpers ----
  function hex(c) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(c || '').trim());
    if (!m) return null;
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  // mix a toward b by t (0..1), returns hex; falls back to a
  function mix(a, b, t) {
    var x = hex(a), y = hex(b);
    if (!x || !y) return a;
    var o = '#';
    for (var i = 0; i < 3; i++) {
      var v = Math.round(x[i] + (y[i] - x[i]) * t);
      o += (v < 16 ? '0' : '') + v.toString(16);
    }
    return o;
  }
  // integer hash -> float 0..1, deterministic per (ix, iy, salt)
  function rnd(ix, iy, salt) {
    var h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(salt | 0, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = Math.imul(h ^ (h >>> 16), 2246822519);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  function seedOf(id) {
    var s = 7;
    for (var i = 0; i < id.length; i++) s = (Math.imul(s, 31) + id.charCodeAt(i)) | 0;
    return s;
  }

  var P = {};

  P.dots = function (c, W, H, o) {
    var s = 46 * o.k, r = 3.4 * o.k;
    c.fillStyle = o.color; c.beginPath();
    for (var j = 0, y = 0; y < H + s; j++, y += s) {
      for (var x = (j % 2) * s / 2; x < W + s; x += s) { c.moveTo(x + r, y); c.arc(x, y, r, 0, 6.2832); }
    }
    c.fill();
  };

  P.grid = function (c, W, H, o) {
    var s = 54 * o.k, t = Math.max(1, 1.6 * o.k);
    c.fillStyle = o.color;
    for (var x = s / 2; x < W + t; x += s) c.fillRect(x - t / 2, 0, t, H);
    for (var y = s / 2; y < H + t; y += s) c.fillRect(0, y - t / 2, W, t);
  };

  P.lines = function (c, W, H, o) {
    var s = 40 * o.k, t = Math.max(1, 2 * o.k);
    c.fillStyle = o.color;
    for (var y = s; y < H + t; y += s) c.fillRect(0, y - t / 2, W, t);
  };

  P.checker = function (c, W, H, o) {
    var s = 56 * o.k;
    c.fillStyle = mix(o.color, o.bg, 0.35);
    for (var j = 0, y = 0; y < H; j++, y += s) {
      for (var i = (j % 2); i * s < W; i += 2) c.fillRect(i * s, y, s, s);
    }
  };

  P.specks = function (c, W, H, o) {
    var s = 52 * o.k, nx = Math.ceil(W / s) + 1, ny = Math.ceil(H / s) + 1;
    var soft = mix(o.color, o.bg, 0.4);
    for (var j = 0; j < ny; j++) {
      for (var i = 0; i < nx; i++) {
        var n = 1 + (rnd(i, j, o.seed) > 0.6 ? 1 : 0);
        for (var q = 0; q < n; q++) {
          var x = (i + rnd(i, j, o.seed + 1 + q * 7)) * s, y = (j + rnd(i, j, o.seed + 2 + q * 7)) * s;
          var r = (1.4 + rnd(i, j, o.seed + 3 + q * 7) * 2.6) * o.k;
          c.fillStyle = q ? soft : o.color;
          c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
        }
      }
    }
  };

  P.waves = function (c, W, H, o) {
    var sp = 44 * o.k, wl = 60 * o.k, a = 7 * o.k;
    c.strokeStyle = o.color; c.lineWidth = Math.max(1, 2.6 * o.k); c.lineCap = 'round';
    c.beginPath();
    for (var j = 0, y = sp / 2; y < H + sp; j++, y += sp) {
      var off = (j % 2) * wl / 2, up = 1;
      c.moveTo(-wl + off - wl / 2, y);
      for (var x = -wl + off - wl / 2; x < W + wl; x += wl / 2) {
        c.quadraticCurveTo(x + wl / 4, y - up * a * 2, x + wl / 2, y);
        up = -up;
      }
    }
    c.stroke();
  };

  P.confetti = function (c, W, H, o) {
    var s = 66 * o.k, nx = Math.ceil(W / s) + 1, ny = Math.ceil(H / s) + 1;
    var tones = [o.color, mix(o.color, o.bg, 0.45)];
    for (var j = 0; j < ny; j++) {
      for (var i = 0; i < nx; i++) {
        var x = (i + 0.15 + rnd(i, j, o.seed) * 0.7) * s, y = (j + 0.15 + rnd(i, j, o.seed + 1) * 0.7) * s;
        var rot = rnd(i, j, o.seed + 2) * 6.2832, kind = Math.floor(rnd(i, j, o.seed + 3) * 4);
        var z = (5 + rnd(i, j, o.seed + 4) * 5) * o.k;
        c.fillStyle = tones[rnd(i, j, o.seed + 5) > 0.5 ? 1 : 0];
        c.save(); c.translate(x, y); c.rotate(rot); c.beginPath();
        if (kind === 0) c.rect(-z * 1.4, -z * 0.35, z * 2.8, z * 0.7);
        else if (kind === 1) c.arc(0, 0, z * 0.6, 0, 6.2832);
        else if (kind === 2) { c.moveTo(0, -z); c.lineTo(z * 0.9, z * 0.6); c.lineTo(-z * 0.9, z * 0.6); c.closePath(); }
        else c.rect(-z * 0.6, -z * 0.6, z * 1.2, z * 1.2);
        c.fill(); c.restore();
      }
    }
  };

  P.blocks = function (c, W, H, o) {
    var s = 60 * o.k, g = 6 * o.k, nx = Math.ceil(W / s), ny = Math.ceil(H / s);
    var tones = [mix(o.color, o.bg, 0.45), o.color];
    for (var j = 0; j < ny; j++) {
      for (var i = 0; i < nx; i++) {
        var v = rnd(i, j, o.seed);
        if (v > 0.38) continue;
        c.fillStyle = tones[v > 0.15 ? 0 : 1];
        c.fillRect(i * s + g, j * s + g, s - g * 2, s - g * 2);
      }
    }
  };

  P.plus = function (c, W, H, o) {
    var s = 58 * o.k, a = 6.5 * o.k, t = Math.max(1, 2.4 * o.k);
    c.fillStyle = o.color;
    for (var j = 0, y = s / 2; y < H + s; j++, y += s) {
      for (var x = s / 2 + (j % 2) * s / 2; x < W + s; x += s) {
        c.fillRect(x - a, y - t / 2, a * 2, t);
        c.fillRect(x - t / 2, y - a, t, a * 2);
      }
    }
  };

  P.diagonal = function (c, W, H, o) {
    var p = 38 * o.k * 1.4142, t = Math.max(1, 7 * o.k);
    c.strokeStyle = o.color; c.lineWidth = t; c.lineCap = 'butt';
    c.beginPath();
    for (var x = -t; x < W + H + t; x += p) { c.moveTo(x + 2, -2); c.lineTo(x - H - 2, H + 2); }
    c.stroke();
  };

  P.scales = function (c, W, H, o) {
    var R = 27 * o.k, lw = Math.max(1, 2.2 * o.k);
    c.strokeStyle = o.color; c.fillStyle = o.bg; c.lineWidth = lw;
    for (var j = 0, y = 0; y < H + R * 2; j++, y += R) {
      for (var x = (j % 2) * R - R; x < W + R * 2; x += R * 2) {
        c.beginPath(); c.arc(x, y, R - lw / 2, 0, 6.2832); c.fill(); c.stroke();
      }
    }
  };

  P.terrazzo = function (c, W, H, o) {
    var s = 92 * o.k, nx = Math.ceil(W / s) + 1, ny = Math.ceil(H / s) + 1;
    var tones = [o.color, mix(o.color, o.bg, 0.5), mix(o.color, o.bg, 0.75)];
    for (var j = 0; j < ny; j++) {
      for (var i = 0; i < nx; i++) {
        var n = 1 + (rnd(i, j, o.seed) > 0.45 ? 1 : 0);
        for (var q = 0; q < n; q++) {
          var b = o.seed + 10 + q * 13;
          var cx = (i + rnd(i, j, b)) * s, cy = (j + rnd(i, j, b + 1)) * s;
          var R = (5 + rnd(i, j, b + 2) * 10) * o.k, rot = rnd(i, j, b + 3) * 6.2832;
          var sides = 5 + Math.floor(rnd(i, j, b + 4) * 3);
          c.fillStyle = tones[Math.floor(rnd(i, j, b + 5) * 3)];
          c.beginPath();
          for (var v = 0; v < sides; v++) {
            var ang = rot + v / sides * 6.2832, rr = R * (0.6 + rnd(i, j, b + 6 + v) * 0.5);
            var px = cx + Math.cos(ang) * rr, py = cy + Math.sin(ang) * rr * 0.8;
            if (v) c.lineTo(px, py); else c.moveTo(px, py);
          }
          c.closePath(); c.fill();
        }
      }
    }
  };

  function draw(id, ctx, W, H, opts) {
    var fn = P[id];
    if (!fn || !ctx || !(W > 0) || !(H > 0)) return;
    opts = opts || {};
    var sc = Math.min(3, Math.max(0.5, Number(opts.scale) || 1));
    var o = { color: opts.color || '#E3D9C4', bg: opts.bg || '#FFFFFF', k: (W / 1080) * sc, seed: seedOf(id) };
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    try { fn(ctx, W, H, o); } finally { ctx.restore(); }
  }

  TKB.patterns = { list: list, draw: draw };
})();
