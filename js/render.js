/* TKB Studio - js/render.js (P1). Canvas engine. Flat colours only. */
(function () {
'use strict';
var TKB = window.TKB = window.TKB || {};

/* ---------- utils ---------- */
function num(v, d, lo, hi) { v = +v; if (!isFinite(v)) v = d; return Math.min(hi, Math.max(lo, v)); }
function clean(t) {
  t = (t == null ? '' : String(t));
  try { t = t.normalize('NFC'); } catch (e) {}
  return t.replace(/\s+/g, ' ').trim();
}
function hash(str) {
  var h = 2166136261; str = String(str);
  for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
var HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
function hex2rgb(h) {
  h = String(h || '#000').replace('#', '');
  if (h.length === 3) h = h.replace(/./g, '$&$&');
  var n = parseInt(h, 16); if (isNaN(n)) n = 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgb2hex(a) {
  return '#' + a.map(function (v) { v = Math.round(Math.min(255, Math.max(0, v))); return (v < 16 ? '0' : '') + v.toString(16); }).join('');
}
function lum(h) {
  var r = hex2rgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r[0] + 0.7152 * r[1] + 0.0722 * r[2];
}
function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
// first preferred colour with contrast >= 4.5 on bg, else black or white (always reaches >= 4.5)
function pick(bg, prefs) {
  for (var i = 0; i < prefs.length; i++) if (prefs[i] && contrast(bg, prefs[i]) >= 4.5) return prefs[i];
  return contrast(bg, '#101010') >= contrast(bg, '#FFFFFF') ? '#101010' : '#FFFFFF';
}
function mix(a, b, t) {
  var x = hex2rgb(a), y = hex2rgb(b);
  return rgb2hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}
function rgba(h, a) { var c = hex2rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
function contrastInk(color) { return lum(color) > 0.4 ? '#101010' : '#FFFFFF'; }
function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

var HAS_FILTER = (function () {
  try { return 'filter' in document.createElement('canvas').getContext('2d'); } catch (e) { return false; }
})();
var scratch = null;
function scratchCtx() { if (!scratch) scratch = mk(1, 1); return scratch.getContext('2d'); }

/* ---------- theme colours, subject colours ---------- */
var FALLBACK_ACC = ['#E4572E', '#17BEBB', '#FFC914', '#76B041', '#7768AE', '#F28FAD', '#2E86AB', '#F18F01'];
function colorsOf(cfg) {
  var th = TKB.themes.get(cfg.look.theme), ov = cfg.look.colors || {}, c = {};
  ['bg', 'panel', 'ink', 'inkSoft', 'line', 'head', 'headInk'].forEach(function (k) {
    c[k] = HEX.test(ov[k] || '') ? ov[k] : th[k];
  });
  c.accents = th.accents && th.accents.length ? th.accents : FALLBACK_ACC;
  return c;
}
function subjectMap(cfg, acc) {
  var seen = {}, keys = [];
  (cfg.data.sessions || []).forEach(function (s) {
    (s.days || []).forEach(function (d) {
      (d.cells || []).forEach(function (t) {
        var k = clean(t).toLowerCase();
        if (k && !seen[k]) { seen[k] = 1; keys.push({ k: k, h: hash(k) }); }
      });
    });
  });
  keys.sort(function (a, b) { return a.h - b.h || (a.k < b.k ? -1 : 1); });
  var n = acc.length, used = [], cnt = 0, map = {};
  keys.forEach(function (o) {
    if (cnt >= n) { used = []; cnt = 0; }
    var i = o.h % n; while (used[i]) i = (i + 1) % n;
    used[i] = 1; cnt++; map[o.k] = acc[i];
  });
  return map;
}

/* ---------- fonts ---------- */
function stackOf(f) { try { return TKB.fonts.stack(f); } catch (e) { return '"' + f + '", system-ui, sans-serif'; } }
function weightOf(f, w) { try { return TKB.fonts.nearestWeight(f, w); } catch (e) { return w; } }

/* ---------- drawing primitives ---------- */
function rrPath(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function box(ctx, x, y, w, h, r, fill, stroke, lw) {
  if (fill) { ctx.beginPath(); rrPath(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
  if (stroke && lw > 0) {
    ctx.beginPath(); rrPath(ctx, x + lw / 2, y + lw / 2, w - lw, h - lw, r - lw / 2);
    ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke();
  }
}
function addShape(ctx, p, dx, dy, inset) {
  ctx.save();
  ctx.translate(p.x + p.w / 2 + dx, p.y + p.h / 2 + dy);
  if (p.rot) ctx.rotate(p.rot);
  rrPath(ctx, -p.w / 2 + inset, -p.h / 2 + inset, p.w - 2 * inset, p.h - 2 * inset, Math.max(0, p.r - inset));
  ctx.restore();
}

/* ---------- text ---------- */
function putText(E, ctx, str, x, y, size, font, color, align, eff) {
  ctx.font = font; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color;
  var te = E.look.textEffect === 'bloom' ? 'bloom' : (eff ? E.look.textEffect : 'none'), S = E.s || 1, con = contrastInk(color);
  if (te === 'outline') {
    ctx.save(); ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    ctx.lineWidth = Math.max(2 * E.u, size * 0.16); ctx.strokeStyle = con; ctx.strokeText(str, x, y);
    ctx.restore(); ctx.fillText(str, x, y);
  } else if (te === 'shadow') {
    ctx.save(); ctx.shadowColor = rgba(con, 0.5); ctx.shadowBlur = 0;
    ctx.shadowOffsetX = ctx.shadowOffsetY = Math.max(size * 0.06, 1.2 * E.u) * S;
    ctx.fillText(str, x, y); ctx.restore();
  } else if (te === 'bloom') {
    // user-requested glow: soft blur in the text's own colour, layered for strength
    var k = num(E.look.bloom, 0.6, 0, 1), bl = size * (0.25 + 0.9 * k) * S;
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = bl;
    ctx.fillText(str, x, y); if (k > 0.35) ctx.fillText(str, x, y); if (k > 0.7) ctx.fillText(str, x, y);
    ctx.restore(); ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.fillText(str, x, y);
  } else if (te === 'halo') {
    ctx.save(); ctx.lineJoin = 'round'; ctx.globalAlpha = 0.55; ctx.lineWidth = Math.max(3 * E.u, size * 0.34); ctx.strokeStyle = con; ctx.strokeText(str, x, y);
    ctx.restore(); ctx.fillText(str, x, y);
  } else ctx.fillText(str, x, y);
}
// lines centred vertically on cy; baseline offset keeps caps visually centred
function drawLines(E, ctx, lines, x, cy, size, font, color, align, eff) {
  var lh = size * 1.3, y0 = cy - (lines.length - 1) * lh / 2 + size * 0.35;
  for (var i = 0; i < lines.length; i++) putText(E, ctx, lines[i], x, y0 + i * lh, size, font, color, align, eff);
}
var clipCount = 0; // text cut by ellipsize since the last reset (read by measure/paint)
function ellipsize(ctx, t, maxW) {
  var a = Array.from(t);
  clipCount++;
  while (a.length > 1 && ctx.measureText(a.join('') + '\u2026').width > maxW) a.pop();
  return a.join('') + '\u2026';
}
function wrap(ctx, str, maxW, maxLines) {
  var words = str.split(' '), lines = [], cur = '';
  function w(t) { return ctx.measureText(t).width; }
  words.forEach(function (word) {
    var t = cur ? cur + ' ' + word : word;
    if (w(t) <= maxW) { cur = t; return; }
    if (cur) { lines.push(cur); cur = ''; }
    if (w(word) <= maxW) { cur = word; return; }
    var chunk = '';
    Array.from(word).forEach(function (ch) {
      if (w(chunk + ch) <= maxW) chunk += ch; else { lines.push(chunk); chunk = ch; }
    });
    cur = chunk;
  });
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    var rest = lines.slice(maxLines - 1).join(' ');
    lines = lines.slice(0, maxLines - 1); lines.push(ellipsize(ctx, rest, maxW));
  }
  return lines.length ? lines : [''];
}
// one line, shrink to 60%, then wrap to two lines at the smaller size
function fitLines(ctx, str, fontFn, base, maxW) {
  maxW = Math.max(maxW, 4);
  ctx.font = fontFn(base);
  var w = ctx.measureText(str).width;
  if (w <= maxW) return { lines: [str], size: base };
  var s = Math.max(base * 0.6, base * maxW / w);
  ctx.font = fontFn(s);
  if (ctx.measureText(str).width <= maxW + 0.5) return { lines: [str], size: s };
  return { lines: wrap(ctx, str, maxW, 2), size: s };
}

/* ---------- environment shared by layouts ---------- */
function makeEnv(ctx, cfg, W, H, avg, layoutW, sc) {
  var look = cfg.look || {}, data = cfg.data || { sessions: [] }, c = colorsOf(cfg), u = Math.min(W, H) / 1080;
  var ts = num(look.textScale, 1, 0.7, 1.4), f = look.fonts || {};
  var famT = f.title || 'Be Vietnam Pro', famB = f.body || famT;
  var wT = weightOf(famT, f.titleWeight || 800), wB = weightOf(famB, f.bodyWeight || 600);
  var stT = stackOf(famT), stB = stackOf(famB), acc = c.accents, map = subjectMap(cfg, acc);
  var E = {
    ctx: ctx, cfg: cfg, look: look, data: data, c: c, W: W, H: H, u: u, ts: ts, s: sc || 1,
    r: num(look.radius, 14, 0, 32) * u, g: num(look.gap, 8, 0, 24) * u, bwid: num(look.borderWidth, 2, 0, 6) * u,
    layoutW: layoutW || W,
    fs: 30 * u * ts, dfs: 27 * u * ts, lfs: 22 * u * ts, tfs: 66 * u * ts, sfs: 28 * u * ts,
    pad: 22 * u, sg: 26 * u, tg: 22 * u,
    alpha: num(look.panelOpacity, 0.92, 0, 1), blur: num(look.panelBlur, 0, 0, 30) * u,
    shadow: look.shadow === 'soft' || look.shadow === 'none' ? look.shadow : 'hard'
  };
  E.bc = E.shadow === 'hard' ? c.ink : c.line;
  E.gm = Math.max(E.g, (E.shadow === 'hard' ? 10 : 4) * u); // gap between separate panels
  E.tint = mix(c.panel, c.line, 0.35);
  // a colour the user picked is used as-is on the background; auto contrast only applies to theme colours
  var uc = look.colors || {}, hasInk = HEX.test(uc.ink || '');
  E.inkBg = hasInk ? uc.ink : pick(avg, [c.ink]);
  E.softBg = hasInk ? (HEX.test(uc.inkSoft || '') ? uc.inkSoft : uc.ink) : pick(avg, [c.inkSoft, c.ink]);
  E.softOn = pick(c.panel, [c.inkSoft, c.ink]);
  E.fontT = function (sz) { return wT + ' ' + Math.round(sz * 100) / 100 + 'px ' + stT; };
  E.fontB = function (sz) { return wB + ' ' + Math.round(sz * 100) / 100 + 'px ' + stB; };
  E.txt = function (t) { t = clean(t); return look.upper ? t.toUpperCase() : t; };
  E.P = function (s) {
    var n = s.periods | 0;
    if (n < 1) n = (s.days && s.days[0] && s.days[0].cells ? s.days[0].cells.length : 1);
    return Math.max(1, n);
  };
  E.times = function (s) {
    if (!look.showTimes || !s.times) return null;
    var P = E.P(s); if (s.times.length < P) return null;
    var t = s.times.slice(0, P).map(clean);
    return t.some(function (x) { return x; }) ? t : null;
  };
  E.sc = function (si) { return si % 2 === 0 ? c.head : acc[1 % acc.length]; };
  E.fillFor = function (key, si) {
    var mode = look.subjectColors || 'auto', fill;
    key = clean(key).toLowerCase();
    if (mode === 'none') return { fill: c.panel, fg: pick(c.panel, [c.ink]), line: true };
    fill = mode === 'head' ? E.sc(si) : (map[key] || acc[hash(key) % acc.length]);
    return { fill: fill, fg: pick(fill, [c.ink, c.panel, c.bg]), line: false };
  };
  E.panel = function (x, y, w, h, extra) {
    var p = { x: x, y: y, w: w, h: h, r: E.r, fill: c.panel, alpha: E.alpha, bc: E.bc, bw: E.layoutWid, rot: 0 };
    if (extra) for (var k in extra) p[k] = extra[k];
    return p;
  };
  return E;
}
function add(jobs, part, x, y) { jobs.push(function (ctx) { part.draw(ctx, x, y); }); }
function runJobs(jobs) { return function (ctx) { for (var i = 0; i < jobs.length; i++) jobs[i](ctx); }; }

/* day label with head style (filled | pill | underline); plain forces underline */
function head(E, ctx, x, y, w, h, label, sc, surface, plain) {
  if (!clean(label)) return; // ghost column
  var u = E.u, st = plain ? 'underline' : (E.look.headStyle || 'filled'), filled = st !== 'underline', fg;
  var txt = E.txt(label);
  if (filled) {
    box(ctx, x, y, w, h, st === 'pill' ? h / 2 : Math.min(E.r * 0.7, h / 2), sc, E.bc, E.layoutWid * 0.75);
    fg = HEX.test((E.look.colors || {}).headInk || '') ? E.c.headInk : pick(sc, [E.c.headInk, E.c.ink, E.c.panel]);
  } else fg = plain ? E.inkBg : pick(surface, [E.c.ink]);
  var f = fitLines(ctx, txt, E.fontT, E.dfs, w - 12 * u);
  drawLines(E, ctx, f.lines, x + w / 2, y + h / 2 - (filled ? 0 : 2.5 * u), f.size, E.fontT(f.size), fg, 'center', plain);
  if (!filled) {
    ctx.font = E.fontT(f.size);
    var m = 0; f.lines.forEach(function (l) { m = Math.max(m, ctx.measureText(l).width); });
    var bwd = Math.min(w - 6 * u, m + 10 * u);
    box(ctx, x + w / 2 - bwd / 2, y + h - 5 * u, bwd, 4 * u, 2 * u, sc, null, 0);
  }
}

/* subject pill / cell. o: {plain, noEmpty, dot, num, numW, time, align} */
function pill(E, ctx, x, y, w, h, r, raw, si, o) {
  o = o || {}; var u = E.u, text = E.txt(raw), left = 0;
  if (!text) {
    if (o.dot) { ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, 3.5 * u, 0, 6.2832); ctx.fillStyle = mix(E.c.panel, E.c.inkSoft, 0.45); ctx.fill(); }
    else if (!o.plain && !o.noEmpty) box(ctx, x, y, w, h, r, E.tint, null, 0);
    if (o.num && !o.plain) drawLines(E, ctx, [o.num], x + 10 * u, y + h / 2, E.fs * 0.62, E.fontT(E.fs * 0.62), E.softOn, 'left', false);
    return;
  }
  var f = E.fillFor(raw, si), fg = f.fg;
  if (o.plain) fg = E.inkBg;
  else box(ctx, x, y, w, h, r, f.fill, E.bc, f.line ? Math.max(E.layoutWid * 0.75, 1.5 * u) : E.layoutWid * 0.75);
  if (o.num) {
    drawLines(E, ctx, [o.num], x + 10 * u, y + h / 2, E.fs * 0.62, E.fontT(E.fs * 0.62), fg, 'left', false);
    left = o.numW || 0;
  }
  var maxW = w - left - 16 * u, fl = fitLines(ctx, text, E.fontB, E.fs, maxW);
  var subjH = fl.lines.length * fl.size * 1.3, tH = o.time ? E.fs * 0.65 : 0;
  var top = y + (h - subjH - tH) / 2 - (o.plain ? 2 * u : 0);
  var left_ = o.align === 'left', cx = left_ ? x + left + 8 * u : x + left + (w - left) / 2;
  drawLines(E, ctx, fl.lines, cx, top + subjH / 2, fl.size, E.fontB(fl.size), fg, left_ ? 'left' : 'center', !!o.plain);
  if (o.time) {
    var tf = fitLines(ctx, o.time, E.fontB, E.fs * 0.5, maxW);
    drawLines(E, ctx, tf.lines.slice(0, 1), cx, top + subjH + tH / 2, tf.size, E.fontB(tf.size), fg, left_ ? 'left' : 'center', !!o.plain);
  }
  if (o.plain && !f.line) box(ctx, x + w / 2 - 14 * u, y + h - 6 * u, 28 * u, 4 * u, 2 * u, f.fill, null, 0);
}

function titleBlock(E, w, align, onPanel) {
  if (!E.look.showTitle) return null;
  var t = clean(E.data.title), s = clean(E.data.subtitle), ctx = E.ctx, parts = [], h = 0;
  var tc = onPanel ? E.c.ink : E.inkBg, scol = onPanel ? E.softOn : E.softBg;
  if (t) { var f = fitLines(ctx, t, E.fontT, E.tfs, w); parts.push({ f: f, fn: E.fontT, col: tc, gap: 0 }); h += f.lines.length * f.size * 1.3; }
  if (s) {
    var f2 = fitLines(ctx, s, E.fontB, E.sfs, w), gp = t ? 4 * E.u : 0;
    parts.push({ f: f2, fn: E.fontB, col: scol, gap: gp }); h += f2.lines.length * f2.size * 1.3 + gp;
  }
  if (!parts.length) return null;
  return {
    h: h,
    draw: function (ctx, ox, oy) {
      var y = oy, x = align === 'center' ? ox + w / 2 : ox;
      parts.forEach(function (p) {
        y += p.gap; var lh = p.f.size * 1.3, n = p.f.lines.length;
        drawLines(E, ctx, p.f.lines, x, y + n * lh / 2, p.f.size, p.fn(p.f.size), p.col, align === 'center' ? 'center' : 'left', !onPanel);
        y += n * lh;
      });
    }
  };
}
function sessLabel(E, text, si, w, onPanel) {
  var u = E.u, h = E.lfs * 1.3 + 6 * u;
  return {
    h: h,
    draw: function (ctx, ox, oy) {
      box(ctx, ox, oy + h / 2 - 5 * u, 10 * u, 10 * u, 3 * u, E.sc(si), null, 0);
      var f = fitLines(ctx, E.txt(text), E.fontT, E.lfs, w - 18 * u);
      drawLines(E, ctx, f.lines.slice(0, 1), ox + 18 * u, oy + h / 2, f.size, E.fontT(f.size), onPanel ? E.c.ink : E.inkBg, 'left', !onPanel);
    }
  };
}

/* one session table (grid and plain share it) */
function tableSession(E, s, si, iw, plain) {
  var u = E.u, g = E.g, fs = E.fs, ctx = E.ctx, P = E.P(s), days = daysOf(E, si, true), nd = Math.max(1, days.length);
  var ti = E.times(s), hasNum = !!E.look.showPeriodNumbers, hasT = !!ti, sc = E.sc(si);
  var nfs = fs * 0.9, tfs = fs * 0.5, pcw = 0;
  if (hasNum || hasT) {
    var m = 0;
    if (hasNum) { ctx.font = E.fontT(nfs); m = ctx.measureText(String(P)).width; }
    if (hasT) { ctx.font = E.fontB(tfs); ti.forEach(function (t) { m = Math.max(m, ctx.measureText(t).width); }); }
    pcw = Math.min(iw * 0.2, Math.max(50 * u, m + 18 * u));
  }
  var x0 = pcw ? pcw + g : 0, colW = (iw - x0 - (nd - 1) * g) / nd;
  var hh = E.dfs * 1.3 + 16 * u;
  var stackH = (hasNum ? nfs * 1.3 : 0) + (hasT ? tfs * 1.3 : 0) + (hasNum && hasT ? 2 * u : 0);
  var ch = Math.max(fs * 1.3 + 20 * u, stackH + 14 * u) + (plain ? 4 * u : 0);
  var cellR = Math.min(E.r * 0.7, ch / 2);
  return {
    h: hh + P * (ch + g),
    draw: function (ctx, ox, oy) {
      var ink = plain ? E.inkBg : E.c.ink, soft = plain ? E.softBg : E.softOn, d, p;
      if (pcw) {
        var lf = fitLines(ctx, E.txt(hasNum ? 'Tiết' : 'Giờ'), E.fontB, E.dfs * 0.62, pcw);
        drawLines(E, ctx, lf.lines.slice(0, 1), ox + pcw / 2, oy + hh / 2 - (plain ? 2.5 * u : 0), lf.size, E.fontB(lf.size), soft, 'center', plain);
      }
      for (d = 0; d < days.length; d++) head(E, ctx, ox + x0 + d * (colW + g), oy, colW, hh, days[d].label, sc, E.c.panel, plain);
      for (p = 0; p < P; p++) {
        var y = oy + hh + g + p * (ch + g), cy = y + ch / 2;
        if (pcw) {
          var top = cy - stackH / 2, px = ox + pcw / 2;
          if (hasNum) { drawLines(E, ctx, [String(p + 1)], px, top + nfs * 0.65, nfs, E.fontT(nfs), ink, 'center', plain); top += nfs * 1.3 + (hasT ? 2 * u : 0); }
          if (hasT) {
            var tf = fitLines(ctx, ti[p], E.fontB, tfs, pcw - 4 * u);
            drawLines(E, ctx, tf.lines.slice(0, 1), px, top + tfs * 0.65, tf.size, E.fontB(tf.size), soft, 'center', plain);
          }
        }
        for (d = 0; d < days.length; d++) {
          if (!days[d].ghost) pill(E, ctx, ox + x0 + d * (colW + g), y, colW, ch, cellR, (days[d].cells || [])[p], si, { plain: plain });
        }
      }
    }
  };
}

/* ---------- layouts ---------- */
var LAY = {};

LAY.grid = function (E) {
  var jobs = [], pad = E.pad, iw = E.layoutW - 2 * pad, y = pad, ss = E.data.sessions || [], multi = ss.length > 1;
  var tb = titleBlock(E, iw, 'left', true);
  if (tb) { add(jobs, tb, pad, y); y += tb.h + E.tg; }
  ss.forEach(function (s, si) {
    if (si > 0) y += E.sg;
    if (multi) { var sl = sessLabel(E, s.label, si, iw, true); add(jobs, sl, pad, y); y += sl.h + 4 * E.u; }
    var ts = tableSession(E, s, si, iw, false); add(jobs, ts, pad, y); y += ts.h;
  });
  y += pad;
  return { w: E.layoutW, h: Math.max(y, 1), panels: [E.panel(0, 0, E.layoutW, y)], draw: runJobs(jobs) };
};
LAY.plain = function (E) {
  var jobs = [], w = E.layoutW, y = 0, ss = E.data.sessions || [], multi = ss.length > 1;
  var tb = titleBlock(E, w, 'center', false);
  if (tb) { add(jobs, tb, 0, y); y += tb.h + E.tg; }
  ss.forEach(function (s, si) {
    if (si > 0) y += E.sg;
    if (multi) { var sl = sessLabel(E, s.label, si, w, false); add(jobs, sl, 0, y); y += sl.h + 4 * E.u; }
    var ts = tableSession(E, s, si, w, true); add(jobs, ts, 0, y); y += ts.h;
  });
  return { w: w, h: Math.max(y, 1), panels: [], draw: runJobs(jobs) };
};

/* day columns for card-like layouts. look.dayFit: 'stretch' (days of a session share the width) |
   'align' (one slot per weekday across sessions, so a day stays in the same column). Days with no subject are hidden. */
function dayCols(E, si, w, gap) {
  var ss = E.data.sessions || [];
  function used(s) { var P = E.P(s); return (s.days || []).filter(function (d) { return (d.cells || []).slice(0, P).some(function (x) { return clean(x); }); }); }
  var mine = used(ss[si] || {}), all = ss[si] && ss[si].days || [];
  if (!mine.length) mine = all.slice();
  var slots = mine.map(function (d) { return clean(d.label).toLowerCase(); });
  if (E.look.dayFit === 'align' && ss.length > 1) {
    var seen = {}; slots = [];
    ss.forEach(function (s) { used(s).forEach(function (d) { var k = clean(d.label).toLowerCase(); if (!seen[k]) { seen[k] = 1; slots.push(k); } }); });
    mine.forEach(function (d) { var k = clean(d.label).toLowerCase(); if (slots.indexOf(k) < 0) slots.push(k); });
  }
  var n = Math.max(1, slots.length), cw = Math.min((w - (n - 1) * gap) / n, w * 0.5), x0 = (w - (n * cw + (n - 1) * gap)) / 2;
  return mine.map(function (d) {
    return { day: d, d: all.indexOf(d), x: x0 + slots.indexOf(clean(d.label).toLowerCase()) * (cw + gap), cw: cw };
  });
}
/* day list for table-like layouts: empty days hidden; with dayFit 'align' (and align allowed) the missing
   weekdays become blank ghost columns so every weekday keeps the same column in both sessions */
function daysOf(E, si, alignOK) {
  var cols = dayCols(E, si, 1000, 0), out = cols.map(function (c) { return c.day; });
  if (!alignOK || E.look.dayFit !== 'align' || (E.data.sessions || []).length < 2 || !cols.length) return out;
  var cw = cols[0].cw, n = Math.round(1000 / cw), res = [];
  for (var i = 0; i < n; i++) res.push({ label: '', cells: [], ghost: true });
  cols.forEach(function (c) { res[Math.round(c.x / cw)] = c.day; });
  return res;
}
LAY.cards = function (E) {
  var u = E.u, w = E.layoutW, jobs = [], panels = [], y = 0, ss = E.data.sessions || [], multi = ss.length > 1;
  var tb = titleBlock(E, w, 'center', false);
  if (tb) { add(jobs, tb, 0, y); y += tb.h + E.tg; }
  ss.forEach(function (s, si) {
    if (si > 0) y += E.sg;
    if (multi) { var sl = sessLabel(E, s.label, si, w, false); add(jobs, sl, 0, y); y += sl.h + 4 * u; }
    var P = E.P(s), ti = E.times(s), gc = E.gm, cols = dayCols(E, si, w, gc), cw = cols[0].cw;
    var ip = 10 * u, hh = E.dfs * 1.3 + 14 * u, ph = E.fs * 1.3 + 16 * u + (ti ? E.fs * 0.65 + 2 * u : 0), pg = Math.max(E.g, 3 * u);
    var chh = ip + hh + pg + P * ph + (P - 1) * pg + ip, showNum = E.look.showPeriodNumbers && (cw - 2 * ip) >= 96 * u, numW = 0;
    if (showNum) { E.ctx.font = E.fontT(E.fs * 0.62); numW = E.ctx.measureText(String(P)).width + 16 * u; }
    cols.forEach(function (col) {
      var day = col.day, cx = col.x, cy = y;
      panels.push(E.panel(cx, cy, cw, chh));
      jobs.push(function (ctx) {
        head(E, ctx, cx + ip, cy + ip, cw - 2 * ip, hh, day.label, E.sc(si), E.c.panel, false);
        for (var p = 0; p < P; p++) {
          pill(E, ctx, cx + ip, cy + ip + hh + pg + p * (ph + pg), cw - 2 * ip, ph, Math.min(E.r * 0.6, ph / 2),
            (day.cells || [])[p], si, { num: showNum ? String(p + 1) : '', numW: numW, time: ti ? ti[p] : '' });
        }
      });
    });
    y += chh;
  });
  return { w: w, h: Math.max(y, 1), panels: panels, draw: runJobs(jobs) };
};
LAY.rows = function (E) {
  var u = E.u, w = E.layoutW, jobs = [], panels = [], y = 0, ss = E.data.sessions || [], multi = ss.length > 1, ctx0 = E.ctx;
  var tb = titleBlock(E, w, 'left', false);
  if (tb) { add(jobs, tb, 0, y); y += tb.h + E.tg; }
  ss.forEach(function (s, si) {
    if (si > 0) y += E.sg;
    if (multi) { var sl = sessLabel(E, s.label, si, w, false); add(jobs, sl, 0, y); y += sl.h + 4 * u; }
    var P = E.P(s), ti = E.times(s), days = daysOf(E, si, false), hasNum = !!E.look.showPeriodNumbers;
    var ip = 8 * u, chH = E.fs * 1.3 + 14 * u, sh = chH + 2 * ip, g2 = Math.max(E.g, 5 * u), m = 0;
    ctx0.font = E.fontT(E.dfs);
    days.forEach(function (d) { m = Math.max(m, ctx0.measureText(E.txt(d.label)).width); });
    var lw = Math.min(w * 0.26, Math.max(88 * u, m + 26 * u)), cx0 = ip + lw + g2, cwp = (w - cx0 - ip - (P - 1) * g2) / P;
    if (hasNum || ti) {
      var nfs = E.fs * 0.8, tfs = E.fs * 0.5, hh = (hasNum ? nfs * 1.3 : 0) + (ti ? tfs * 1.3 : 0) + 6 * u, hy = y;
      jobs.push(function (ctx) {
        for (var p = 0; p < P; p++) {
          var px = cx0 + p * (cwp + g2) + cwp / 2, top = hy;
          if (hasNum) { drawLines(E, ctx, [String(p + 1)], px, top + nfs * 0.65, nfs, E.fontT(nfs), E.inkBg, 'center', true); top += nfs * 1.3; }
          if (ti) {
            var tf = fitLines(ctx, ti[p], E.fontB, tfs, cwp);
            drawLines(E, ctx, tf.lines.slice(0, 1), px, top + tfs * 0.65, tf.size, E.fontB(tf.size), E.softBg, 'center', true);
          }
        }
      });
      y += hh;
    }
    days.forEach(function (day, d) {
      var ry = y;
      panels.push(E.panel(0, ry, w, sh));
      jobs.push(function (ctx) {
        head(E, ctx, ip, ry + ip, lw, chH, day.label, E.sc(si), E.c.panel, false);
        for (var p = 0; p < P; p++) {
          pill(E, ctx, cx0 + p * (cwp + g2), ry + ip, cwp, chH, Math.min(E.r * 0.6, chH / 2), (day.cells || [])[p], si, { noEmpty: true, dot: true });
        }
      });
      y += sh + (d < days.length - 1 ? E.gm : 0);
    });
  });
  return { w: w, h: Math.max(y, 1), panels: panels, draw: runJobs(jobs) };
};

LAY.notes = function (E) {
  var u = E.u, w = E.layoutW, jobs = [], panels = [], y = 12 * u, ss = E.data.sessions || [], multi = ss.length > 1, ctx0 = E.ctx;
  var tb = titleBlock(E, w, 'center', false);
  if (tb) { add(jobs, tb, 0, y); y += tb.h + E.tg; }
  var title = clean(E.data.title);
  ss.forEach(function (s, si) {
    if (si > 0) y += E.sg;
    if (multi) { var sl = sessLabel(E, s.label, si, w, false); add(jobs, sl, 0, y); y += sl.h + 4 * u; }
    var P = E.P(s), ti = E.times(s), gn = Math.max(E.gm, 12 * u), cols = dayCols(E, si, w, gn), cw = cols[0].cw;
    var np = 12 * u, nh = E.dfs * 1.3 + 14 * u, rh = E.fs * 1.3 + 12 * u + (ti ? E.fs * 0.65 : 0);
    var top0 = np + 8 * u + nh + 4 * u, nhh = top0 + P * rh + np, showNum = !!E.look.showPeriodNumbers, numW = 0;
    if (showNum) { ctx0.font = E.fontT(E.fs * 0.7); numW = ctx0.measureText(String(P)).width + 10 * u; }
    var mode = E.look.subjectColors || 'auto';
    cols.forEach(function (col) {
      var day = col.day, d = col.d, nx = col.x, ny = y, r = rng(hash(title + '|' + si + '|' + d + '|' + clean(day.label)));
      var rot = (r() * 2 - 1) * 1.5 * Math.PI / 180, tilt = (r() * 2 - 1) * 3 * Math.PI / 180, toff = (r() * 2 - 1) * cw * 0.12;
      panels.push(E.panel(nx, ny, cw, nhh, { rot: rot, r: E.r * 0.5 }));
      jobs.push(function (ctx) {
        ctx.save(); ctx.translate(nx + cw / 2, ny + nhh / 2); ctx.rotate(rot); ctx.translate(-cw / 2, -nhh / 2);
        head(E, ctx, np, np + 8 * u, cw - 2 * np, nh, day.label, E.sc(si), E.c.panel, false);
        for (var p = 0; p < P; p++) {
          var ry = top0 + p * rh, txt = E.txt((day.cells || [])[p]), tx = np + 12 * u;
          if (showNum) { drawLines(E, ctx, [String(p + 1)], tx, ry + rh / 2, E.fs * 0.7, E.fontT(E.fs * 0.7), E.softOn, 'left', false); tx += numW; }
          if (txt) {
            var f = E.fillFor((day.cells || [])[p], si);
            if (mode !== 'none') box(ctx, np, ry + rh * 0.2, 5 * u, rh * 0.6, 2.5 * u, f.fill, null, 0);
            var fl = fitLines(ctx, txt, E.fontB, E.fs, cw - np - tx), sH = fl.lines.length * fl.size * 1.3, tH = ti ? E.fs * 0.65 : 0;
            var t0 = ry + (rh - sH - tH) / 2;
            drawLines(E, ctx, fl.lines, tx, t0 + sH / 2, fl.size, E.fontB(fl.size), E.c.ink, 'left', false);
            if (ti && ti[p]) {
              var tf = fitLines(ctx, ti[p], E.fontB, E.fs * 0.5, cw - np - tx);
              drawLines(E, ctx, tf.lines.slice(0, 1), tx, t0 + sH + tH / 2, tf.size, E.fontB(tf.size), E.softOn, 'left', false);
            }
          }
          if (p < P - 1) box(ctx, np, ry + rh - 0.75 * u, cw - 2 * np, 1.5 * u, 0, E.c.line, null, 0);
        }
        ctx.translate(cw / 2 + toff, 0); ctx.rotate(tilt);
        box(ctx, -32 * u, -10 * u, 64 * u, 20 * u, 2 * u, E.sc(si), null, 0);
        ctx.restore();
      });
    });
    y += nhh;
  });
  return { w: w, h: Math.max(y + 8 * u, 1), panels: panels, draw: runJobs(jobs) };
};

/* ---------- shared helpers for the newer layouts ---------- */
function spacing(ctx, px) { if ('letterSpacing' in ctx) ctx.letterSpacing = (px || 0) + 'px'; }
// days merged across sessions by label; trailing empty periods dropped
function mergedDays(E) {
  var out = [], idx = {};
  (E.data.sessions || []).forEach(function (s, si) {
    var P = E.P(s), ti = E.times(s);
    (s.days || []).forEach(function (d, di) {
      var k = clean(d.label).toLowerCase() || ('#' + di);
      if (!(k in idx)) { idx[k] = out.length; out.push({ label: d.label, parts: [] }); }
      var cells = (d.cells || []).slice(0, P), last = -1;
      for (var i = 0; i < cells.length; i++) if (clean(cells[i])) last = i;
      if (last >= 0) out[idx[k]].parts.push({ si: si, label: s.label, cells: cells.slice(0, last + 1), times: ti });
    });
  });
  return out;
}
function colsFor(E, n) { var lu = E.layoutW / E.u; return Math.min(n, lu >= 1500 ? 3 : (lu >= 900 ? 2 : 1)); }
function dayNum(label) {
  var t = clean(label), m = t.match(/\d+/);
  if (m) return { big: (m[0].length < 2 ? '0' : '') + m[0], small: t.replace(m[0], '').trim() };
  var ini = t.split(' ').map(function (x) { return Array.from(x)[0] || ''; }).join('').toUpperCase();
  return { big: ini.length > 1 && ini.length <= 3 ? ini : t, small: ini.length > 1 && ini.length <= 3 && ini !== t ? t : '' };
}

/* day cards in 2-3 columns: kind 'planner' (white pages, colour bars) or 'bento' (colour-blocked tiles) */
function dayGrid(E, kind) {
  var u = E.u, w = E.layoutW, ctx = E.ctx, c = E.c, jobs = [], panels = [], y = 0, bento = kind === 'bento';
  var mode = E.look.subjectColors || 'auto', showNum = !!E.look.showPeriodNumbers, multi = (E.data.sessions || []).length > 1;
  var gc = Math.max(E.gm, (bento ? 14 : 18) * u), rad = bento ? E.r * 1.3 + 6 * u : E.r;
  if (bento) {
    var t = clean(E.data.title), st = clean(E.data.subtitle);
    if (E.look.showTitle && (t || st)) {
      var tp = 30 * u, tiw = w - 2 * tp, hf = t ? fitLines(ctx, E.txt(t), E.fontT, E.tfs * 1.05, tiw) : null;
      var sf = st ? fitLines(ctx, st, E.fontB, E.sfs, tiw - 90 * u) : null;
      var th = tp + (hf ? hf.lines.length * hf.size * 1.3 : 0) + (sf ? sf.lines.length * sf.size * 1.3 + (hf ? 6 * u : 0) : 0) + tp;
      var tfill = c.head, tfg = pick(tfill, [c.headInk, c.panel, c.ink]), ty = y;
      panels.push(E.panel(0, ty, w, th, { fill: tfill, r: rad }));
      jobs.push(function (cx) {
        var yy = ty + tp;
        if (hf) { var lh = hf.size * 1.3; drawLines(E, cx, hf.lines, tp, yy + hf.lines.length * lh / 2, hf.size, E.fontT(hf.size), tfg, 'left', false); yy += hf.lines.length * lh + 6 * u; }
        if (sf) { var l2 = sf.size * 1.3; drawLines(E, cx, sf.lines, tp, yy + sf.lines.length * l2 / 2, sf.size, E.fontB(sf.size), mix(tfg, tfill, 0.25), 'left', false); }
        for (var k = 0; k < 4; k++) { // small swatch legend, bottom right
          var dx = w - tp - (4 - k) * 20 * u + 4 * u;
          cx.beginPath(); cx.arc(dx + 6 * u, ty + th - tp - 2 * u, 6.5 * u, 0, 6.2832);
          cx.fillStyle = mode === 'none' ? mix(tfg, tfill, 0.5 + k * 0.1) : c.accents[k % c.accents.length]; cx.fill();
        }
      });
      y += th + gc;
    }
  } else {
    var tb = titleBlock(E, w, 'left', false);
    if (tb) { add(jobs, tb, 0, y); y += tb.h + E.tg; }
  }
  var days = mergedDays(E), n = Math.max(1, days.length), cols = colsFor(E, n);
  if (!days.length) days = [{ label: '', parts: [] }];
  var ip = (bento ? 22 : 20) * u, lfs = E.dfs * (bento ? 1.35 : 1.15), hh = lfs * 1.3 + (bento ? 6 : 10) * u, rh = E.fs * 1.3 + 14 * u;
  var sfs = E.fs * 0.52, sepH = sfs * 1.3 + 16 * u;
  ctx.font = E.fontT(E.fs * 0.62); var numW = showNum ? ctx.measureText('10').width + 12 * u : 0;
  function cardH(d) {
    var hgt = ip + hh + 8 * u;
    if (!d.parts.length) return hgt + rh + ip;
    d.parts.forEach(function (p, pi) { if (multi && (pi > 0 || p.si > 0)) hgt += sepH; hgt += p.cells.length * rh; });
    return hgt + ip;
  }
  function card(d, di, x, y0, cw, ch) {
    var fill = bento ? (mode === 'none' ? c.panel : c.accents[di % c.accents.length]) : c.panel;
    var fg = bento ? pick(fill, [c.ink, '#101010', '#FFFFFF']) : c.ink, soft = bento ? mix(fg, fill, 0.38) : E.softOn;
    var rule = bento ? mix(fg, fill, 0.78) : c.line;
    panels.push(E.panel(x, y0, cw, ch, { fill: fill, r: rad }));
    jobs.push(function (cx) {
      var iw = cw - 2 * ip, total = 0;
      d.parts.forEach(function (p) { p.cells.forEach(function (t) { if (clean(t)) total++; }); });
      var cnt = total ? total + ' tiết' : '';
      cx.font = E.fontB(sfs); var cntW = cnt ? cx.measureText(cnt).width + 10 * u : 0;
      var hf = fitLines(cx, E.txt(d.label), E.fontT, lfs, iw - cntW);
      drawLines(E, cx, hf.lines.slice(0, 1), x + ip, y0 + ip + hh / 2 - 3 * u, hf.size, E.fontT(hf.size), fg, 'left', false);
      if (cnt) drawLines(E, cx, [cnt], x + cw - ip, y0 + ip + hh / 2 - 3 * u, sfs, E.fontB(sfs), soft, 'right', false);
      if (!bento) box(cx, x + ip, y0 + ip + hh - 2 * u, 30 * u, 4.5 * u, 2.25 * u, c.head, null, 0);
      var ry = y0 + ip + hh + 8 * u;
      if (!d.parts.length) {
        drawLines(E, cx, [E.txt('Nghỉ')], x + ip, ry + rh / 2, E.fs * 0.8, E.fontB(E.fs * 0.8), soft, 'left', false);
        return;
      }
      d.parts.forEach(function (p, pi) {
        if (multi && (pi > 0 || p.si > 0)) {
          spacing(cx, 1.5 * u);
          cx.font = E.fontT(sfs); var lab = E.txt(p.label).toUpperCase(), lw = cx.measureText(lab).width;
          drawLines(E, cx, [lab], x + ip, ry + sepH / 2, sfs, E.fontT(sfs), soft, 'left', false);
          spacing(cx, 0);
          box(cx, x + ip + lw + 12 * u, ry + sepH / 2 - 0.75 * u, Math.max(0, iw - lw - 12 * u), 1.5 * u, 0, rule, null, 0);
          ry += sepH;
        }
        p.cells.forEach(function (raw, k) {
          var cyy = ry + rh / 2, tx = x + ip, txt = E.txt(raw), tm = p.times && p.times[k] ? p.times[k] : '', tW = 0;
          if (showNum) { drawLines(E, cx, [String(k + 1)], tx, cyy, E.fs * 0.62, E.fontT(E.fs * 0.62), soft, 'left', false); tx += numW; }
          if (tm) {
            cx.font = E.fontB(sfs); tW = cx.measureText(tm).width + 12 * u;
            drawLines(E, cx, [tm], x + cw - ip, cyy, sfs, E.fontB(sfs), soft, 'right', false);
          }
          if (txt) {
            if (!bento && mode !== 'none') { box(cx, tx, ry + 8 * u, 6 * u, rh - 16 * u, 3 * u, E.fillFor(raw, p.si).fill, null, 0); tx += 16 * u; }
            var fl = fitLines(cx, txt, E.fontB, E.fs, x + cw - ip - tW - tx);
            drawLines(E, cx, fl.lines, tx, cyy, fl.size, E.fontB(fl.size), fg, 'left', false);
          } else drawLines(E, cx, ['–'], tx, cyy, E.fs, E.fontB(E.fs), soft, 'left', false);
          if (k < p.cells.length - 1) box(cx, x + ip, ry + rh - 0.75 * u, iw, 1.5 * u, 0, rule, null, 0);
          ry += rh;
        });
      });
    });
  }
  for (var r = 0; r * cols < days.length; r++) {
    var items = days.slice(r * cols, r * cols + cols), hmax = 0;
    items.forEach(function (d) { hmax = Math.max(hmax, cardH(d)); });
    var cw = (w - (items.length - 1) * gc) / items.length; // a short last row spans the full width
    items.forEach(function (d, i) { card(d, r * cols + i, i * (cw + gc), y, cw, hmax); });
    y += hmax + gc;
  }
  y -= gc;
  return { w: w, h: Math.max(y, 1), panels: panels, draw: runJobs(jobs) };
}
LAY.planner = function (E) { return dayGrid(E, 'planner'); };
LAY.bento = function (E) { return dayGrid(E, 'bento'); };

/* ruled table on one sheet: editorial (hairlines, serif feel) or swiss (bold numbers, thick rules) */
function ruled(E, swiss) {
  var u = E.u, w = E.layoutW, ctx = E.ctx, c = E.c, jobs = [], pad = (swiss ? 34 : 42) * u, iw = w - 2 * pad, y = pad;
  var ss = E.data.sessions || [], multi = ss.length > 1, mode = E.look.subjectColors || 'auto';
  var tb = titleBlock(E, iw, 'left', true);
  if (tb) { add(jobs, tb, pad, y); y += tb.h + 16 * u; }
  var y1 = y;
  if (swiss) { jobs.push(function (cx) { box(cx, pad, y1, iw, 12 * u, 0, c.head, null, 0); }); y += 12 * u + 24 * u; }
  else { jobs.push(function (cx) { box(cx, pad, y1, iw, 3.5 * u, 0, c.ink, null, 0); box(cx, pad, y1 + 7 * u, iw, 1.2 * u, 0, c.ink, null, 0); }); y += 8.2 * u + 22 * u; }
  ss.forEach(function (s, si) {
    if (si > 0) y += E.sg + 6 * u;
    var P = E.P(s), days = daysOf(E, si, true), nd = Math.max(1, days.length), ti = E.times(s), hasNum = !!E.look.showPeriodNumbers;
    if (multi) {
      var lfs = E.lfs * 0.82, ly = y;
      jobs.push(function (cx) {
        spacing(cx, 2.4 * u);
        drawLines(E, cx, [E.txt(s.label).toUpperCase()], pad, ly + lfs * 0.65, lfs, E.fontT(lfs), swiss ? c.head : E.softOn, 'left', false);
        spacing(cx, 0);
      });
      y += lfs * 1.3 + 12 * u;
    }
    var nfs = swiss ? E.fs * 1.05 : E.fs * 0.8, tfs = E.fs * 0.48, m = 0;
    ctx.font = E.fontT(nfs); m = ctx.measureText(swiss ? String(P) : '00').width;
    if (ti) { ctx.font = E.fontB(tfs); ti.forEach(function (t) { m = Math.max(m, ctx.measureText(t).width); }); }
    var pcw = (hasNum || ti) ? Math.min(iw * 0.18, m + 22 * u) : 0, colW = (iw - pcw) / nd;
    var bfs = E.dfs * 1.5, sfs2 = E.dfs * 0.5, efs = E.dfs * 0.72;
    var hh = swiss ? bfs * 1.15 + sfs2 * 1.3 + 14 * u : efs * 1.3 + 16 * u;
    var stackH = (hasNum ? nfs * 1.25 : 0) + (ti ? tfs * 1.3 : 0);
    var rh = Math.max(E.fs * 1.3 + (swiss ? 24 : 22) * u, stackH + 14 * u), hy = y;
    jobs.push(function (cx) {
      days.forEach(function (d, di) {
        if (d.ghost) return;
        var x = pad + pcw + di * colW + 6 * u, cwid = colW - 10 * u;
        if (swiss) {
          var dn = dayNum(E.txt(d.label)), bf = fitLines(cx, dn.big, E.fontT, bfs, cwid);
          drawLines(E, cx, bf.lines.slice(0, 1), x, hy + bfs * 0.55, bf.size, E.fontT(bf.size), c.ink, 'left', false);
          if (dn.small) {
            var sm = fitLines(cx, dn.small.toUpperCase(), E.fontB, sfs2, cwid);
            drawLines(E, cx, sm.lines.slice(0, 1), x, hy + bfs * 1.15 + sfs2 * 0.65, sm.size, E.fontB(sm.size), E.softOn, 'left', false);
          }
        } else {
          spacing(cx, 1.6 * u);
          var ef = fitLines(cx, E.txt(d.label).toUpperCase(), E.fontT, efs, cwid);
          drawLines(E, cx, ef.lines.slice(0, 1), x, hy + hh / 2 - 2 * u, ef.size, E.fontT(ef.size), c.ink, 'left', false);
          spacing(cx, 0);
        }
      });
      box(cx, pad, hy + hh - (swiss ? 3 : 1.5) * u, iw, (swiss ? 3 : 1.5) * u, 0, c.ink, null, 0);
      for (var p = 0; p < P; p++) {
        var ry = hy + hh + p * rh, cyy = ry + rh / 2;
        if (pcw) {
          var top = cyy - stackH / 2;
          if (hasNum) {
            var nt = swiss ? String(p + 1) : (p < 9 ? '0' : '') + (p + 1);
            drawLines(E, cx, [nt], pad, top + nfs * 0.62, nfs, E.fontT(nfs), swiss ? c.head : E.softOn, 'left', false);
            top += nfs * 1.25;
          }
          if (ti) {
            var tf = fitLines(cx, ti[p], E.fontB, tfs, pcw - 6 * u);
            drawLines(E, cx, tf.lines.slice(0, 1), pad, top + tfs * 0.65, tf.size, E.fontB(tf.size), E.softOn, 'left', false);
          }
        }
        days.forEach(function (d, di) {
          var raw = (d.cells || [])[p], txt = E.txt(raw);
          if (!txt) return;
          var x = pad + pcw + di * colW + 6 * u, dw = 0;
          if (mode !== 'none') {
            var col = E.fillFor(raw, si).fill;
            if (swiss) box(cx, x, cyy - 5 * u, 10 * u, 10 * u, 0, col, null, 0);
            else { cx.beginPath(); cx.arc(x + 4.5 * u, cyy, 4.5 * u, 0, 6.2832); cx.fillStyle = col; cx.fill(); }
            dw = 17 * u;
          }
          var fl = fitLines(cx, txt, E.fontB, E.fs * 0.92, colW - 12 * u - dw);
          drawLines(E, cx, fl.lines, x + dw, cyy, fl.size, E.fontB(fl.size), c.ink, 'left', false);
        });
        var last = p === P - 1;
        box(cx, pad, ry + rh - (last ? (swiss ? 3 : 1.5) : 1) * u, iw, (last ? (swiss ? 3 : 1.5) : (swiss ? 1.5 : 1)) * u, 0, last || swiss ? c.ink : c.line, null, 0);
      }
    });
    y += hh + P * rh;
  });
  y += pad;
  return { w: w, h: Math.max(y, 1), panels: [E.panel(0, 0, w, y)], draw: runJobs(jobs) };
}
LAY.editorial = function (E) { return ruled(E, false); };
LAY.swiss = function (E) { return ruled(E, true); };

/* centred text only: day label, then subjects joined by dots */
LAY.mono = function (E) {
  var u = E.u, w = E.layoutW, ctx = E.ctx, jobs = [], y = 0;
  E.tfs *= 1.3; E.sfs *= 1.1; // text is the whole design here, so it gets more room
  var tb = titleBlock(E, w, 'center', false);
  if (tb) { add(jobs, tb, 0, y); y += tb.h + E.tg * 1.8; }
  var days = mergedDays(E), lfs = E.dfs * 0.9, fs = E.fs * 1.2;
  days.forEach(function (d, di) {
    if (di > 0) y += 26 * u;
    var ly = y;
    jobs.push(function (cx) {
      spacing(cx, 3.2 * u);
      drawLines(E, cx, [E.txt(d.label).toUpperCase()], w / 2, ly + lfs * 0.65, lfs, E.fontB(lfs), E.softBg, 'center', true);
      spacing(cx, 0);
    });
    y += lfs * 1.3 + 6 * u;
    if (!d.parts.length) d.parts = [{ si: 0, cells: ['Nghỉ'] }];
    d.parts.forEach(function (p, pi) {
      var txt = p.cells.map(function (t) { return E.txt(t); }).filter(Boolean).join('  ·  ');
      ctx.font = E.fontB(fs);
      var lines = wrap(ctx, txt, w, 3), py = y, col = pi > 0 ? E.softBg : E.inkBg;
      jobs.push(function (cx) { drawLines(E, cx, lines, w / 2, py + lines.length * fs * 1.3 / 2, fs, E.fontB(fs), col, 'center', true); });
      y += lines.length * fs * 1.3 + 2 * u;
    });
  });
  return { w: w, h: Math.max(y, 1), panels: [], draw: runJobs(jobs) };
};

function buildLayout(E) { return (LAY[E.look.layout] || LAY.grid)(E); }

/* ---------- background ---------- */
function pixelFilter(tx, W, H, br, gray) {
  var im = tx.getImageData(0, 0, W, H), d = im.data;
  for (var i = 0; i < d.length; i += 4) {
    var r = d[i], g = d[i + 1], b = d[i + 2];
    if (gray) r = g = b = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    d[i] = Math.min(255, r * br); d[i + 1] = Math.min(255, g * br); d[i + 2] = Math.min(255, b * br);
  }
  tx.putImageData(im, 0, 0);
}
// fallback blur (no ctx.filter): repeated halving then doubling with smoothing
function softBlur(src, px) {
  var steps = Math.max(1, Math.min(6, Math.round(Math.log(Math.max(1.5, px * 1.2)) / Math.LN2)));
  var cur = src, sizes = [[src.width, src.height]], i, n, x;
  for (i = 0; i < steps; i++) {
    n = mk(Math.ceil(cur.width / 2), Math.ceil(cur.height / 2)); x = n.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(cur, 0, 0, n.width, n.height); cur = n; sizes.push([n.width, n.height]);
  }
  for (i = steps - 1; i >= 0; i--) {
    n = mk(sizes[i][0], sizes[i][1]); x = n.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(cur, 0, 0, n.width, n.height); cur = n;
  }
  return cur;
}
function drawImageBg(ctx, im, bmp, W, H, u) {
  var zoom = num(im.zoom, 1, 1, 4), fx = num(im.x, 0.5, 0, 1), fy = num(im.y, 0.5, 0, 1);
  var blur = num(im.blur, 0, 0, 30) * u, dim = num(im.dim, 0, -0.7, 0.7), br = num(im.brightness, 1, 0.5, 1.5), gray = !!im.gray;
  var iw = bmp.naturalWidth || bmp.width, ih = bmp.naturalHeight || bmp.height;
  if (!iw || !ih) return;
  var k = Math.max(W / iw, H / ih) * zoom, dw = iw * k, dh = ih * k, dx = (W - dw) * fx, dy = (H - dh) * fy;
  if (blur > 0) { var e = blur * 2; dx -= e; dy -= e; dw += 2 * e; dh += 2 * e; } // keep edges opaque
  if (br === 1 && !gray && blur <= 0) ctx.drawImage(bmp, dx, dy, dw, dh);
  else if (HAS_FILTER) {
    var fl = [];
    if (gray) fl.push('grayscale(1)');
    if (br !== 1) fl.push('brightness(' + br + ')');
    if (blur > 0) fl.push('blur(' + blur.toFixed(2) + 'px)');
    ctx.save(); ctx.filter = fl.join(' '); ctx.drawImage(bmp, dx, dy, dw, dh); ctx.restore();
  } else {
    var t = mk(W, H), tx = t.getContext('2d');
    tx.drawImage(bmp, dx, dy, dw, dh);
    if (br !== 1 || gray) pixelFilter(tx, t.width, t.height, br, gray);
    ctx.drawImage(blur > 0 ? softBlur(t, blur) : t, 0, 0);
  }
  if (dim) { ctx.save(); ctx.globalAlpha = Math.abs(dim); ctx.fillStyle = dim > 0 ? '#000000' : '#FFFFFF'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}
function drawBackground(ctx, cfg, W, H, bmp) {
  var bg = cfg.bg || {}, col = HEX.test(bg.color || '') ? bg.color : '#F4EFE4';
  ctx.fillStyle = col; ctx.fillRect(0, 0, W, H);
  if (bg.type === 'pattern' && bg.pattern) {
    ctx.save();
    try { TKB.patterns.draw(bg.pattern.id, ctx, W, H, { color: bg.pattern.color, bg: col, scale: num(bg.pattern.scale, 1, 0.5, 3) }); } catch (e) {}
    ctx.restore();
  } else if (bg.type === 'image' && bmp) drawImageBg(ctx, bg.image || {}, bmp, W, H, W / 1080);
}
function sampleAvg(canvas, fallback) {
  try {
    var t = mk(12, 12), x = t.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(canvas, 0, 0, 12, 12);
    var d = x.getImageData(0, 0, 12, 12).data, r = 0, g = 0, b = 0, n = d.length / 4;
    for (var i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    return rgb2hex([r / n, g / n, b / n]);
  } catch (e) { return fallback; }
}

/* ---------- panels: shadow, blur, fill, border ---------- */
function paintPanels(ctx, E, lay, canvas) {
  var P = lay.panels, W = E.W, H = E.H, u = E.u;
  if (!P.length) return;
  var snap = null;
  if (E.blur > 0) { snap = mk(W, H); snap.getContext('2d').drawImage(canvas, 0, 0); }
  if (E.shadow !== 'none') { // shadow is clipped to the outside of the panels so it never tints a translucent panel
    ctx.save(); ctx.beginPath(); ctx.rect(-1e5, -1e5, 2e5, 2e5);
    P.forEach(function (p) { addShape(ctx, p, 0, 0, 0); });
    ctx.clip('evenodd'); ctx.beginPath();
    if (E.shadow === 'hard') {
      P.forEach(function (p) { addShape(ctx, p, 7 * u, 7 * u, 0); });
      ctx.fillStyle = E.c.ink;
    } else {
      P.forEach(function (p) { addShape(ctx, p, 0, 0, 0); });
      ctx.fillStyle = '#000000'; ctx.shadowColor = 'rgba(0,0,0,0.28)';
      ctx.shadowBlur = 18 * E.u * E.s; ctx.shadowOffsetY = 6 * E.u * E.s;
    }
    ctx.fill(); ctx.restore();
  }
  if (snap) {
    ctx.save(); ctx.beginPath(); P.forEach(function (p) { addShape(ctx, p, 0, 0, 0); }); ctx.clip();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (HAS_FILTER) { ctx.filter = 'blur(' + (E.blur * E.s).toFixed(2) + 'px)'; ctx.drawImage(snap, 0, 0); }
    else ctx.drawImage(softBlur(snap, E.blur * E.s), 0, 0);
    ctx.restore();
  }
  P.forEach(function (p) {
    ctx.beginPath(); addShape(ctx, p, 0, 0, 0);
    ctx.globalAlpha = p.alpha; ctx.fillStyle = p.fill; ctx.fill(); ctx.globalAlpha = 1;
    if (p.bw > 0) {
      ctx.beginPath(); addShape(ctx, p, 0, 0, p.bw / 2);
      ctx.strokeStyle = p.bc; ctx.lineWidth = p.bw; ctx.stroke();
    }
  });
}

/* ---------- size & placement ---------- */
// preset size: block width is a share of the screen's usable short side, content zoom is fixed
// h = tallest share of the screen height the block may take (mini must stay a small corner widget)
var SIZE_PRESETS = { mini: { k: 0.45, z: 0.55, h: 0.48 }, s: { k: 0.74, z: 0.85, h: 0.96 }, m: { k: 0.86, z: 1, h: 0.96 }, l: { k: 0.96, z: 1.1, h: 0.96 } };
var MINW = 420; // narrowest layout width (in u) that still fits the text without cutting it
function sizeOf(cfg, W, H) {
  var p = cfg.place || {}, pr = SIZE_PRESETS[p.preset];
  if (pr) { var ref = Math.min(W, 0.9 * H); return { width: Math.min(1, pr.k * ref / W), zoom: pr.z, hmax: pr.h, preset: p.preset }; }
  return { width: num(p.width, 0.92, 0.12, 1), zoom: num(p.zoom, 1, 0.25, 3), hmax: 0.96, preset: null };
}
// build the layout at the largest content scale s that keeps width*W and 96% of the height
function solve(ctx, cfg, W, H, avg) {
  var sz = sizeOf(cfg, W, H), u = Math.min(W, H) / 1080, s = sz.zoom, E, lay, i;
  for (i = 0; i < 5; i++) { // the 5th pass only rebuilds at the final scale
    s = Math.min(s, sz.width * W / (MINW * u));
    clipCount = 0;
    E = makeEnv(ctx, cfg, W, H, avg, sz.width * W / s, s); lay = buildLayout(E);
    if (i < 4 && lay.h * s > sz.hmax * H) s *= sz.hmax * H / (lay.h * s); else break;
  }
  s = Math.min(s, 0.96 * H / lay.h, 0.96 * W / lay.w);
  E.s = s;
  var p = cfg.place || {}, w = lay.w * s, h = lay.h * s, mx = 0.02 * W, my = 0.02 * H;
  var x = num(p.cx, 0.5, 0, 1) * W - w / 2, y = num(p.cy, 0.6, 0, 1) * H - h / 2;
  x = w > W - 2 * mx ? (W - w) / 2 : Math.min(Math.max(x, mx), W - mx - w);
  y = h > H - 2 * my ? (H - h) / 2 : Math.min(Math.max(y, my), H - my - h);
  return { E: E, lay: lay, x: x, y: y, w: w, h: h, s: s };
}
function canvasH(cfg, W) {
  var sz = cfg.size || {}, a = +sz.w > 0 ? +sz.w : 9, b = +sz.h > 0 ? +sz.h : 20;
  return Math.max(8, Math.round(W * b / a));
}

/* ---------- bitmap cache ---------- */
var bmpCache = {}, pend = {}, order = [];
function viaImg(blob) {
  return new Promise(function (res) {
    var url = URL.createObjectURL(blob), img = new Image();
    img.onload = function () { res(img); };
    img.onerror = function () { res(null); };
    img.src = url;
  });
}
function decode(blob) {
  if (!blob) return null;
  if (window.createImageBitmap) return createImageBitmap(blob).catch(function () { return viaImg(blob); });
  return viaImg(blob);
}
function loadBg(cfg, opts) {
  var bg = cfg.bg || {};
  if (bg.type !== 'image') return Promise.resolve(null);
  if (opts.bgBitmap) return Promise.resolve(opts.bgBitmap);
  var ref = bg.image && bg.image.ref;
  if (!ref) return Promise.resolve(null);
  if (bmpCache[ref]) return Promise.resolve(bmpCache[ref]);
  if (pend[ref]) return pend[ref];
  pend[ref] = Promise.resolve().then(function () { return TKB.storage.getImage(ref); })
    .then(decode).catch(function () { return null; })
    .then(function (b) {
      delete pend[ref];
      if (b) {
        bmpCache[ref] = b; order.push(ref);
        while (order.length > 4) delete bmpCache[order.shift()];
      }
      return b;
    });
  return pend[ref];
}

/* ---------- public API ---------- */
function paint(canvas, cfg, W, bmp) {
  var H = canvasH(cfg, W);
  canvas.width = W; canvas.height = H;
  var ctx = canvas.getContext('2d');
  drawBackground(ctx, cfg, W, H, bmp);
  var bgc = HEX.test((cfg.bg || {}).color || '') ? cfg.bg.color : '#F4EFE4';
  var avg = (cfg.bg && cfg.bg.type === 'image' && bmp) ? sampleAvg(canvas, bgc) : bgc;
  var pl = solve(ctx, cfg, W, H, avg), E = pl.E, lay = pl.lay;
  ctx.save(); ctx.translate(pl.x, pl.y); ctx.scale(pl.s, pl.s);
  paintPanels(ctx, E, lay, canvas);
  lay.draw(ctx);
  ctx.restore();
  return { block: { x: pl.x, y: pl.y, w: pl.w, h: pl.h }, scale: pl.s, clipped: clipCount };
}
function render(canvas, cfg, opts) {
  opts = opts || {};
  var W = Math.max(8, Math.round(+opts.width || 1080));
  return Promise.resolve().then(function () { return TKB.fonts.ensure(cfg); }).catch(function () {})
    .then(function () { return loadBg(cfg, opts); })
    .then(function (bmp) { return paint(canvas, cfg, W, bmp); });
}
render.measure = function (cfg, W, H, deep) {
  var bgc = HEX.test((cfg.bg || {}).color || '') ? cfg.bg.color : '#F4EFE4';
  var ctx = scratchCtx(), pl = solve(ctx, cfg, W, H, bgc);
  // deep: also run the drawing code once so text cut while drawing is counted
  if (deep) { ctx.save(); ctx.scale(pl.s, pl.s); try { pl.lay.draw(ctx); } catch (e) {} ctx.restore(); }
  return { x: pl.x, y: pl.y, w: pl.w, h: pl.h, s: pl.s, clipped: clipCount };
};
render.sizeOf = sizeOf;
// true centre (0..1) of the block when put in a corner, 4% from the edges
render.corner = function (cfg, W, H, pos) {
  var m = render.measure(cfg, W, H), e = 0.04 * Math.min(W, H), mx = Math.max(e, 0.02 * W), my = Math.max(e, 0.02 * H);
  var cx = 0.5, cy = 0.5;
  if (pos === 'tl' || pos === 'bl') cx = (mx + m.w / 2) / W; else if (pos === 'tr' || pos === 'br') cx = (W - mx - m.w / 2) / W;
  if (pos === 'tl' || pos === 'tr') cy = (my + m.h / 2) / H; else if (pos === 'bl' || pos === 'br') cy = (H - my - m.h / 2) / H;
  function r4(v) { return Math.round(Math.min(1, Math.max(0, v)) * 10000) / 10000; }
  return { cx: r4(cx), cy: r4(cy) };
};
render.subjectColor = function (cfg, text) {
  var k = clean(text).toLowerCase(), mode = (cfg.look && cfg.look.subjectColors) || 'auto';
  if (!k || mode === 'none') return null;
  var c = colorsOf(cfg);
  if (mode === 'head') return c.head;
  return subjectMap(cfg, c.accents)[k] || c.accents[hash(k) % c.accents.length];
};
render.layouts = [
  { id: 'planner', name: 'Sổ tay', hint: 'Mỗi ngày một trang, hai cột, lấp đầy màn hình dài' },
  { id: 'bento', name: 'Bento', hint: 'Các ô khối màu, hiện đại' },
  { id: 'editorial', name: 'Tạp chí', hint: 'Kẻ dòng mảnh, sang trọng như trang báo' },
  { id: 'swiss', name: 'Thụy Sĩ', hint: 'Lưới chặt, số lớn, kẻ đậm' },
  { id: 'mono', name: 'Tối giản', hint: 'Chỉ chữ, căn giữa, hợp màn hình khoá' },
  { id: 'grid', name: 'Bảng', hint: 'Một bảng gọn, có cột tiết' },
  { id: 'cards', name: 'Thẻ', hint: 'Mỗi ngày một thẻ' },
  { id: 'rows', name: 'Dòng', hint: 'Mỗi ngày một dòng' },
  { id: 'plain', name: 'Chữ trơn', hint: 'Chỉ có chữ, hợp với ảnh nền' },
  { id: 'notes', name: 'Giấy nhớ', hint: 'Mỗi ngày một tờ giấy nhớ hơi nghiêng' }
];
render.clearCache = function () { bmpCache = {}; pend = {}; order = []; };
TKB.render = render;
})();
