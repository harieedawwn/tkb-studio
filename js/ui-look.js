/* TKB Studio - panels "look" (Kiểu) and "font" (Chữ) */
(function () {
  'use strict';
  var TKB = window.TKB = window.TKB || {};

  function h(tag, props, kids) {
    var e = document.createElement(tag);
    for (var n in (props || {})) {
      var v = props[n];
      if (n === 'class') e.className = v;
      else if (n === 'text') e.textContent = v;
      else if (n.slice(0, 2) === 'on') e.addEventListener(n.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(n, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function addStyle(s) { var e = document.createElement('style'); e.textContent = s; document.head.appendChild(e); }
  function cfg() { return TKB.ui.get(); }
  function eff(c) { return Object.assign({}, TKB.themes.get(c.look.theme), c.look.colors || {}); }
  function norm(s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function hex(v) { return /^#[0-9a-f]{6}$/i.test(v || '') ? v : '#000000'; }

  function slider(label, min, max, step, get, set, key, fmt) {
    var out = h('span', { class: 'p-look-val' });
    var inp = h('input', { type: 'range', class: 'range', min: min, max: max, step: step, 'aria-label': label });
    inp.addEventListener('input', function () {
      var v = parseFloat(inp.value);
      TKB.ui.update(function (c) { set(c, v); }, { key: key });
    });
    var el = h('div', { class: 'field' }, [h('div', { class: 'row p-look-sl' }, [h('span', { class: 'label', text: label }), out]), inp]);
    function refresh() {
      var v = get(cfg());
      if (document.activeElement !== inp) inp.value = v;
      out.textContent = fmt ? fmt(v) : String(v);
    }
    return { el: el, refresh: refresh };
  }

  function seg(label, opts, get, set) {
    var box = h('div', { class: 'seg', role: 'group', 'aria-label': label });
    var btns = opts.map(function (o) {
      var b = h('button', { type: 'button', text: o[1], 'aria-pressed': 'false', onclick: function () { TKB.ui.update(function (c) { set(c, o[0]); }); } });
      box.appendChild(b); return b;
    });
    function refresh() { var v = get(cfg()); btns.forEach(function (b, i) { b.setAttribute('aria-pressed', opts[i][0] === v ? 'true' : 'false'); }); }
    return { el: h('div', { class: 'field' }, [h('div', { class: 'label', text: label }), box]), refresh: refresh };
  }

  function sw(label, get, set) {
    var inp = h('input', { type: 'checkbox' });
    inp.addEventListener('change', function () { TKB.ui.update(function (c) { set(c, inp.checked); }); });
    var el = h('div', { class: 'row p-look-sw' }, [h('span', { class: 'label', text: label }), h('label', { class: 'switch' }, [inp, h('span')])]);
    return { el: el, refresh: function () { inp.checked = !!get(cfg()); } };
  }

  var LOOK_CSS =
    '.p-look-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px}' +
    '.p-look-grid .tile{display:flex;flex-direction:column;gap:6px;padding:6px;min-height:44px;text-align:center;align-items:stretch}' +
    '.p-look-grid canvas{width:100%;height:auto;display:block;background:var(--paper-2);border-radius:4px}' +
    '.p-look-strip{display:flex;height:30px;border:2px solid var(--line);border-radius:4px;overflow:hidden}' +
    '.p-look-strip i{flex:1;display:block}' +
    '.p-look-cap{font-size:12px;line-height:1.2}' +
    '.p-look-val{font-size:13px;color:var(--ink-soft);margin-left:auto}' +
    '.p-look-sl{align-items:center}.p-look-sw{align-items:center;justify-content:space-between;min-height:44px}' +
    '.p-look-col{align-items:center;gap:8px;min-height:44px}' +
    '.p-look-col input[type=color]{width:44px;height:44px;padding:2px;border:2px solid var(--line);border-radius:8px;background:var(--paper)}' +
    '.p-look-col .label{flex:1}';

  function mountLook(root) {
    addStyle(LOOK_CSS);
    var refs = [];
    var stack = h('div', { class: 'stack' });
    root.appendChild(h('h2', { class: 'p-title', text: 'Kiểu' }));
    root.appendChild(stack);
    function add(x) { stack.appendChild(x.el); refs.push(x.refresh); }
    function head(t) { stack.appendChild(h('div', { class: 'divider' })); stack.appendChild(h('div', { class: 'label', text: t })); }

    // Layout tiles with lazy live previews
    stack.appendChild(h('div', { class: 'label', text: 'Bố cục' }));
    var lg = h('div', { class: 'p-look-grid' });
    stack.appendChild(lg);
    var tiles = [];
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var t = en.target._t; t.vis = true; io.unobserve(en.target); paint(t);
      });
    }, { rootMargin: '80px' }) : null;
    function miniKey(id) {
      var c = cfg(), l = c.look;
      return [id, l.theme, JSON.stringify(l.colors || {}), l.subjectColors, l.headStyle].join('|');
    }
    function mini(id) {
      var c = TKB.storage.defaultConfig(), cur = cfg();
      c.size = { w: 3, h: 4 };
      var s = c.data.sessions[0];
      s.days = s.days.slice(0, 3);
      c.data.sessions = [s];
      c.look = Object.assign(clone(cur.look), { layout: id, showTitle: true });
      c.bg = Object.assign(clone(c.bg), { type: 'color', color: eff(cur).bg });
      c.place = { cx: 0.5, cy: 0.5, width: 0.94 };
      return TKB.storage.normalize(c);
    }
    function paint(t) {
      if (!t.vis) return;
      var k = miniKey(t.id);
      if (t.key === k) return;
      if (t.busy) { t.dirty = true; return; }
      t.busy = true; t.key = k;
      Promise.resolve().then(function () { return TKB.render(t.cv, mini(t.id), { width: 120 }); })
        .catch(function () { t.key = null; })
        .then(function () { t.busy = false; if (t.dirty) { t.dirty = false; paint(t); } });
    }
    (TKB.render.layouts || []).forEach(function (L) {
      var cv = h('canvas', { width: 120, height: 160 });
      var b = h('button', { type: 'button', class: 'tile', title: L.hint || L.name, 'aria-pressed': 'false', onclick: function () { TKB.ui.update(function (c) { c.look.layout = L.id; }); } },
        [cv, h('span', { class: 'p-look-cap', text: L.name })]);
      var t = { id: L.id, cv: cv, btn: b, vis: !io };
      b._t = t; tiles.push(t); lg.appendChild(b);
      if (io) io.observe(b);
    });
    refs.push(function () {
      var cur = cfg().look.layout;
      tiles.forEach(function (t) { t.btn.classList.toggle('is-on', t.id === cur); t.btn.setAttribute('aria-pressed', t.id === cur); paint(t); });
    });

    // Themes
    head('Bảng màu');
    var tg = h('div', { class: 'p-look-grid' });
    stack.appendChild(tg);
    var themeBtns = TKB.themes.list.map(function (th) {
      var cols = [th.bg, th.panel, th.head, th.ink].concat((th.accents || []).slice(0, 2));
      var strip = h('div', { class: 'p-look-strip' }, cols.map(function (c) { var i = h('i'); i.style.background = c; return i; }));
      var b = h('button', { type: 'button', class: 'tile', 'aria-pressed': 'false', onclick: function () {
        TKB.ui.update(function (c) { c.look.theme = th.id; c.look.colors = {}; });
      } }, [strip, h('span', { class: 'p-look-cap', text: th.name })]);
      tg.appendChild(b); return b;
    });
    refs.push(function () {
      var cur = cfg().look.theme;
      themeBtns.forEach(function (b, i) { var on = TKB.themes.list[i].id === cur; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
    });

    // Colour overrides
    head('Chỉnh màu');
    [['bg', 'Nền'], ['panel', 'Khung'], ['ink', 'Chữ'], ['head', 'Tiêu đề cột'], ['headInk', 'Chữ tiêu đề']].forEach(function (k) {
      var inp = h('input', { type: 'color', 'aria-label': k[1] });
      inp.addEventListener('input', function () {
        TKB.ui.update(function (c) { c.look.colors = c.look.colors || {}; c.look.colors[k[0]] = inp.value; }, { key: 'color-' + k[0] });
      });
      var rs = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: 'Đặt lại', onclick: function () {
        TKB.ui.update(function (c) { if (c.look.colors) delete c.look.colors[k[0]]; });
      } });
      stack.appendChild(h('div', { class: 'row p-look-col' }, [h('span', { class: 'label', text: k[1] }), inp, rs]));
      refs.push(function () {
        var c = cfg(); inp.value = hex(eff(c)[k[0]]);
        rs.disabled = !(c.look.colors && c.look.colors[k[0]]);
      });
    });

    head('Kiểu dáng');
    add(seg('Màu môn học', [['auto', 'Mỗi môn 1 màu'], ['head', 'Theo buổi'], ['none', 'Không']], function (c) { return c.look.subjectColors; }, function (c, v) { c.look.subjectColors = v; }));
    add(seg('Đổ bóng', [['hard', 'Cứng'], ['soft', 'Mềm'], ['none', 'Không']], function (c) { return c.look.shadow; }, function (c, v) { c.look.shadow = v; }));
    add(seg('Kiểu tiêu đề cột', [['filled', 'Đặc'], ['pill', 'Viên thuốc'], ['underline', 'Gạch chân']], function (c) { return c.look.headStyle; }, function (c, v) { c.look.headStyle = v; }));
    add(seg('Hiệu ứng chữ', [['none', 'Không'], ['shadow', 'Bóng'], ['outline', 'Viền'], ['halo', 'Quầng'], ['bloom', 'Toả sáng']], function (c) { return c.look.textEffect; }, function (c, v) { c.look.textEffect = v; }));

    var bsl = slider('Độ toả sáng', 0, 1, 0.05, function (c) { return c.look.bloom == null ? 0.6 : c.look.bloom; }, function (c, v) { c.look.bloom = v; }, 'look-bloom', function (v) { return Math.round(v * 100) + '%'; });
    stack.appendChild(bsl.el); refs.push(function () { bsl.refresh(); bsl.el.hidden = cfg().look.textEffect !== 'bloom'; });

    var px = function (v) { return v + 'px'; };
    [['radius', 'Bo góc', 0, 32, 1, px], ['gap', 'Khoảng cách ô', 0, 24, 1, px], ['borderWidth', 'Độ dày viền', 0, 6, 1, px],
     ['panelOpacity', 'Độ đặc của khung', 0, 1, 0.01, function (v) { return Math.round(v * 100) + '%'; }],
     ['panelBlur', 'Làm mờ nền dưới khung', 0, 30, 1, px]].forEach(function (s) {
      add(slider(s[1], s[2], s[3], s[4], function (c) { return c.look[s[0]]; }, function (c, v) { c.look[s[0]] = v; }, 'look-' + s[0], s[5]));
    });

    head('Hiển thị');
    [['showTitle', 'Hiện tiêu đề'], ['showTimes', 'Hiện giờ học'], ['showPeriodNumbers', 'Hiện số tiết'], ['upper', 'Chữ IN HOA']].forEach(function (s) {
      add(sw(s[1], function (c) { return c.look[s[0]]; }, function (c, v) { c.look[s[0]] = v; }));
    });

    function refreshAll() { refs.forEach(function (f) { f(); }); }
    TKB.ui.on('change', refreshAll);
    TKB.ui.on('load', refreshAll);
    try { refreshAll(); } catch (e) { /* config not ready yet */ }
  }

  var FONT_CSS =
    '.p-font-pick{display:flex;flex-direction:column;gap:8px}' +
    '.p-font-cur{font-weight:700}' +
    '.p-font-list{max-height:260px;overflow:auto;border:2px solid var(--line);border-radius:8px;background:var(--paper)}' +
    '.p-font-grp{position:sticky;top:0;background:var(--paper-2);color:var(--ink-soft);font-size:12px;font-weight:700;padding:4px 10px}' +
    '.p-font-row{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;min-height:44px;padding:6px 10px;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--ink);text-align:left;cursor:pointer;font-family:var(--font-ui)}' +
    '.p-font-row.is-on{background:var(--accent);color:#fff}' +
    '.p-font-name{font-size:12px;opacity:.8}.p-font-sample{font-size:18px;line-height:1.3}' +
    '.p-font-cust{align-items:center;justify-content:space-between;gap:8px}';

  function mountFont(root) {
    addStyle(FONT_CSS);
    var shared = false, refs = [], pickers = [], loaded = {};
    function fam(w) { return cfg().look.fonts[w]; }
    try { shared = fam('title') === fam('body'); } catch (e) { /* not ready */ }

    function setFont(which, family) {
      TKB.ui.update(function (c) {
        var f = c.look.fonts;
        function put(w) { f[w] = family; f[w + 'Weight'] = TKB.fonts.nearestWeight(family, f[w + 'Weight']); }
        put(which);
        if (which === 'title' && shared) put('body');
      });
    }

    function picker(which, label) {
      var cur = h('div', { class: 'p-font-cur' });
      var search = h('input', { class: 'input', type: 'search', placeholder: 'Tìm font…', 'aria-label': 'Tìm font ' + label });
      var list = h('div', { class: 'p-font-list' });
      var chips = h('div', { class: 'row' });
      var pick = h('div', { class: 'stack' }, [search, list]);
      var wrap = h('div', { class: 'card stack' }, [h('div', { class: 'label', text: label }), cur, pick, h('div', { class: 'label', text: 'Độ đậm' }), chips]);
      var io = null;
      function build() {
        if (io) io.disconnect();
        list.innerHTML = '';
        io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
          es.forEach(function (en) {
            if (!en.isIntersecting) return;
            io.unobserve(en.target);
            var f = en.target.dataset.family, s = en.target.querySelector('.p-font-sample');
            TKB.fonts.load(f).then(function () { loaded[f] = true; s.style.fontFamily = TKB.fonts.stack(f); });
          });
        }, { root: list, rootMargin: '120px' }) : null;
        var q = norm(search.value.trim()), groups = {}, order = [];
        TKB.fonts.all().forEach(function (f) {
          if (q && norm(f.family).indexOf(q) < 0) return;
          if (!groups[f.group]) { groups[f.group] = []; order.push(f.group); }
          groups[f.group].push(f);
        });
        if (!order.length) list.appendChild(h('div', { class: 'empty', text: 'Không tìm thấy font.' }));
        order.forEach(function (g) {
          list.appendChild(h('div', { class: 'p-font-grp', text: g }));
          groups[g].forEach(function (f) {
            var s = h('span', { class: 'p-font-sample', text: 'Thời khoá biểu ăâêôơư' });
            if (loaded[f.family]) s.style.fontFamily = TKB.fonts.stack(f.family);
            var b = h('button', { type: 'button', class: 'p-font-row', 'data-family': f.family, onclick: function () { setFont(which, f.family); } },
              [h('span', { class: 'p-font-name', text: f.family }), s]);
            list.appendChild(b);
            if (io && !loaded[f.family]) io.observe(b); else if (!io) TKB.fonts.load(f.family).then(function () { s.style.fontFamily = TKB.fonts.stack(f.family); });
          });
        });
        mark();
      }
      function mark() {
        var c = fam(which);
        Array.prototype.forEach.call(list.querySelectorAll('.p-font-row'), function (b) { b.classList.toggle('is-on', b.dataset.family === c); });
      }
      var t;
      search.addEventListener('input', function () { clearTimeout(t); t = setTimeout(build, 120); });
      function refresh() {
        var c = cfg(), f = c.look.fonts, family = f[which], w = f[which + 'Weight'];
        cur.textContent = family + ' · ' + w;
        mark();
        pick.style.display = (which === 'body' && shared) ? 'none' : '';
        chips.innerHTML = '';
        var info = TKB.fonts.all().filter(function (x) { return x.family === family; })[0];
        ((info && info.weights) || []).forEach(function (wt) {
          chips.appendChild(h('button', { type: 'button', class: 'chip' + (wt === w ? ' is-on' : ''), text: String(wt), 'aria-pressed': wt === w ? 'true' : 'false', onclick: function () {
            TKB.ui.update(function (cc) { cc.look.fonts[which + 'Weight'] = wt; });
          } }));
        });
      }
      refs.push(refresh);
      pickers.push(build);
      build();
      return wrap;
    }

    root.appendChild(h('h2', { class: 'p-title', text: 'Chữ' }));
    var stack = h('div', { class: 'stack' });
    root.appendChild(stack);
    var shInp = h('input', { type: 'checkbox' });
    shInp.addEventListener('change', function () {
      shared = shInp.checked;
      if (shared) TKB.ui.update(function (c) {
        var f = c.look.fonts; f.body = f.title; f.bodyWeight = TKB.fonts.nearestWeight(f.title, f.bodyWeight);
      }); else refreshAll();
    });
    stack.appendChild(h('div', { class: 'row p-look-sw' }, [h('span', { class: 'label', text: 'Dùng chung 1 font' }), h('label', { class: 'switch' }, [shInp, h('span')])]));
    stack.appendChild(picker('title', 'Tiêu đề'));
    stack.appendChild(picker('body', 'Nội dung'));

    var sc = slider('Cỡ chữ', 0.7, 1.4, 0.05, function (c) { return c.look.textScale; }, function (c, v) { c.look.textScale = v; }, 'look-textScale', function (v) { return Math.round(v * 100) + '%'; });
    stack.appendChild(sc.el); refs.push(sc.refresh);

    // Custom fonts
    stack.appendChild(h('div', { class: 'divider' }));
    stack.appendChild(h('div', { class: 'label', text: 'Font của bạn' }));
    var file = h('input', { type: 'file', accept: '.ttf,.otf,.woff,.woff2', hidden: true });
    var upBtn = h('button', { type: 'button', class: 'btn', text: 'Tải font lên', onclick: function () { file.click(); } });
    var custBox = h('div', { class: 'stack' });
    stack.appendChild(upBtn); stack.appendChild(file); stack.appendChild(custBox);
    function renderCustom() {
      custBox.innerHTML = '';
      var cl = TKB.fonts.custom || [];
      if (!cl.length) { custBox.appendChild(h('div', { class: 'hint', text: 'Hỗ trợ .ttf, .otf, .woff, .woff2, tối đa 8 MB.' })); return; }
      cl.forEach(function (f) {
        custBox.appendChild(h('div', { class: 'row p-font-cust' }, [h('span', { text: f.family }),
          h('button', { type: 'button', class: 'btn btn-danger btn-sm', text: 'Xoá', onclick: function () {
            TKB.ui.confirm('Xoá font "' + f.family + '"?').then(function (ok) {
              if (!ok) return;
              return TKB.fonts.removeCustom(f.family).then(function () {
                TKB.ui.update(function (c) {
                  var ft = c.look.fonts;
                  if (ft.title === f.family) ft.title = 'Be Vietnam Pro';
                  if (ft.body === f.family) ft.body = 'Be Vietnam Pro';
                });
                pickers.forEach(function (b) { b(); }); renderCustom(); refreshAll();
              });
            }).catch(function (e) { TKB.ui.toast((e && e.message) || 'Không xoá được font.', 'error'); });
          } })]));
      });
    }
    file.addEventListener('change', function () {
      var f = file.files && file.files[0]; file.value = '';
      if (!f) return;
      upBtn.disabled = true;
      TKB.fonts.addCustom(f).then(function (r) {
        pickers.forEach(function (b) { b(); }); renderCustom();
        setFont('title', r.family);
        TKB.ui.toast('Đã thêm font ' + r.family, 'ok');
      }).catch(function (e) { TKB.ui.toast((e && e.message) || 'Không thêm được font.', 'error'); })
        .then(function () { upBtn.disabled = false; });
    });

    function refreshAll() {
      shInp.checked = shared;
      refs.forEach(function (f) { f(); });
    }
    TKB.ui.on('change', function () {
      var f = cfg().look.fonts;
      if (shared && f.title !== f.body) shared = false;
      refreshAll();
    });
    TKB.ui.on('load', function () { shared = fam('title') === fam('body'); pickers.forEach(function (b) { b(); }); renderCustom(); refreshAll(); });
    renderCustom();
    try { refreshAll(); } catch (e) { /* config not ready yet */ }
  }

  TKB.ui.registerPanel({ id: 'look', title: 'Kiểu', order: 3,
    icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>',
    mount: mountLook });
  TKB.ui.registerPanel({ id: 'font', title: 'Chữ', order: 4,
    icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20 10 4l6 16M6.5 14h7M17 20l3-8 2 8"/></svg>',
    mount: mountFont });
})();
