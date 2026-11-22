/* TKB Studio - panel "style" (Phong cách): presets, layouts, palettes, font pairs, quick device + position. */
(function () {
  'use strict';
  var TKB = window.TKB = window.TKB || {};
  var D = TKB.dom, h = D.h, cfg = D.cfg, clone = D.clone;


  var CSS =
    '.st-presets{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:10px}' +
    '.st-preset{position:relative;display:flex;flex-direction:column;gap:6px;padding:6px 6px 8px;border:2px solid var(--ink);border-radius:14px;background:var(--card);cursor:pointer;text-align:left;box-shadow:2px 2px 0 var(--ink);transition:transform var(--t-fast),box-shadow var(--t-fast)}' +
    '.st-preset:hover{transform:translate(-1px,-2px);box-shadow:3px 4px 0 var(--ink)}' +
    '.st-preset:active{transform:translate(2px,2px);box-shadow:none}' +
    '.st-preset.is-on{background:var(--accent-2)}' +
    '.st-preset.is-on::after{content:"";position:absolute;top:-8px;right:-8px;width:24px;height:24px;border:2px solid var(--ink);border-radius:50%;background:var(--accent-3) url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M6 12.5l4 4 8-9%27 fill=%27none%27 stroke=%27%231F2433%27 stroke-width=%273%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E") center/16px no-repeat}' +
    '.st-thumb{position:relative;display:block;width:100%;border-radius:8px;overflow:hidden;background:var(--paper-2)}' +
    '.st-thumb canvas{position:absolute;inset:0;width:100%;height:100%;display:block}' +
    '.st-thumb.is-busy::before{content:"";position:absolute;inset:0;background:var(--paper-2);animation:st-pulse 1s ease-in-out infinite alternate}' +
    '@keyframes st-pulse{from{opacity:.5}to{opacity:1}}' +
    '.st-name{font:800 13.5px/1.15 var(--font-display);padding:0 2px}' +
    '.st-tag{font-size:11px;line-height:1.25;color:var(--ink-soft);padding:0 2px}' +
    '.st-preset.is-on .st-tag{color:var(--ink)}' +
    '.st-sw{display:flex;gap:10px;flex-wrap:wrap}' +
    '.st-dot{position:relative;width:44px;height:44px;padding:0;border:2px solid var(--ink);border-radius:50%;cursor:pointer;overflow:hidden;box-shadow:2px 2px 0 var(--ink);transition:transform var(--t-fast)}' +
    '.st-dot i{position:absolute;inset:0;clip-path:polygon(50% 50%,100% 0,100% 100%)}' +
    '.st-dot b{position:absolute;inset:0;clip-path:polygon(50% 50%,100% 100%,0 100%)}' +
    '.st-dot:hover{transform:scale(1.06)}' +
    '.st-dot.is-on{outline:3px solid var(--ink);outline-offset:3px}' +
    '.st-pairs{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px}' +
    '.st-pair{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-height:64px;padding:8px 12px;border:2px solid var(--ink);border-radius:12px;background:var(--card);cursor:pointer;text-align:left;box-shadow:2px 2px 0 var(--ink)}' +
    '.st-pair:active{transform:translate(2px,2px);box-shadow:none}' +
    '.st-pair.is-on{background:var(--accent-4)}' +
    '.st-pair b{font-size:21px;line-height:1.25;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}' +
    '.st-pair span{font-size:11.5px;color:var(--ink-soft)}' +
    '.st-sec{display:flex;align-items:baseline;justify-content:space-between;gap:8px}' +
    '.st-sec .hint{text-align:right}';

  function mount(root) {
    var s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    var refs = [];
    root.appendChild(h('h2', { class: 'p-title', text: 'Phong cách' }));
    root.appendChild(h('p', { class: 'hint', text: 'Chạm một mẫu là xong. Lịch học của bạn giữ nguyên.' }));
    var stack = h('div', { class: 'stack' });
    root.appendChild(stack);
    function sec(title, hint, cls) {
      var d = h('div', { class: 'st-sec ' + (cls || '') }, [h('div', { class: 'label', text: title }), hint ? h('span', { class: 'hint', text: hint }) : null]);
      stack.appendChild(d); return d;
    }

    /* ---- presets with live thumbnails of the user's own timetable ---- */
    sec('Mẫu có sẵn', TKB.presets.list.length + ' mẫu');
    var grid = h('div', { class: 'st-presets' });
    stack.appendChild(grid);
    var tiles = [];
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { var t = en.target._t; t.vis = true; io.unobserve(en.target); paint(t); } });
    }, { rootMargin: '120px' }) : null;
    function ratio() { var z = cfg().size || { w: 9, h: 20 }; var r = z.w / z.h; return Math.min(1.8, Math.max(0.42, r)); }
    function thumbCfg(p) {
      var c = TKB.presets.apply(clone(cfg()), p);
      var r = ratio(); c.size = { w: r, h: 1 };
      return c;
    }
    function dataKey() { var c = cfg(); return JSON.stringify([c.data, c.size, c.bg.type === 'image' ? c.bg.image : 0, c.look.showTitle, c.look.showTimes, c.look.showPeriodNumbers]); }
    var queue = Promise.resolve();
    function paint(t) {
      if (!t.vis) return;
      var k = dataKey();
      if (t.key === k) return;
      t.key = k;
      t.box.style.aspectRatio = String(ratio());
      t.box.classList.add('is-busy');
      queue = queue.then(function () {
        if (t.key !== k) return;
        var off = document.createElement('canvas');
        return TKB.render(off, thumbCfg(t.p), { width: 220 }).then(function () {
          if (t.key !== k) return;
          t.cv.width = off.width; t.cv.height = off.height; t.cv.getContext('2d').drawImage(off, 0, 0);
          t.box.classList.remove('is-busy');
        });
      }).catch(function () { t.key = null; });
    }
    TKB.presets.list.forEach(function (p) {
      var cv = h('canvas'), box = h('span', { class: 'st-thumb' }, [cv]);
      var b = h('button', { type: 'button', class: 'st-preset', 'aria-pressed': 'false', onclick: function () {
        TKB.ui.update(function (c) { TKB.presets.apply(c, p); });
        TKB.ui.toast('Đã áp dụng mẫu ' + p.name, 'ok');
      } }, [box, h('span', { class: 'st-name', text: p.name }), h('span', { class: 'st-tag', text: p.tag })]);
      var t = { p: p, cv: cv, box: box, btn: b, vis: !io };
      b._t = t; tiles.push(t); grid.appendChild(b);
      if (io) io.observe(b);
    });
    var debounce = 0;
    refs.push(function () {
      var l = cfg().look, f = l.fonts;
      tiles.forEach(function (t) {
        var pl = t.p.look, on = pl.layout === l.layout && pl.theme === l.theme && pl.fonts.title === f.title && pl.fonts.body === f.body;
        t.btn.classList.toggle('is-on', on); t.btn.setAttribute('aria-pressed', String(on));
      });
      clearTimeout(debounce);
      debounce = setTimeout(function () { tiles.forEach(paint); }, 450);
    });

    /* ---- layout chips ---- */
    sec('Bố cục');
    var lrow = h('div', { class: 'scroll-x' });
    stack.appendChild(lrow);
    var lbtns = (TKB.render.layouts || []).map(function (L) {
      var b = h('button', { type: 'button', class: 'chip', title: L.hint, text: L.name, onclick: function () { TKB.ui.update(function (c) { c.look.layout = L.id; }); } });
      lrow.appendChild(b); return { id: L.id, b: b };
    });
    refs.push(function () { var cur = cfg().look.layout; lbtns.forEach(function (x) { x.b.classList.toggle('is-on', x.id === cur); }); });

    /* ---- palettes: theme + matching background ---- */
    sec('Bảng màu');
    var sw = h('div', { class: 'st-sw' });
    stack.appendChild(sw);
    var dots = TKB.themes.list.map(function (th) {
      var i = h('i'), b2 = h('b');
      i.style.background = th.head; b2.style.background = th.accents[0];
      var d = h('button', { type: 'button', class: 'st-dot', title: th.name, 'aria-label': 'Bảng màu ' + th.name, onclick: function () {
        TKB.ui.update(function (c) {
          c.look.theme = th.id; c.look.colors = {};
          if (c.bg.type !== 'image') { c.bg.color = th.bg; if (c.bg.pattern) c.bg.pattern.color = th.patternColor; }
        });
      } }, [i, b2]);
      d.style.background = th.bg;
      sw.appendChild(d); return { id: th.id, d: d };
    });
    refs.push(function () { var cur = cfg().look.theme; dots.forEach(function (x) { x.d.classList.toggle('is-on', x.id === cur); }); });

    /* ---- font pairs, each card set in its own title face ---- */
    sec('Cặp chữ', 'Tiêu đề + nội dung');
    var pg = h('div', { class: 'st-pairs' });
    stack.appendChild(pg);
    var pbtns = TKB.presets.pairs.map(function (q) {
      var big = h('b', { text: q[0] });
      var b = h('button', { type: 'button', class: 'st-pair', onclick: function () {
        TKB.ui.update(function (c) {
          var f = c.look.fonts;
          f.title = q[1]; f.titleWeight = TKB.fonts.nearestWeight(q[1], q[2]);
          f.body = q[3]; f.bodyWeight = TKB.fonts.nearestWeight(q[3], q[4]);
        });
      } }, [big, h('span', { text: q[1] + ' · ' + q[3] })]);
      TKB.fonts.load(q[1], q[2]).then(function (ok) { if (ok) { big.style.fontFamily = TKB.fonts.stack(q[1]); big.style.fontWeight = q[2]; } });
      pg.appendChild(b); return { q: q, b: b };
    });
    refs.push(function () { var f = cfg().look.fonts; pbtns.forEach(function (x) { x.b.classList.toggle('is-on', x.q[1] === f.title && x.q[3] === f.body); }); });

    /* ---- basic mode only: device, position, photo ---- */
    sec('Màn hình', 'Chọn đúng máy để ảnh vừa khít', 'basic-only');
    var drow = h('div', { class: 'scroll-x basic-only' });
    stack.appendChild(drow);
    var auto = h('button', { type: 'button', class: 'chip', text: '✦ Máy này', onclick: function () {
      try { var d = TKB.devices.detect(); TKB.ui.update(function (c) { c.size = { w: d.size.w, h: d.size.h }; }); } catch (e) {}
    } });
    drow.appendChild(auto);
    var dchips = TKB.devices.list.map(function (d) {
      var b = h('button', { type: 'button', class: 'chip', title: d.note, text: d.label.replace('Điện thoại ', '').replace('Máy tính bảng ', 'Tablet ').replace('Màn siêu rộng ', 'Màn rộng '), onclick: function () {
        TKB.ui.update(function (c) { c.size = { w: d.w, h: d.h }; });
      } });
      drow.appendChild(b); return { id: d.id, b: b };
    });
    refs.push(function () { var id = TKB.devices.byRatio(cfg().size); dchips.forEach(function (x) { x.b.classList.toggle('is-on', x.id === id); }); });

    function segRow(label, opts, get, set) {
      var box = h('div', { class: 'seg', role: 'group', 'aria-label': label });
      var bs = opts.map(function (o) {
        var b = h('button', { type: 'button', text: o[1], 'aria-pressed': 'false', onclick: function () { TKB.ui.update(function (c) { set(c, o[0]); }); } });
        box.appendChild(b); return b;
      });
      var f = h('div', { class: 'field basic-only' }, [h('div', { class: 'label', text: label }), box]);
      stack.appendChild(f);
      refs.push(function () { var v = get(cfg()); bs.forEach(function (b, i) { b.setAttribute('aria-pressed', String(typeof v === 'string' || v == null ? opts[i][0] === v : Math.abs(opts[i][0] - v) < 0.04)); }); });
    }
    segRow('Vị trí bảng', [[0.3, 'Trên'], [0.5, 'Giữa'], [0.62, 'Hơi thấp'], [0.72, 'Dưới']],
      function (c) { return c.place.cy; }, function (c, v) { c.place.cx = 0.5; c.place.cy = v; });
    segRow('Cỡ bảng', [['mini', 'Mini'], ['s', 'Nhỏ'], ['m', 'Vừa'], ['l', 'Lớn']],
      function (c) { return c.place.preset; },
      function (c, v) {
        c.place.preset = v;
        if (v === 'mini' && c.size.w > c.size.h) { // wide screen: tuck the small block into the top-right corner
          var W = 1080, p = TKB.render.corner(c, W, Math.round(W * c.size.h / c.size.w), 'tr');
          c.place.cx = p.cx; c.place.cy = p.cy;
        }
      });

    var file = h('input', { type: 'file', accept: 'image/*', hidden: true });
    var up = h('button', { type: 'button', class: 'btn', onclick: function () { file.click(); } }, [
      (function () { var sp = h('span'); sp.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 3.5 3L15 13l5 4.5"/></svg>'; return sp.firstChild; })(),
      h('span', { text: 'Ảnh nền của bạn' })]);
    var rm = h('button', { type: 'button', class: 'btn btn-ghost', text: 'Bỏ ảnh', onclick: function () {
      TKB.ui.update(function (c) { c.bg.type = 'pattern'; });
    } });
    file.addEventListener('change', function () {
      var f = file.files && file.files[0]; file.value = '';
      if (!f) return;
      up.disabled = true;
      TKB.storage.putImage(f).then(function (ref) {
        TKB.ui.update(function (c) {
          c.bg.type = 'image';
          c.bg.image = { ref: ref, zoom: 1, x: 0.5, y: 0.5, blur: 0, dim: 0, brightness: 1, gray: false };
          c.look.panelOpacity = Math.max(0.88, c.look.panelOpacity);
        });
      }).catch(function (e) { TKB.ui.toast((e && e.message) || 'Không đọc được ảnh này.', 'error'); })
        .then(function () { up.disabled = false; });
    });
    stack.appendChild(h('div', { class: 'row basic-only' }, [up, rm, file]));
    refs.push(function () { rm.hidden = cfg().bg.type !== 'image'; });

    function refreshAll() { refs.forEach(function (f) { try { f(); } catch (e) {} }); }
    TKB.ui.on('change', refreshAll);
    TKB.ui.on('load', refreshAll);
    try { refreshAll(); } catch (e) {}
  }

  TKB.ui.registerPanel({ id: 'style', title: 'Phong cách', short: 'Mẫu', order: 1.5,
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/><path d="M5.5 16.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/></svg>',
    mount: mount });
})();
