/* TKB Studio - app shell: state, history, render pipeline, preview, tabs, toast, confirm. */
(function () {
  'use strict';
  var TKB = window.TKB = window.TKB || {};
  var $ = function (id) { return document.getElementById(id); };
  var HISTORY_MAX = 50, COALESCE_MS = 600, SAVE_MS = 800, MAX_PREVIEW = 1600;

  // ---------- shared DOM/data helpers ----------
  TKB.dom = {
    h: function (tag, props, kids) {
      var e = document.createElement(tag), k, v;
      for (k in (props || {})) {
        v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'text') e.textContent = v;
        else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? '' : v);
      }
      (kids || []).forEach(function (c) {
        if (c != null && c !== false) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
      return e;
    },
    clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); },
    clone: function (o) { return JSON.parse(JSON.stringify(o)); },
    setVal: function (el, v) {
      v = v == null ? '' : String(v);
      if (el.value !== v && document.activeElement !== el) el.value = v;
    },
    slug: function (s) {
      return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'tkb';
    },
    cfg: function () { return TKB.ui.get(); },
    upd: function (fn, key) { TKB.ui.update(fn, key ? { key: key } : undefined); }
  };

  var ui = TKB.ui = TKB.ui || {};
  ui.slotId = null;

  var cfg = null, started = false;
  var listeners = { change: [], load: [], rendered: [] };
  var panels = [], mounted = {}, current = null;

  // ---------- helpers ----------
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function emit(evt, a, b) {
    (listeners[evt] || []).slice().forEach(function (fn) {
      try { fn(a, b); } catch (e) { console.error('[TKB.ui] listener', evt, e); }
    });
  }
  function has(path) {
    var o = TKB, p = path.split('.');
    for (var i = 0; i < p.length; i++) { o = o && o[p[i]]; }
    return !!o;
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function fallbackConfig() {
    return { v: 1, name: 'TKB của tôi', size: { w: 9, h: 20 }, data: { title: '', subtitle: '', sessions: [] },
      look: {}, bg: { type: 'color', color: '#F4EFE4' }, place: { cx: 0.5, cy: 0.6, width: 0.92 } };
  }

  // ---------- toast ----------
  ui.toast = function (text, kind) {
    var box = $('toasts'); if (!box) return;
    kind = kind === 'ok' || kind === 'error' ? kind : 'info';
    var t = el('div', 'toast toast-' + kind);
    t.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    t.appendChild(el('span', 'toast-ico', kind === 'ok' ? '✓' : kind === 'error' ? '!' : 'i'));
    t.appendChild(el('span', '', String(text)));
    var gone = false;
    function close() {
      if (gone) return; gone = true; t.classList.add('is-out');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 200);
    }
    t.addEventListener('click', close);
    box.appendChild(t);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(close, kind === 'error' ? 5500 : 3200);
  };
  var lastWarn = {};
  function warnOnce(key, text) {
    var now = Date.now();
    if (lastWarn[key] && now - lastWarn[key] < 8000) return;
    lastWarn[key] = now; ui.toast(text, 'error');
  }

  // ---------- confirm modal ----------
  ui.confirm = function (text) {
    return new Promise(function (resolve) {
      var prev = document.activeElement;
      var back = el('div', 'modal-back');
      var box = el('div', 'modal');
      box.setAttribute('role', 'alertdialog'); box.setAttribute('aria-modal', 'true');
      var p = el('p', '', String(text)); p.id = 'modal-msg';
      box.setAttribute('aria-describedby', 'modal-msg');
      var acts = el('div', 'modal-actions');
      var no = el('button', 'btn btn-ghost', 'Huỷ'); no.type = 'button';
      var yes = el('button', 'btn btn-primary', 'Đồng ý'); yes.type = 'button';
      acts.appendChild(no); acts.appendChild(yes); box.appendChild(p); box.appendChild(acts); back.appendChild(box);
      document.body.appendChild(back);
      var app = $('app'); if (app) app.setAttribute('aria-hidden', 'true');
      function done(v) {
        document.removeEventListener('keydown', onKey, true);
        if (back.parentNode) back.parentNode.removeChild(back);
        if (app) app.removeAttribute('aria-hidden');
        if (prev && prev.focus) { try { prev.focus(); } catch (e) {} }
        resolve(v);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); }
        else if (e.key === 'Tab') {
          e.preventDefault();
          (document.activeElement === yes ? no : yes).focus();
        }
      }
      document.addEventListener('keydown', onKey, true);
      no.addEventListener('click', function () { done(false); });
      yes.addEventListener('click', function () { done(true); });
      back.addEventListener('pointerdown', function (e) { if (e.target === back) done(false); });
      yes.focus();
    });
  };

  // ---------- history ----------
  var hist = [], hidx = -1, lastKey = null, lastAt = 0;
  function pushHistory(key) {
    var s = JSON.stringify(cfg), now = Date.now();
    if (key && key === lastKey && now - lastAt < COALESCE_MS && hidx > 0) {
      hist[hidx] = s;
    } else {
      hist.length = hidx + 1;
      if (hist[hidx] === s) { lastKey = key || null; lastAt = now; return; }
      hist.push(s);
      if (hist.length > HISTORY_MAX + 1) hist.shift();
      hidx = hist.length - 1;
    }
    lastKey = key || null; lastAt = now;
    syncHistoryButtons();
  }
  function syncHistoryButtons() {
    var u = $('undo'), r = $('redo');
    if (u) u.disabled = hidx <= 0;
    if (r) r.disabled = hidx >= hist.length - 1;
  }
  function jump(to) {
    if (to < 0 || to >= hist.length) return;
    hidx = to; cfg = JSON.parse(hist[hidx]); lastKey = null;
    syncHistoryButtons();
    emit('load', cfg);
    scheduleRender(); scheduleSave();
  }
  ui.undo = function () { jump(hidx - 1); };
  ui.redo = function () { jump(hidx + 1); };

  // ---------- public state API ----------
  ui.get = function () { return cfg; };
  ui.update = function (fn, opts) {
    if (!cfg) return;
    var key = opts && opts.key;
    try { fn(cfg); } catch (e) { console.error('[TKB.ui] update', e); ui.toast('Không áp dụng được thay đổi này.', 'error'); return; }
    pushHistory(key);
    emit('change', cfg, key);
    scheduleRender(); scheduleSave();
  };
  ui.load = function (next, opts) {
    var n = next;
    try { if (has('storage.normalize')) n = TKB.storage.normalize(next); } catch (e) { console.error(e); }
    cfg = n; ui.slotId = (opts && opts.slotId) || null;
    pushHistory(null); lastKey = null;
    emit('load', cfg);
    scheduleRender(); scheduleSave();
  };
  ui.on = function (evt, fn) { if (listeners[evt] && typeof fn === 'function') listeners[evt].push(fn); };

  // ---------- autosave ----------
  var saveTimer = 0;
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, SAVE_MS); }
  function flushSave() {
    clearTimeout(saveTimer); saveTimer = 0;
    if (!cfg || !has('storage.autosave')) return;
    try { Promise.resolve(TKB.storage.autosave(clone(cfg))).catch(function () {}); } catch (e) {}
  }

  // ---------- preview: fit + render ----------
  var rafId = 0, token = 0, cv, screen, frame, stage, dragbox, lastBlock = null, lastW = 0, lastH = 0, screenW = 0;

  function fit() {
    if (!stage || !cfg) return;
    var cs = getComputedStyle(stage);
    var aw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var ah = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var s = cfg.size || { w: 9, h: 20 }, ar = (s.w > 0 && s.h > 0) ? s.w / s.h : 0.45;
    var wide = ar > 1;
    frame.classList.toggle('is-wide', wide);
    var pad = wide ? 7 : 8;
    var mw = Math.max(40, aw - pad * 2), mh = Math.max(40, ah - pad * 2);
    var sw = Math.min(mw, mh * ar), sh = sw / ar;
    screen.style.width = Math.round(sw) + 'px';
    screen.style.height = Math.round(sh) + 'px';
    screenW = sw;
  }
  function scheduleRender() { if (!rafId) rafId = requestAnimationFrame(doRender); }

  function updateInfo() {
    var n = $('info'); if (!n || !cfg) return;
    var s = cfg.size || {}, label = '';
    try { var id = has('devices.byRatio') && TKB.devices.byRatio(s); if (id) { var d = TKB.devices.list.filter(function (x) { return x.id === id; })[0]; label = d ? d.label : ''; } } catch (e) {}
    n.textContent = (label || 'Tuỳ chỉnh') + ' · ' + s.w + ':' + s.h + ' · Kéo khối bảng để đổi vị trí · Lăn chuột để phóng to, nháy đúp để về cũ';
  }

  function doRender() {
    rafId = 0;
    if (!cfg) return;
    fit(); updateInfo(); buildGuides();
    if (!has('render') || typeof TKB.render !== 'function') { warnOnce('render', 'Chưa tải được bộ vẽ hình. Hãy tải lại trang.'); return; }
    if (screenW < 8) return;
    var width = clamp(Math.round(screenW * Math.min(window.devicePixelRatio || 1, 2) * vz.z), 120, vz.z > 1 ? 4096 : MAX_PREVIEW);
    var my = ++token, off = document.createElement('canvas');
    var snapshot;
    try { snapshot = clone(cfg); } catch (e) { return; }
    var p;
    try { p = Promise.resolve(TKB.render(off, snapshot, { width: width })); } catch (e) { p = Promise.reject(e); }
    p.then(function (res) {
      if (my !== token) return; // stale
      cv.width = off.width; cv.height = off.height;
      var ctx = cv.getContext('2d'); ctx.drawImage(off, 0, 0);
      cv.classList.remove('is-fresh'); void cv.offsetWidth; cv.classList.add('is-fresh');
      lastW = off.width; lastH = off.height; lastBlock = res && res.block || null;
      placeDragbox();
      emit('rendered', { block: lastBlock });
    }).catch(function (e) {
      if (my !== token) return;
      console.error('[TKB.ui] render', e);
      warnOnce('render', 'Không vẽ được bản xem trước. Hãy thử đổi cài đặt khác.');
    });
  }

  // ---------- drag block ----------
  function placeDragbox(dx, dy) {
    if (!lastBlock || !lastW) { dragbox.hidden = true; return; }
    dragbox.hidden = false;
    var b = lastBlock;
    dragbox.style.left = ((b.x + (dx || 0) * lastW) / lastW * 100) + '%';
    dragbox.style.top = ((b.y + (dy || 0) * lastH) / lastH * 100) + '%';
    dragbox.style.width = (b.w / lastW * 100) + '%';
    dragbox.style.height = (b.h / lastH * 100) + '%';
  }
  function showSnap(sx, sy) { $('snapv').classList.toggle('is-on', !!sx); $('snaph').classList.toggle('is-on', !!sy); }
  function placeOf() { var p = (cfg && cfg.place) || {}; return { cx: p.cx == null ? 0.5 : p.cx, cy: p.cy == null ? 0.6 : p.cy }; }

  // ---------- preview zoom: wheel zooms the whole phone frame around the cursor, drag empty stage to pan ----------
  var vz = { z: 1, x: 0, y: 0 }, vzTimer = 0;
  function vzApply() {
    frame.style.transformOrigin = '0 0';
    frame.style.transform = vz.z === 1 ? '' : 'translate(' + vz.x + 'px,' + vz.y + 'px) scale(' + vz.z + ')';
    stage.classList.toggle('is-zoomed', vz.z > 1);
    clearTimeout(vzTimer); vzTimer = setTimeout(scheduleRender, 180); // sharper canvas after zooming
  }
  function vzReset() { vz.z = 1; vz.x = 0; vz.y = 0; vzApply(); }
  ui.resetPreviewZoom = vzReset;
  function initZoom() {
    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = frame.getBoundingClientRect(), bx = r.left - vz.x, by = r.top - vz.y;
      var lx = (e.clientX - bx - vz.x) / vz.z, ly = (e.clientY - by - vz.y) / vz.z;
      var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      var nz = clamp(vz.z * Math.exp(-dy * 0.0015), 1, 8);
      if (nz < 1.02) { vzReset(); return; }
      vz.x = e.clientX - bx - lx * nz; vz.y = e.clientY - by - ly * nz; vz.z = nz;
      vzApply();
    }, { passive: false });
    var pan = null;
    stage.addEventListener('pointerdown', function (e) {
      if (vz.z === 1 || e.target === dragbox || (e.target.closest && e.target.closest('button'))) return;
      pan = { id: e.pointerId, x: e.clientX - vz.x, y: e.clientY - vz.y };
      try { stage.setPointerCapture(e.pointerId); } catch (er) {}
    });
    stage.addEventListener('pointermove', function (e) {
      if (!pan || e.pointerId !== pan.id) return;
      vz.x = e.clientX - pan.x; vz.y = e.clientY - pan.y;
      frame.style.transform = 'translate(' + vz.x + 'px,' + vz.y + 'px) scale(' + vz.z + ')';
    });
    function endPan() { pan = null; }
    stage.addEventListener('pointerup', endPan); stage.addEventListener('pointercancel', endPan);
    stage.addEventListener('dblclick', function () { vzReset(); });
  }
  function initDrag() {
    var drag = null;
    dragbox.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button > 0) return;
      var r = screen.getBoundingClientRect(); if (!r.width) return;
      var p = placeOf();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: p.cx, cy: p.cy, rw: r.width, rh: r.height };
      try { dragbox.setPointerCapture(e.pointerId); } catch (er) {}
      dragbox.classList.add('is-drag'); dragbox.focus({ preventScroll: true });
      e.preventDefault();
    });
    dragbox.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var cx = clamp(drag.cx + (e.clientX - drag.x) / drag.rw, 0, 1);
      var cy = clamp(drag.cy + (e.clientY - drag.y) / drag.rh, 0, 1);
      var sx = Math.abs(cx - 0.5) < 0.015, sy = Math.abs(cy - 0.5) < 0.015;
      if (sx) cx = 0.5; if (sy) cy = 0.5;
      showSnap(sx, sy);
      placeDragbox(cx - drag.cx, cy - drag.cy);
      ui.update(function (c) { c.place = c.place || {}; c.place.cx = cx; c.place.cy = cy; }, { key: 'place' });
      e.preventDefault();
    });
    function end(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      drag = null; dragbox.classList.remove('is-drag'); showSnap(false, false);
    }
    dragbox.addEventListener('pointerup', end);
    dragbox.addEventListener('pointercancel', end);
    dragbox.addEventListener('lostpointercapture', end);
    dragbox.addEventListener('keydown', function (e) {
      var k = e.key, step = e.shiftKey ? 0.02 : 0.005, dx = 0, dy = 0;
      if (k === 'ArrowLeft') dx = -step; else if (k === 'ArrowRight') dx = step;
      else if (k === 'ArrowUp') dy = -step; else if (k === 'ArrowDown') dy = step; else return;
      e.preventDefault();
      var p = placeOf();
      var cx = clamp(p.cx + dx, 0, 1), cy = clamp(p.cy + dy, 0, 1);
      if (Math.abs(cx - 0.5) < 0.0025) cx = 0.5; if (Math.abs(cy - 0.5) < 0.0025) cy = 0.5;
      ui.update(function (c) { c.place = c.place || {}; c.place.cx = cx; c.place.cy = cy; }, { key: 'place' });
    });
  }

  // ---------- guides overlay (DOM only, never exported) ----------
  var guidesOn = false, guideSig = '';
  function buildGuides() {
    var g = $('guides'); if (!g) return;
    g.hidden = !guidesOn;
    var s = cfg && cfg.size || { w: 9, h: 20 };
    var phone = s.w < s.h && s.h / s.w >= 1.7;
    var sig = guidesOn + '|' + phone;
    if (sig === guideSig) return; guideSig = sig;
    g.textContent = '';
    if (!guidesOn) return;
    function line(cls, pos) {
      var d = el('div', 'g ' + cls);
      if (cls.indexOf('g-v') >= 0) d.style.left = pos + '%'; else d.style.top = pos + '%';
      g.appendChild(d);
    }
    line('g-v', 100 / 3); line('g-v', 200 / 3); line('g-h', 100 / 3); line('g-h', 200 / 3);
    line('g-v g-c', 50); line('g-h g-c', 50);
    if (phone) {
      var z1 = el('div', 'g g-zone'); z1.style.cssText = 'left:8%;right:8%;top:7%;height:24%';
      z1.appendChild(el('span', '', 'Đồng hồ màn hình khoá'));
      var z2 = el('div', 'g g-zone'); z2.style.cssText = 'left:8%;right:8%;bottom:3%;height:9%';
      z2.appendChild(el('span', '', 'Phím tắt'));
      g.appendChild(z1); g.appendChild(z2);
    }
  }
  ui.setGuides = function (on) {
    guidesOn = !!on; guideSig = '';
    var b = $('guidebtn'); if (b) b.setAttribute('aria-pressed', String(guidesOn));
    lsSet('tkb.guides', guidesOn ? '1' : '0');
    buildGuides();
  };

  // ---------- thumbnail ----------
  ui.thumbnail = function () {
    return new Promise(function (resolve, reject) {
      if (!cfg || !has('render') || typeof TKB.render !== 'function') { reject(new Error('Chưa tải được bộ vẽ hình.')); return; }
      var c = document.createElement('canvas');
      Promise.resolve(TKB.render(c, clone(cfg), { width: 240 })).then(function () {
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('Không tạo được ảnh thu nhỏ.')); }, 'image/jpeg', 0.82);
      }).catch(function (e) { reject(e instanceof Error ? e : new Error('Không tạo được ảnh thu nhỏ.')); });
    });
  };

  // ---------- panels + tabs ----------
  var DEFAULT_ICONS = {
    data: '<rect x="3.500" y="5" width="17" height="15" rx="2.500"/><path d="M3.500 10h17M8 3v4M16 3v4M8.500 14.500h2M13.500 14.500h2"/>',
    bg: '<rect x="3.500" y="4.500" width="17" height="15" rx="2.500"/><circle cx="9" cy="10" r="1.600"/><path d="M4 17l5-4.500 3.500 3L15 13l5 4.500"/>',
    look: '<path d="M12 3.500c-5 0-8.500 3.400-8.500 8 0 4.300 3.100 7.500 7.200 7.500 1.700 0 2.200-1 1.600-2.100-.6-1.200.1-2.400 1.500-2.400H17c2 0 3.500-1.200 3.500-3.200C20.500 6.200 16.800 3.500 12 3.500z"/><circle cx="8" cy="11" r="1"/><circle cx="11.500" cy="7.500" r="1"/><circle cx="16" cy="9" r="1"/>',
    font: '<path d="M3.500 19L9.500 5l6 14M5.800 14.500h7.400"/><path d="M18.500 10v9M16.500 10h4"/>',
    place: '<path d="M12 3v18M3 12h18M12 3l-2.500 2.500M12 3l2.500 2.500M12 21l-2.500-2.500M12 21l2.500-2.500M3 12l2.500-2.500M3 12l2.500 2.500M21 12l-2.500-2.500M21 12l-2.500 2.500"/>',
    save: '<path d="M5 3.500h11l3.500 3.500v12.500a1.500 1.500 0 01-1.500 1.500H5a1.500 1.500 0 01-1.500-1.500V5A1.500 1.500 0 015 3.500z"/><path d="M8 3.500v5h7v-5M7.500 20.500v-6h9v6"/>'
  };
  function iconSvg(p) {
    if (p.icon && String(p.icon).indexOf('<svg') >= 0) return p.icon;
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (p.icon || DEFAULT_ICONS[p.id] || DEFAULT_ICONS.data) + '</svg>';
  }

  // ---------- basic / advanced mode ----------
  var ADV_ONLY = { bg: 1, look: 1, font: 1, place: 1 };
  ui.mode = lsGet('tkb.mode') === 'adv' ? 'adv' : 'basic';
  function visible(p) { return ui.mode === 'adv' || !ADV_ONLY[p.id]; }
  ui.setMode = function (m) {
    ui.mode = m === 'adv' ? 'adv' : 'basic';
    lsSet('tkb.mode', ui.mode);
    document.documentElement.setAttribute('data-mode', ui.mode);
    Array.prototype.forEach.call(document.querySelectorAll('[data-set-mode]'), function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-set-mode') === ui.mode));
    });
    panels.forEach(function (p) { var t = $('tab-' + p.id); if (t) t.hidden = !visible(p); });
    var cur = panels.filter(function (p) { return p.id === current; })[0];
    if (cur && !visible(cur)) ui.openPanel('style');
  };

  ui.registerPanel = function (p) {
    if (!p || !p.id || typeof p.mount !== 'function') return;
    panels = panels.filter(function (x) { return x.id !== p.id; });
    panels.push(p);
    panels.sort(function (a, b) { return (a.order || 99) - (b.order || 99); });
    if (started) { if (!current) current = p.id; buildTabs(); mountPanel(p); }
  };

  function buildTabs() {
    var rail = $('rail'); if (!rail) return;
    rail.textContent = '';
    panels.forEach(function (p) {
      var b = el('button', 'tab'); b.type = 'button'; b.id = 'tab-' + p.id; b.hidden = !visible(p);
      b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'panel-' + p.id);
      b.setAttribute('aria-selected', String(p.id === current)); b.tabIndex = p.id === current ? 0 : -1;
      var ic = el('span', 'tab-ico'); ic.setAttribute('aria-hidden', 'true'); ic.innerHTML = iconSvg(p);
      b.appendChild(ic); b.appendChild(el('span', 'tab-label', p.short || p.title || p.id)); if (p.short) b.title = p.title;
      b.addEventListener('click', function () { ui.openPanel(p.id); });
      rail.appendChild(b);
    });
  }

  function mountPanel(p) {
    if (mounted[p.id]) return;
    var host = $('panels'); if (!host) return;
    var sec = el('section', 'panel'); sec.id = 'panel-' + p.id; sec.setAttribute('role', 'tabpanel');
    sec.setAttribute('aria-labelledby', 'tab-' + p.id); sec.hidden = p.id !== current;
    var root = el('div', 'panel-root'); sec.appendChild(root); host.appendChild(sec);
    mounted[p.id] = { sec: sec, root: root, shown: false };
    try { p.mount(root); }
    catch (e) {
      console.error('[TKB.ui] panel', p.id, e);
      root.appendChild(el('div', 'empty', 'Mục này tạm thời chưa dùng được. Hãy tải lại trang.'));
      ui.toast('Không mở được mục "' + (p.title || p.id) + '".', 'error');
    }
    if (p.id === current) revealPanel(p.id);
  }

  function revealPanel(id) {
    var m = mounted[id]; if (!m) return;
    m.sec.classList.add('is-enter'); setTimeout(function () { m.sec.classList.remove('is-enter'); }, 260);
    if (!m.shown) {
      m.shown = true;
      Array.prototype.forEach.call(m.root.children, function (c, i) { c.style.setProperty('--i', Math.min(i, 14)); });
      m.sec.classList.add('is-first');
      setTimeout(function () { m.sec.classList.remove('is-first'); }, 700);
    }
  }

  ui.openPanel = function (id) {
    if (!panels.some(function (p) { return p.id === id; })) return;
    var changed = id !== current; current = id; lsSet('tkb.tab', id);
    panels.forEach(function (p) {
      var t = $('tab-' + p.id), m = mounted[p.id], on = p.id === id;
      if (t) { t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; }
      if (m) m.sec.hidden = !on;
    });
    var host = $('panels'); if (host) host.scrollTop = 0;
    if (changed) revealPanel(id);
    else if (mounted[id]) { mounted[id].sec.hidden = false; }
  };

  function initTabKeys() {
    var rail = $('rail'), mq = window.matchMedia ? matchMedia('(min-width: 960px), (orientation: landscape) and (max-height: 560px)') : null;
    function orient() { rail.setAttribute('aria-orientation', mq && mq.matches ? 'vertical' : 'horizontal'); }
    orient(); if (mq && mq.addEventListener) mq.addEventListener('change', orient);
    rail.addEventListener('keydown', function (e) {
      var tabs = Array.prototype.slice.call(rail.querySelectorAll('[role="tab"]:not([hidden])'));
      var i = tabs.indexOf(document.activeElement); if (i < 0) return;
      var n = i, k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown') n = (i + 1) % tabs.length;
      else if (k === 'ArrowLeft' || k === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
      else if (k === 'Home') n = 0; else if (k === 'End') n = tabs.length - 1; else return;
      e.preventDefault(); tabs[n].focus(); tabs[n].click();
    });
  }

  // ---------- keyboard ----------
  function isTextEntry(t) {
    if (!t || !t.tagName) return false;
    if (t.isContentEditable || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return true;
    if (t.tagName === 'INPUT') return ['range', 'checkbox', 'radio', 'button', 'color', 'file'].indexOf(t.type) < 0;
    return false;
  }
  function initKeys() {
    document.addEventListener('keydown', function (e) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || isTextEntry(e.target)) return;
      if (document.querySelector('.modal-back')) return;
      var k = (e.key || '').toLowerCase();
      if (k === 'z') { e.preventDefault(); e.shiftKey ? ui.redo() : ui.undo(); }
      else if (k === 'y') { e.preventDefault(); ui.redo(); }
    });
  }

  // ---------- startup ----------
  function start() {
    cv = $('cv'); screen = $('screen'); frame = $('frame'); stage = $('stage'); dragbox = $('dragbox'); initZoom();
    $('undo').addEventListener('click', ui.undo);
    $('redo').addEventListener('click', ui.redo);
    $('dl').addEventListener('click', function () { ui.openPanel('save'); if (window.innerWidth < 960) { var r = $('rail'); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'nearest' }); } });
    $('guidebtn').addEventListener('click', function () { ui.setGuides(!guidesOn); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-set-mode]'), function (b) {
      b.addEventListener('click', function () {
        var m = b.getAttribute('data-set-mode');
        if (m === ui.mode) return;
        ui.setMode(m);
        ui.toast(m === 'adv' ? 'Chế độ nâng cao: chỉnh được mọi chi tiết.' : 'Chế độ cơ bản: chọn mẫu là xong.', 'info');
      });
    });
    var big = $('bigbtn');
    if (big) big.addEventListener('click', function () {
      var on = !$('app').classList.contains('is-big');
      $('app').classList.toggle('is-big', on); big.setAttribute('aria-pressed', String(on));
    });
    initDrag(); initTabKeys(); initKeys();
    if (window.ResizeObserver) new ResizeObserver(scheduleRender).observe(stage);
    else window.addEventListener('resize', scheduleRender);
    document.addEventListener('visibilitychange', function () { if (document.hidden) flushSave(); });
    window.addEventListener('pagehide', flushSave);

    var chain = Promise.resolve();
    if (has('fonts.initCustom')) chain = Promise.resolve().then(function () { return TKB.fonts.initCustom(); }).catch(function () {});
    chain.then(function () {
      if (!has('storage.loadAutosave')) return null;
      return TKB.storage.loadAutosave();
    }).catch(function () { return null; }).then(function (saved) {
      var base = saved;
      if (!base) { try { base = has('storage.defaultConfig') ? TKB.storage.defaultConfig() : fallbackConfig(); } catch (e) { base = fallbackConfig(); } }
      try { cfg = has('storage.normalize') ? TKB.storage.normalize(base) : base; } catch (e) { cfg = fallbackConfig(); }
      if (!has('storage')) ui.toast('Chưa tải được bộ lưu trữ. Dữ liệu sẽ không được lưu.', 'error');
      hist = [JSON.stringify(cfg)]; hidx = 0; syncHistoryButtons();
      current = lsGet('tkb.tab');
      var curP = panels.filter(function (p) { return p.id === current; })[0];
      if (!curP || !visible(curP)) current = panels.some(function (p) { return p.id === 'style'; }) && !lsGet('tkb.tab') ? 'style' : (panels.length ? panels[0].id : null);
      started = true;
      buildTabs();
      ui.setMode(ui.mode);
      panels.forEach(mountPanel);
      if (!panels.length) ui.toast('Chưa tải được các mục chỉnh sửa. Hãy tải lại trang.', 'error');
      ui.setGuides(lsGet('tkb.guides') === '1');
      emit('load', cfg);
      scheduleRender();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
