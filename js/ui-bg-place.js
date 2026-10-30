/* TKB Studio - panels "bg" (Nen) and "place" (Vi tri) */
(function () {
  'use strict';
  var TKB = window.TKB = window.TKB || {};

  function h(tag, p, kids) {
    var e = document.createElement(tag), k, v;
    for (k in (p || {})) {
      v = p[k];
      if (v == null) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    (kids || []).forEach(function (c) {
      if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }
  function cfg() { return TKB.ui.get(); }
  function upd(fn, key) { TKB.ui.update(fn, key ? { key: key } : undefined); }
  function setVal(el, v) {
    v = v == null ? '' : String(v);
    if (el.value !== v && document.activeElement !== el) el.value = v;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function r3(v) { return Math.round(v * 1000) / 1000; }
  function normHex(s) {
    s = String(s).trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(s)) s = s.split('').map(function (x) { return x + x; }).join('');
    return /^[0-9a-f]{6}$/i.test(s) ? '#' + s.toUpperCase() : null;
  }
  function effColors(c) { return Object.assign({}, TKB.themes.get(c.look.theme), c.look.colors || {}); }
  function style(id, css) {
    if (document.getElementById(id)) return;
    var s = h('style', { id: id }); s.textContent = css; document.head.appendChild(s);
  }
  // slider factory; cls = row class
  function slider(cls, label, min, max, step, get, set, key, fmt) {
    var out = h('span', { class: 'hint' });
    var inp = h('input', { class: 'range', type: 'range', min: min, max: max, step: step, 'aria-label': label });
    inp.addEventListener('input', function () {
      var v = parseFloat(inp.value);
      upd(function (c) { set(c, v); }, key);
      out.textContent = fmt(v);
    });
    return {
      el: h('div', { class: 'field' }, [h('div', { class: 'row ' + cls }, [h('span', { class: 'label' }, [label]), out]), inp]),
      sync: function (c) { var v = get(c); inp.value = v; out.textContent = fmt(v); }
    };
  }
  function toggle(label, onchange) {
    var inp = h('input', { type: 'checkbox' });
    inp.addEventListener('change', function () { onchange(inp.checked); });
    return { el: h('label', { class: 'switch' }, [inp, h('span'), ' ' + label]), inp: inp };
  }
  function pct(v) { return Math.round(v * 100) + '%'; }
  function seg(btns) { return h('div', { class: 'seg', role: 'group' }, btns); }

  /* ================= BG ================= */
  var IMG_DEF = { zoom: 1, x: 0.5, y: 0.5, blur: 0, dim: 0, brightness: 1, gray: false };

  TKB.ui.registerPanel({
    id: 'bg', title: 'Nền', order: 2,
    icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    mount: function (root) {
      style('p-bg-style',
        '.p-bg-lr{justify-content:space-between;align-items:center}' +
        '.p-bg-color{width:56px;min-height:44px;padding:2px}' +
        '.p-bg-hex{width:110px;font-family:monospace;text-transform:uppercase}' +
        '.p-bg-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}' +
        '.p-bg-tiles .tile{padding:6px;display:flex;flex-direction:column;gap:4px;align-items:center;min-height:44px}' +
        '.p-bg-tiles canvas{width:100%;height:auto;aspect-ratio:1/1;display:block;border-radius:6px}' +
        '.p-bg-thumb{max-width:100%;max-height:180px;border-radius:8px;border:2px solid var(--line);display:block}');

      var tabs = {}, secs = {};
      [['color', 'Màu'], ['pattern', 'Hoạ tiết'], ['image', 'Ảnh']].forEach(function (t) {
        var b = h('button', { type: 'button', 'aria-pressed': 'false' }, [t[1]]);
        b.addEventListener('click', function () { upd(function (c) { c.bg.type = t[0]; }); });
        tabs[t[0]] = b;
      });

      /* colour */
      var cIn = h('input', { class: 'input p-bg-color', type: 'color', 'aria-label': 'Chọn màu nền' });
      var hex = h('input', { class: 'input p-bg-hex', type: 'text', maxlength: 7, 'aria-label': 'Mã màu hex', spellcheck: 'false' });
      cIn.addEventListener('input', function () { var v = cIn.value; upd(function (c) { c.bg.color = v.toUpperCase(); }, 'bg-color'); });
      hex.addEventListener('input', function () {
        var v = normHex(hex.value);
        if (v) upd(function (c) { c.bg.color = v; }, 'bg-color');
      });
      hex.addEventListener('blur', function () { hex.value = cfg().bg.color; });
      var swRow = h('div', { class: 'row' });
      var useTheme = h('button', { type: 'button', class: 'btn btn-ghost btn-sm' }, ['Dùng màu của kiểu']);
      useTheme.addEventListener('click', function () { var v = effColors(cfg()).bg; upd(function (c) { c.bg.color = v; }); });
      secs.color = h('div', { class: 'stack' }, [
        h('div', { class: 'row' }, [cIn, hex]),
        h('div', { class: 'field' }, [h('span', { class: 'label' }, ['Màu của kiểu']), swRow]),
        h('div', { class: 'row' }, [useTheme])
      ]);

      /* pattern */
      var tiles = [], tileBox = h('div', { class: 'p-bg-tiles' }), thumbSig = null;
      TKB.patterns.list.forEach(function (pt) {
        var cv = h('canvas', { width: 216, height: 216, 'aria-hidden': 'true' });
        var b = h('button', { type: 'button', class: 'tile', 'aria-pressed': 'false' }, [cv, h('span', { class: 'hint' }, [pt.name])]);
        b.addEventListener('click', function () { upd(function (c) { c.bg.pattern.id = pt.id; }); });
        tiles.push({ id: pt.id, cv: cv, btn: b }); tileBox.appendChild(b);
      });
      var pcol = h('input', { class: 'input p-bg-color', type: 'color', 'aria-label': 'Màu hoạ tiết' });
      pcol.addEventListener('input', function () { var v = pcol.value; upd(function (c) { c.bg.pattern.color = v.toUpperCase(); }, 'bg-pcolor'); });
      var pTheme = h('button', { type: 'button', class: 'btn btn-ghost btn-sm' }, ['Màu hoạ tiết của kiểu']);
      pTheme.addEventListener('click', function () { var v = TKB.themes.get(cfg().look.theme).patternColor; upd(function (c) { c.bg.pattern.color = v; }); });
      var scl = slider('p-bg-lr', 'Cỡ hoạ tiết', 0.5, 3, 0.1,
        function (c) { return c.bg.pattern.scale; }, function (c, v) { c.bg.pattern.scale = v; }, 'bg-pscale',
        function (v) { return '×' + v.toFixed(1); });
      secs.pattern = h('div', { class: 'stack' }, [
        tileBox,
        h('div', { class: 'row' }, [h('span', { class: 'label' }, ['Màu hoạ tiết']), pcol, pTheme]),
        scl.el
      ]);
      function drawThumbs(c) {
        var sg = [c.bg.color, c.bg.pattern.color, c.bg.pattern.scale].join('|');
        if (sg === thumbSig) return; thumbSig = sg;
        tiles.forEach(function (t) {
          var x = t.cv.getContext('2d');
          x.fillStyle = c.bg.color; x.fillRect(0, 0, t.cv.width, t.cv.height);
          try { TKB.patterns.draw(t.id, x, t.cv.width, t.cv.height, { color: c.bg.pattern.color, bg: c.bg.color, scale: c.bg.pattern.scale * 2.5 }); } catch (e) {}
        });
      }

      /* image */
      var file = h('input', { type: 'file', accept: 'image/*', hidden: '' });
      var pick = h('button', { type: 'button', class: 'btn btn-primary' }, ['Chọn ảnh']);
      pick.addEventListener('click', function () { file.click(); });
      var rm = h('button', { type: 'button', class: 'btn btn-ghost btn-danger btn-sm' }, ['Bỏ ảnh']);
      rm.addEventListener('click', function () { upd(function (c) { c.bg.image.ref = null; }); });
      var img = h('img', { class: 'p-bg-thumb', alt: 'Ảnh nền đã chọn' });
      var empty = h('p', { class: 'empty' }, ['Chưa có ảnh nền. Chọn ảnh từ máy của bạn.']);
      var imgUrl = null, shown = undefined;
      file.addEventListener('change', function () {
        var f = file.files && file.files[0]; file.value = '';
        if (!f) return;
        if (!/^image\//.test(f.type) && !(f.type === '' && /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(f.name))) {
          TKB.ui.toast('Tệp này không phải ảnh. Hãy chọn ảnh JPG, PNG hoặc WebP.', 'error'); return;
        }
        TKB.ui.toast('Đang xử lý ảnh…', 'info');
        TKB.storage.putImage(f).then(function (ref) {
          upd(function (c) { c.bg.type = 'image'; c.bg.image = Object.assign({}, IMG_DEF, { ref: ref }); });
          TKB.ui.toast('Đã đặt ảnh nền', 'ok');
        }).catch(function () { TKB.ui.toast('Không đọc được ảnh này. Hãy thử ảnh khác.', 'error'); });
      });
      function showThumb(ref) {
        if (ref === shown) return; shown = ref;
        if (imgUrl) { URL.revokeObjectURL(imgUrl); imgUrl = null; }
        img.removeAttribute('src');
        if (!ref) return;
        TKB.storage.getImage(ref).then(function (b) {
          if (shown !== ref || !b) return;
          imgUrl = URL.createObjectURL(b); img.src = imgUrl;
        }).catch(function () {});
      }
      var gray = toggle('Ảnh đen trắng', function (on) { upd(function (c) { c.bg.image.gray = on; }); });
      var isl = [
        slider('p-bg-lr', 'Phóng to', 1, 4, 0.05, function (c) { return c.bg.image.zoom; }, function (c, v) { c.bg.image.zoom = v; }, 'bg-zoom', function (v) { return '×' + v.toFixed(2); }),
        slider('p-bg-lr', 'Lệch ngang', 0, 1, 0.01, function (c) { return c.bg.image.x; }, function (c, v) { c.bg.image.x = v; }, 'bg-ix', pct),
        slider('p-bg-lr', 'Lệch dọc', 0, 1, 0.01, function (c) { return c.bg.image.y; }, function (c, v) { c.bg.image.y = v; }, 'bg-iy', pct),
        slider('p-bg-lr', 'Làm mờ', 0, 30, 1, function (c) { return c.bg.image.blur; }, function (c, v) { c.bg.image.blur = v; }, 'bg-blur', function (v) { return v + ' px'; }),
        slider('p-bg-lr', 'Phủ trắng ↔ Phủ đen', -0.7, 0.7, 0.05, function (c) { return c.bg.image.dim; }, function (c, v) { c.bg.image.dim = v; }, 'bg-dim', function (v) { return (v > 0 ? '+' : '') + Math.round(v * 100) + '%'; }),
        slider('p-bg-lr', 'Độ sáng', 0.5, 1.5, 0.05, function (c) { return c.bg.image.brightness; }, function (c, v) { c.bg.image.brightness = v; }, 'bg-bright', pct)
      ];
      var imgCtl = h('div', { class: 'stack' }, [img].concat(isl.map(function (s) { return s.el; }), [gray.el, h('div', { class: 'row' }, [rm])]));
      secs.image = h('div', { class: 'stack' }, [h('div', { class: 'row' }, [pick]), file, empty, imgCtl]);

      function sync() {
        var c = cfg(), type = c.bg.type;
        Object.keys(tabs).forEach(function (k) { tabs[k].setAttribute('aria-pressed', String(k === type)); secs[k].hidden = k !== type; });
        // colour
        var bgc = (c.bg.color || '#FFFFFF');
        cIn.value = bgc.toLowerCase(); setVal(hex, bgc.toUpperCase());
        swRow.textContent = '';
        var e = effColors(c), seen = {};
        [e.bg, e.panel].concat(TKB.themes.get(c.look.theme).accents || []).forEach(function (col) {
          if (!col || seen[col.toLowerCase()]) return; seen[col.toLowerCase()] = 1;
          var on = col.toLowerCase() === bgc.toLowerCase();
          var b = h('button', { type: 'button', class: 'swatch' + (on ? ' is-on' : ''), 'aria-label': 'Màu ' + col, 'aria-pressed': String(on), style: 'background-color:' + col });
          b.addEventListener('click', function () { upd(function (c2) { c2.bg.color = col; }); });
          swRow.appendChild(b);
        });
        // pattern
        pcol.value = (c.bg.pattern.color || '#000000').toLowerCase();
        tiles.forEach(function (t) { var on = t.id === c.bg.pattern.id; t.btn.classList.toggle('is-on', on); t.btn.setAttribute('aria-pressed', String(on)); });
        scl.sync(c); drawThumbs(c);
        // image
        var ref = c.bg.image.ref;
        showThumb(ref);
        empty.hidden = !!ref; imgCtl.hidden = !ref;
        isl.forEach(function (s) { s.sync(c); });
        gray.inp.checked = !!c.bg.image.gray;
      }

      root.appendChild(h('div', { class: 'stack' }, [
        h('h2', { class: 'p-title' }, ['Nền']),
        seg([tabs.color, tabs.pattern, tabs.image]),
        secs.color, secs.pattern, secs.image
      ]));
      TKB.ui.on('change', sync); TKB.ui.on('load', sync); sync();
    }
  });

  /* ================= PLACE ================= */
  TKB.ui.registerPanel({
    id: 'place', title: 'Vị trí', order: 5,
    icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/></svg>',
    mount: function (root) {
      style('p-place-style',
        '.p-place-lr{justify-content:space-between;align-items:center}' +
        '.p-place-pad{display:grid;grid-template-columns:repeat(3,48px);grid-auto-rows:48px;gap:6px}' +
        '.p-place-pad .btn{width:48px;height:48px;padding:0}' +
        '.p-place-tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}' +
        '.p-place-tiles .tile{display:flex;gap:10px;align-items:center;text-align:left;padding:8px;min-height:56px}' +
        '.p-place-ico{flex:0 0 40px;height:40px;display:flex;align-items:center;justify-content:center}' +
        '.p-place-ico i{display:block;border:2px solid currentColor;border-radius:3px}' +
        '.p-place-cap{display:flex;flex-direction:column;min-width:0}' +
        '.p-place-cap b{font-size:13px}.p-place-cap span{font-size:11px;color:var(--ink-soft)}' +
        '.p-place-num{width:84px}' +
        '.p-place-px{display:flex;justify-content:space-between;gap:8px;font-size:14px;padding:6px 0;border-bottom:1px solid var(--line)}');

      function frac() {
        var c = cfg(), W = 1080, H = Math.round(W * c.size.h / c.size.w);
        try { var b = TKB.render.measure(c, W, H); return clamp(b.h / H, 0.05, 1); } catch (e) { return 0.4; }
      }
      function setCy(fn) { var f = frac(); upd(function (c) { c.place.cy = r3(clamp(fn(f), 0, 1)); }); }

      var presets = h('div', { class: 'row' });
      [['Trên', function (f) { return 0.07 + f / 2; }],
       ['Giữa', function () { return 0.5; }],
       ['Dưới', function (f) { return 0.94 - f / 2; }],
       ['Dưới đồng hồ', function (f) { return Math.min(0.34 + f / 2, 0.97 - f / 2); }]].forEach(function (p) {
        var b = h('button', { type: 'button', class: 'btn btn-sm' }, [p[0]]);
        b.addEventListener('click', function () { setCy(p[1]); });
        presets.appendChild(b);
      });

      var sl = [
        slider('p-place-lr', 'Ngang (tâm)', 0, 1, 0.005, function (c) { return c.place.cx; }, function (c, v) { c.place.cx = v; }, 'pl-cx', pct),
        slider('p-place-lr', 'Dọc (tâm)', 0, 1, 0.005, function (c) { return c.place.cy; }, function (c, v) { c.place.cy = v; }, 'pl-cy', pct),
        slider('p-place-lr', 'Độ rộng bảng', 0.3, 1, 0.01, function (c) { return c.place.width; }, function (c, v) { c.place.width = v; }, 'pl-w', pct),
        slider('p-place-lr', 'Cỡ bảng (phóng to / thu nhỏ)', 0.3, 3, 0.05, function (c) { return c.place.zoom == null ? 1 : c.place.zoom; }, function (c, v) { c.place.zoom = v; }, 'pl-z', pct)
      ];

      function nudge(dx, dy) {
        upd(function (c) { c.place.cx = r3(clamp(c.place.cx + dx, 0, 1)); c.place.cy = r3(clamp(c.place.cy + dy, 0, 1)); }, 'pl-nudge');
      }
      var pad = h('div', { class: 'p-place-pad' });
      [[null], ['▲', 0, -0.01, 'Lên'], [null], ['◀', -0.01, 0, 'Sang trái'], [null], ['▶', 0.01, 0, 'Sang phải'], [null], ['▼', 0, 0.01, 'Xuống'], [null]].forEach(function (a) {
        if (!a[0]) { pad.appendChild(h('span')); return; }
        var b = h('button', { type: 'button', class: 'btn btn-icon', 'aria-label': a[3] }, [a[0]]);
        b.addEventListener('click', function () { nudge(a[1], a[2]); });
        pad.appendChild(b);
      });
      var center = h('button', { type: 'button', class: 'btn btn-ghost btn-sm' }, ['Căn giữa ngang']);
      center.addEventListener('click', function () { upd(function (c) { c.place.cx = 0.5; }); });
      var guides = toggle('Hiện đường kẻ căn chỉnh', function (on) { TKB.ui.setGuides(on); });

      /* device */
      var tiles = [], devBox = h('div', { class: 'stack' }), groups = {}, order = [];
      TKB.devices.list.forEach(function (d) {
        if (!groups[d.group]) { groups[d.group] = h('div', { class: 'p-place-tiles' }); order.push(d.group); }
        var m = 36 / Math.max(d.w, d.h);
        var ico = h('span', { class: 'p-place-ico' }, [h('i', { style: 'width:' + Math.max(8, Math.round(d.w * m)) + 'px;height:' + Math.max(8, Math.round(d.h * m)) + 'px' })]);
        var b = h('button', { type: 'button', class: 'tile', 'aria-pressed': 'false' }, [ico, h('span', { class: 'p-place-cap' }, [h('b', {}, [d.label]), d.note ? h('span', {}, [d.note]) : null])]);
        b.addEventListener('click', function () { upd(function (c) { c.size = { w: d.w, h: d.h }; }); });
        tiles.push({ d: d, btn: b }); groups[d.group].appendChild(b);
      });
      order.forEach(function (g) { devBox.appendChild(h('div', { class: 'field' }, [h('span', { class: 'label' }, [g]), groups[g]])); });

      var flip = h('button', { type: 'button', class: 'btn btn-sm' }, ['Xoay ngang / dọc']);
      flip.addEventListener('click', function () { upd(function (c) { c.size = TKB.devices.flip(c.size); }); });
      var wIn = h('input', { class: 'input p-place-num', type: 'number', min: 0.1, step: 'any', inputmode: 'decimal', 'aria-label': 'Chiều rộng tỉ lệ' });
      var hIn = h('input', { class: 'input p-place-num', type: 'number', min: 0.1, step: 'any', inputmode: 'decimal', 'aria-label': 'Chiều cao tỉ lệ' });
      function applySize() {
        var w = parseFloat(wIn.value), hh = parseFloat(hIn.value);
        if (w > 0 && hh > 0) upd(function (c) { c.size = { w: w, h: hh }; }, 'pl-size');
      }
      wIn.addEventListener('input', applySize); hIn.addEventListener('input', applySize);
      var detect = h('button', { type: 'button', class: 'btn btn-primary btn-sm' }, ['Dùng màn hình máy này']);
      detect.addEventListener('click', function () {
        try {
          var d = TKB.devices.detect();
          upd(function (c) { c.size = { w: d.size.w, h: d.size.h }; });
          TKB.ui.toast('Đã chọn: ' + d.label, 'ok');
        } catch (e) { TKB.ui.toast('Không nhận diện được màn hình', 'error'); }
      });
      var pxBox = h('div');

      function sync() {
        var c = cfg();
        sl.forEach(function (s) { s.sync(c); });
        var id = TKB.devices.byRatio(c.size);
        tiles.forEach(function (t) { var on = t.d.id === id; t.btn.classList.toggle('is-on', on); t.btn.setAttribute('aria-pressed', String(on)); });
        setVal(wIn, c.size.w); setVal(hIn, c.size.h);
        pxBox.textContent = '';
        TKB.QUALITY.forEach(function (q) {
          var p = TKB.devices.pixels(c.size, q.short);
          pxBox.appendChild(h('div', { class: 'p-place-px' }, [h('span', {}, [q.label]), h('b', {}, [p.w + ' × ' + p.h + ' px'])]));
        });
      }

      root.appendChild(h('div', { class: 'stack' }, [
        h('h2', { class: 'p-title' }, ['Vị trí']),
        h('div', { class: 'field' }, [h('span', { class: 'label' }, ['Đặt nhanh']), presets]),
        sl[0].el, sl[1].el, sl[2].el,
        h('div', { class: 'row' }, [pad, h('div', { class: 'stack' }, [center, guides.el])]),
        h('div', { class: 'divider' }),
        h('h3', { class: 'label' }, ['Kích thước màn hình']),
        h('p', { class: 'hint' }, ['“Màn dài” là điện thoại có tỉ lệ từ 18:9 đến 21:9, cao hơn màn 16:9 cũ. Chọn đúng tỉ lệ để hình không bị cắt. Không chắc thì bấm “Dùng màn hình máy này”.']),
        devBox,
        h('div', { class: 'row' }, [flip, detect]),
        h('div', { class: 'field' }, [h('span', { class: 'label' }, ['Tỉ lệ tuỳ chọn (rộng : cao)']), h('div', { class: 'row' }, [wIn, h('span', {}, [':']), hIn])]),
        h('div', { class: 'field' }, [h('span', { class: 'label' }, ['Kích thước ảnh xuất']), pxBox])
      ]));
      TKB.ui.on('change', sync); TKB.ui.on('load', sync); sync();
    }
  });
})();
