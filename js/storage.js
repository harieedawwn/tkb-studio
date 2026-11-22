/* TKB Studio - storage.js: config defaults/normalize, IndexedDB persistence, images, .tkb.json import/export. */
(function () {
  'use strict';
  var TKB = (window.TKB = window.TKB || {});

  var DB_NAME = 'tkb-studio';
  var DB_VER = 1;
  var STORES = ['slots', 'images', 'autosave'];
  var LS_PREFIX = 'tkb-studio:';
  var MAX_IMPORT_BYTES = 40 * 1024 * 1024;

  var ERR_IMG = 'Không đọc được ảnh này. Hãy chọn ảnh PNG, JPEG hoặc WebP khác.';

  /* ---------- Subjects ---------- */
  TKB.subjects = [
    'TOÁN', 'VĂN', 'ANH', 'LÝ', 'HOÁ', 'SINH', 'SỬ', 'ĐỊA', 'GDCD', 'GDKT&PL', 'GDQP', 'TIN', 'CN',
    'HĐTN', 'SHL', 'SHDC', 'THỂ DỤC', 'ÂM NHẠC', 'MĨ THUẬT', 'KHTN', 'KHXH', 'LS&ĐL', 'NGỮ VĂN',
    'TIẾNG ANH', 'PHÁP', 'NGA', 'NHẬT', 'HÀN', 'TRUNG', 'ĐỊA PHƯƠNG', 'CHUYÊN ĐỀ', 'TỰ CHỌN', 'ÔN TẬP'
  ];

  /* ---------- Small helpers ---------- */
  var DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN', 'Thứ 8'];
  var LAYOUTS = ['grid', 'cards', 'rows', 'plain', 'notes', 'planner', 'bento', 'editorial', 'swiss', 'mono'];
  var SUBJECT_COLORS = ['auto', 'head', 'none'];
  var SHADOWS = ['hard', 'soft', 'none'];
  var HEAD_STYLES = ['filled', 'pill', 'underline'];
  var TEXT_EFFECTS = ['none', 'shadow', 'outline', 'halo', 'bloom'];
  var BG_TYPES = ['color', 'pattern', 'image'];
  var PATTERN_IDS = ['dots', 'grid', 'lines', 'checker', 'specks', 'waves', 'confetti', 'blocks', 'plus', 'diagonal', 'scales', 'terrazzo'];
  var COLOR_KEYS = ['bg', 'panel', 'ink', 'inkSoft', 'line', 'head', 'headInk'];
  var DEFAULT_FONT = 'Be Vietnam Pro';

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  function num(v, def, lo, hi) {
    if (typeof v === 'string' && v.trim() !== '') v = Number(v);
    if (typeof v !== 'number' || !isFinite(v)) v = def;
    return Math.min(hi, Math.max(lo, v));
  }

  function int(v, def, lo, hi) { return Math.round(num(v, def, lo, hi)); }

  function str(v, def, max) {
    if (typeof v === 'number' && isFinite(v)) v = String(v);
    if (typeof v !== 'string') return def;
    v = v.replace(/[\u0000-\u001f\u007f]/g, ' ');
    return v.length > max ? v.slice(0, max) : v;
  }

  function pick(v, list, def) { return list.indexOf(v) >= 0 ? v : def; }

  function bool(v, def) { return typeof v === 'boolean' ? v : def; }

  function hex(v, def) {
    if (typeof v !== 'string') return def;
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v.trim());
    if (!m) return def;
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return '#' + h.toUpperCase();
  }

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function themeOk(id) {
    if (typeof id !== 'string' || !id) return false;
    try {
      if (TKB.themes && TKB.themes.get) { var t = TKB.themes.get(id); return !!t && t.id === id; }
    } catch (e) { /* fall through */ }
    return /^[\w-]{1,40}$/.test(id);
  }

  function fontOk(f) {
    if (typeof f !== 'string' || !f) return false;
    try {
      if (TKB.fonts && TKB.fonts.all) {
        return TKB.fonts.all().some(function (x) { return x.family === f; });
      }
    } catch (e) { /* fall through */ }
    return /^[\w \-]{1,60}$/.test(f);
  }

  function patternIds() {
    try {
      if (TKB.patterns && TKB.patterns.list && TKB.patterns.list.length) {
        return TKB.patterns.list.map(function (p) { return p.id; });
      }
    } catch (e) { /* fall through */ }
    return PATTERN_IDS;
  }

  function weight(v, def, family) {
    var w = Math.round(num(v, def, 100, 900) / 100) * 100;
    try {
      if (TKB.fonts && TKB.fonts.nearestWeight) {
        var n = TKB.fonts.nearestWeight(family, w);
        if (typeof n === 'number' && isFinite(n)) w = n;
      }
    } catch (e) { /* keep w */ }
    return w;
  }

  /* ---------- Default config ---------- */
  function defaultConfig() {
    function day(label, cells) { return { label: label, cells: cells }; }
    return {
      v: 1,
      name: 'TKB của tôi',
      size: { w: 9, h: 20 },
      data: {
        title: 'Thời khoá biểu',
        subtitle: 'Lớp 12A1 · Học kỳ 1',
        sessions: [
          {
            id: 's1', label: 'Buổi sáng', periods: 5,
            times: ['7:00', '7:50', '8:50', '9:40', '10:30'],
            days: [
              day('Thứ 2', ['HĐTN', 'TOÁN', 'TOÁN', 'VĂN', 'ANH']),
              day('Thứ 3', ['VĂN', 'LÝ', 'HOÁ', 'TOÁN', 'GDQP']),
              day('Thứ 4', ['ANH', 'TOÁN', 'SINH', 'SỬ', 'TIN']),
              day('Thứ 5', ['HOÁ', 'LÝ', 'VĂN', 'ĐỊA', 'THỂ DỤC']),
              day('Thứ 6', ['TOÁN', 'ANH', 'SINH', 'GDCD', 'CN']),
              day('Thứ 7', ['VĂN', 'SỬ', 'ĐỊA', 'ANH', 'SHL'])
            ]
          },
          {
            id: 's2', label: 'Buổi chiều', periods: 5,
            times: ['13:00', '13:50', '14:50', '15:40', '16:30'],
            days: [
              day('Thứ 2', ['TIN', 'ANH', '', '', '']),
              day('Thứ 3', ['THỂ DỤC', 'SINH', 'TOÁN', '', '']),
              day('Thứ 4', ['VĂN', 'HOÁ', '', '', '']),
              day('Thứ 5', ['LÝ', 'ÂM NHẠC', 'MĨ THUẬT', '', ''])
            ]
          }
        ]
      },
      look: {
        layout: 'planner', theme: 'matcha', colors: {}, subjectColors: 'auto',
        fonts: { title: 'Phudu', body: 'Lexend', titleWeight: 700, bodyWeight: 500 },
        textScale: 1, radius: 20, gap: 8, borderWidth: 0, shadow: 'soft',
        panelOpacity: 0.95, panelBlur: 0, headStyle: 'filled', textEffect: 'none', bloom: 0.6,
        showTitle: true, showTimes: true, showPeriodNumbers: true, upper: false
      },
      bg: {
        type: 'pattern', color: '#DCE3C8',
        pattern: { id: 'dots', color: '#CFD8B6', scale: 1.2 },
        image: { ref: null, zoom: 1, x: 0.5, y: 0.5, blur: 0, dim: 0, brightness: 1, gray: false }
      },
      place: { cx: 0.5, cy: 0.56, width: 0.9, zoom: 1, preset: 'm' }
    };
  }

  /* ---------- Normalize ---------- */
  function normSession(raw, index, usedIds) {
    var r = isObj(raw) ? raw : {};
    var rawDays = Array.isArray(r.days) ? r.days.filter(isObj).slice(0, 8) : [];
    var guess = 5;
    if (rawDays.length && Array.isArray(rawDays[0].cells) && rawDays[0].cells.length) guess = rawDays[0].cells.length;
    else if (Array.isArray(r.times) && r.times.length) guess = r.times.length;
    var periods = int(r.periods, guess, 1, 12);

    var id = str(r.id, '', 24).replace(/\s+/g, '');
    if (!id || usedIds[id]) id = 's' + (index + 1);
    while (usedIds[id]) id += 'x';
    usedIds[id] = true;

    var times = [];
    if (Array.isArray(r.times) && r.times.length) {
      var any = false;
      for (var i = 0; i < periods; i++) {
        var t = str(r.times[i], '', 12);
        if (t.trim()) any = true;
        times.push(t);
      }
      if (!any) times = [];
    }

    var days = rawDays.map(function (d, di) {
      var cells = [];
      for (var c = 0; c < periods; c++) {
        cells.push(Array.isArray(d.cells) ? str(d.cells[c], '', 60) : '');
      }
      return { label: str(d.label, DAY_NAMES[di] || 'Ngày ' + (di + 1), 24), cells: cells };
    });
    if (!days.length) {
      var blank = [];
      for (var b = 0; b < periods; b++) blank.push('');
      days.push({ label: 'Thứ 2', cells: blank });
    }

    return {
      id: id,
      label: str(r.label, index === 0 ? 'Buổi sáng' : 'Buổi chiều', 40),
      periods: periods,
      times: times,
      days: days
    };
  }

  function normalize(input) {
    var d = defaultConfig();
    var c = isObj(input) ? input : {};

    var name = str(c.name, d.name, 80);
    if (!name.trim()) name = d.name;

    var sz = isObj(c.size) ? c.size : {};
    var size = {
      w: num(sz.w, d.size.w, 0.01, 100000),
      h: num(sz.h, d.size.h, 0.01, 100000)
    };

    // data
    var rd = isObj(c.data) ? c.data : {};
    var used = {};
    var sessions = (Array.isArray(rd.sessions) ? rd.sessions : []).filter(isObj).slice(0, 2)
      .map(function (s, i) { return normSession(s, i, used); });
    if (!sessions.length) sessions = [normSession({}, 0, used)];
    var data = {
      title: str(rd.title, d.data.title, 80),
      subtitle: str(rd.subtitle, d.data.subtitle, 120),
      sessions: sessions
    };

    // look
    var rl = isObj(c.look) ? c.look : {};
    var dl = d.look;
    var rf = isObj(rl.fonts) ? rl.fonts : {};
    var titleFont = fontOk(rf.title) ? rf.title : DEFAULT_FONT;
    var bodyFont = fontOk(rf.body) ? rf.body : DEFAULT_FONT;
    var colors = {};
    if (isObj(rl.colors)) {
      COLOR_KEYS.forEach(function (k) {
        var h = hex(rl.colors[k], null);
        if (h) colors[k] = h;
      });
    }
    var look = {
      layout: pick(rl.layout, LAYOUTS, dl.layout),
      theme: themeOk(rl.theme) ? rl.theme : dl.theme,
      colors: colors,
      subjectColors: pick(rl.subjectColors, SUBJECT_COLORS, dl.subjectColors),
      fonts: {
        title: titleFont,
        body: bodyFont,
        titleWeight: weight(rf.titleWeight, 800, titleFont),
        bodyWeight: weight(rf.bodyWeight, 600, bodyFont)
      },
      textScale: num(rl.textScale, dl.textScale, 0.7, 1.4),
      radius: num(rl.radius, dl.radius, 0, 32),
      gap: num(rl.gap, dl.gap, 0, 24),
      borderWidth: num(rl.borderWidth, dl.borderWidth, 0, 6),
      shadow: pick(rl.shadow, SHADOWS, dl.shadow),
      panelOpacity: num(rl.panelOpacity, dl.panelOpacity, 0, 1),
      panelBlur: num(rl.panelBlur, dl.panelBlur, 0, 30),
      headStyle: pick(rl.headStyle, HEAD_STYLES, dl.headStyle),
      textEffect: pick(rl.textEffect, TEXT_EFFECTS, dl.textEffect),
      bloom: num(rl.bloom, 0.6, 0, 1),
      showTitle: bool(rl.showTitle, dl.showTitle),
      showTimes: bool(rl.showTimes, dl.showTimes),
      showPeriodNumbers: bool(rl.showPeriodNumbers, dl.showPeriodNumbers),
      upper: bool(rl.upper, dl.upper)
    };

    // bg
    var rb = isObj(c.bg) ? c.bg : {};
    var db = d.bg;
    var rp = isObj(rb.pattern) ? rb.pattern : {};
    var ri = isObj(rb.image) ? rb.image : {};
    var ref = typeof ri.ref === 'string' && ri.ref && ri.ref.length <= 80 ? ri.ref : null;
    var bgType = pick(rb.type, BG_TYPES, db.type);
    if (bgType === 'image' && !ref) bgType = 'pattern';
    var bg = {
      type: bgType,
      color: hex(rb.color, db.color),
      pattern: {
        id: pick(rp.id, patternIds(), db.pattern.id),
        color: hex(rp.color, db.pattern.color),
        scale: num(rp.scale, db.pattern.scale, 0.5, 3)
      },
      image: {
        ref: ref,
        zoom: num(ri.zoom, 1, 1, 4),
        x: num(ri.x, 0.5, 0, 1),
        y: num(ri.y, 0.5, 0, 1),
        blur: num(ri.blur, 0, 0, 30),
        dim: num(ri.dim, 0, -0.7, 0.7),
        brightness: num(ri.brightness, 1, 0.5, 1.5),
        gray: bool(ri.gray, false)
      }
    };

    // place
    var rpl = isObj(c.place) ? c.place : {};
    var place = {
      cx: num(rpl.cx, d.place.cx, 0, 1),
      cy: num(rpl.cy, d.place.cy, 0, 1),
      width: num(rpl.width, d.place.width, 0.12, 1),
      zoom: num(rpl.zoom, 1, 0.25, 3),
      preset: ['mini', 's', 'm', 'l'].indexOf(rpl.preset) >= 0 ? rpl.preset : null // old configs: keep their numbers
    };

    return { v: 1, name: name, size: size, data: data, look: look, bg: bg, place: place };
  }

  /* ---------- Blob / dataURL helpers ---------- */
  function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error || new Error('read')); };
      fr.readAsDataURL(blob);
    });
  }

  function dataURLToBlob(url) {
    var i = typeof url === 'string' ? url.indexOf(',') : -1;
    if (i < 0 || url.slice(0, 5) !== 'data:') throw new Error('bad dataURL');
    var head = url.slice(5, i);
    var body = url.slice(i + 1);
    var b64 = /;base64$/i.test(head);
    var type = head.replace(/;base64$/i, '').split(';')[0] || 'application/octet-stream';
    var bin = b64 ? atob(body) : decodeURIComponent(body);
    var arr = new Uint8Array(bin.length);
    for (var k = 0; k < bin.length; k++) arr[k] = bin.charCodeAt(k);
    return new Blob([arr], { type: type });
  }

  function readText(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result)); };
      fr.onerror = function () { reject(fr.error || new Error('read')); };
      fr.readAsText(file);
    });
  }

  /* ---------- Fallback store (localStorage, then memory) ---------- */
  var mem = {};

  function lsKey(store, key) { return LS_PREFIX + store + ':' + key; }

  function fbPut(store, key, val) {
    return Promise.resolve()
      .then(function () {
        if (typeof Blob !== 'undefined' && val instanceof Blob) {
          return blobToDataURL(val).then(function (d) { return { __blob: 1, data: d }; });
        }
        return val;
      })
      .then(function (ser) {
        var s = null;
        try { s = JSON.stringify(ser); } catch (e) { s = null; }
        if (s != null) {
          try {
            localStorage.setItem(lsKey(store, key), s);
            if (mem[store]) delete mem[store][key];
            return;
          } catch (e) { /* quota or blocked: use memory */ }
        }
        (mem[store] = mem[store] || {})[key] = val;
      });
  }

  function fbParse(s) {
    var v = JSON.parse(s);
    if (v && v.__blob === 1 && typeof v.data === 'string') return dataURLToBlob(v.data);
    return v;
  }

  function fbGet(store, key) {
    return Promise.resolve().then(function () {
      if (mem[store] && Object.prototype.hasOwnProperty.call(mem[store], key)) return mem[store][key];
      try {
        var s = localStorage.getItem(lsKey(store, key));
        if (s != null) return fbParse(s);
      } catch (e) { /* ignore */ }
      return undefined;
    });
  }

  function fbDel(store, key) {
    return Promise.resolve().then(function () {
      if (mem[store]) delete mem[store][key];
      try { localStorage.removeItem(lsKey(store, key)); } catch (e) { /* ignore */ }
    });
  }

  function fbAll(store) {
    return Promise.resolve().then(function () {
      var out = {};
      try {
        var prefix = lsKey(store, '');
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(prefix) === 0) {
            try { out[k.slice(prefix.length)] = fbParse(localStorage.getItem(k)); } catch (e) { /* skip bad */ }
          }
        }
      } catch (e) { /* ignore */ }
      var m = mem[store] || {};
      Object.keys(m).forEach(function (k) { out[k] = m[k]; });
      return Object.keys(out).map(function (k) { return { key: k, value: out[k] }; });
    });
  }

  /* ---------- IndexedDB wrapper ---------- */
  var dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve) {
      var done = false;
      function fin(db) {
        if (done) { if (db) { try { db.close(); } catch (e) { /* ignore */ } } return; }
        done = true;
        resolve(db || null);
      }
      try {
        if (!window.indexedDB) { fin(null); return; }
        var req = window.indexedDB.open(DB_NAME, DB_VER);
        req.onupgradeneeded = function () {
          var db = req.result;
          STORES.forEach(function (s) { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s); });
        };
        req.onsuccess = function () {
          var db = req.result;
          db.onversionchange = function () { try { db.close(); } catch (e) { /* ignore */ } dbPromise = null; };
          fin(db);
        };
        req.onerror = function () { fin(null); };
        req.onblocked = function () { fin(null); };
        setTimeout(function () { fin(null); }, 4000);
      } catch (e) { fin(null); }
    });
    return dbPromise;
  }

  function idbRun(db, store, mode, fn) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(store, mode);
      var out;
      tx.oncomplete = function () { resolve(out); };
      tx.onerror = function () { reject(tx.error || new Error('idb')); };
      tx.onabort = function () { reject(tx.error || new Error('idb abort')); };
      var req = fn(tx.objectStore(store));
      if (req) req.onsuccess = function () { out = req.result; };
    });
  }

  function idbAll(db, store) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(store, 'readonly');
      var res = [];
      var req = tx.objectStore(store).openCursor();
      req.onsuccess = function () {
        var cur = req.result;
        if (cur) { res.push({ key: cur.key, value: cur.value }); cur.continue(); }
      };
      tx.oncomplete = function () { resolve(res); };
      tx.onerror = function () { reject(tx.error || new Error('idb')); };
      tx.onabort = function () { reject(tx.error || new Error('idb abort')); };
    });
  }

  var KV = {
    get: function (store, key) {
      return openDb().then(function (db) {
        if (!db) return fbGet(store, key);
        return idbRun(db, store, 'readonly', function (s) { return s.get(key); }).then(
          function (v) { return v !== undefined ? v : fbGet(store, key); },
          function () { return fbGet(store, key); }
        );
      });
    },
    put: function (store, key, val) {
      return openDb().then(function (db) {
        if (!db) return fbPut(store, key, val);
        return idbRun(db, store, 'readwrite', function (s) { return s.put(val, key); }).then(
          function () { /* ok */ },
          function () { return fbPut(store, key, val); }
        );
      });
    },
    del: function (store, key) {
      return openDb().then(function (db) {
        var p = fbDel(store, key);
        if (!db) return p;
        return p.then(function () {
          return idbRun(db, store, 'readwrite', function (s) { return s.delete(key); }).then(
            function () { /* ok */ }, function () { /* ignore */ });
        });
      });
    },
    all: function (store) {
      return openDb().then(function (db) {
        return fbAll(store).then(function (fb) {
          if (!db) return fb;
          return idbAll(db, store).then(function (rows) {
            var seen = {};
            rows.forEach(function (r) { seen[r.key] = true; });
            return rows.concat(fb.filter(function (r) { return !seen[r.key]; }));
          }, function () { return fb; });
        });
      });
    }
  };

  /* ---------- Images ---------- */
  function loadBitmap(blob) {
    return new Promise(function (resolve, reject) {
      function viaImg() {
        var url;
        try { url = URL.createObjectURL(blob); } catch (e) { reject(new Error(ERR_IMG)); return; }
        var img = new Image();
        img.onload = function () {
          if (!img.naturalWidth || !img.naturalHeight) { URL.revokeObjectURL(url); reject(new Error(ERR_IMG)); return; }
          resolve({
            src: img, w: img.naturalWidth, h: img.naturalHeight,
            close: function () { URL.revokeObjectURL(url); }
          });
        };
        img.onerror = function () { URL.revokeObjectURL(url); reject(new Error(ERR_IMG)); };
        img.src = url;
      }
      if (window.createImageBitmap) {
        window.createImageBitmap(blob).then(function (bm) {
          resolve({ src: bm, w: bm.width, h: bm.height, close: function () { if (bm.close) bm.close(); } });
        }, viaImg);
      } else viaImg();
    });
  }

  function canvasToBlob(canvas, type, q) {
    return new Promise(function (resolve, reject) {
      try {
        canvas.toBlob(function (b) { b ? resolve(b) : reject(new Error(ERR_IMG)); }, type, q);
      } catch (e) { reject(new Error(ERR_IMG)); }
    });
  }

  function hasAlpha(src) {
    try {
      var c = document.createElement('canvas');
      c.width = c.height = 96;
      var x = c.getContext('2d');
      x.drawImage(src, 0, 0, 96, 96);
      var d = x.getImageData(0, 0, 96, 96).data;
      for (var i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
    } catch (e) { /* assume opaque */ }
    return false;
  }

  // Downscale so the long edge <= maxEdge. PNG only when transparent, else JPEG.
  // Blobs already small enough (and <= keepBytes) are returned untouched.
  function processImage(blob, maxEdge, quality, keepBytes) {
    return loadBitmap(blob).then(function (b) {
      var canvas = null;
      var done = function () { b.close(); if (canvas) { canvas.width = canvas.height = 0; } };
      var work = Promise.resolve().then(function () {
        var k = Math.min(1, maxEdge / Math.max(b.w, b.h));
        var type = (blob.type || '').toLowerCase();
        if (k === 1 && keepBytes && blob.size <= keepBytes && /^image\/(png|jpeg|webp)$/.test(type)) return blob;
        var w = Math.max(1, Math.round(b.w * k));
        var h = Math.max(1, Math.round(b.h * k));
        canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var x = canvas.getContext('2d');
        if (!x) throw new Error(ERR_IMG);
        var alpha = type !== 'image/jpeg' && hasAlpha(b.src);
        if (!alpha) { x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, w, h); }
        x.imageSmoothingEnabled = true;
        x.imageSmoothingQuality = 'high';
        x.drawImage(b.src, 0, 0, w, h);
        return canvasToBlob(canvas, alpha ? 'image/png' : 'image/jpeg', quality);
      });
      return work.then(function (r) { done(); return r; }, function (e) { done(); throw e; });
    });
  }

  function putImage(blobOrFile) {
    return Promise.resolve().then(function () {
      if (!blobOrFile || typeof blobOrFile.size !== 'number') throw new Error(ERR_IMG);
      return processImage(blobOrFile, 2600, 0.9, 6 * 1024 * 1024);
    }).then(function (blob) {
      var ref = uid('img');
      return KV.put('images', ref, blob).then(function () { return ref; });
    });
  }

  function getImage(ref) {
    if (typeof ref !== 'string' || !ref) return Promise.resolve(null);
    return KV.get('images', ref).then(function (v) {
      return typeof Blob !== 'undefined' && v instanceof Blob ? v : null;
    });
  }

  function deleteImage(ref) {
    if (typeof ref !== 'string' || !ref) return Promise.resolve();
    return KV.del('images', ref);
  }

  /* ---------- Autosave ---------- */
  function autosave(cfg) {
    return KV.put('autosave', 'current', { updated: Date.now(), cfg: normalize(cfg) });
  }

  function loadAutosave() {
    return KV.get('autosave', 'current').then(function (rec) {
      return rec && isObj(rec.cfg) ? normalize(rec.cfg) : null;
    });
  }

  /* ---------- Slots ---------- */
  function listSlots() {
    return KV.all('slots').then(function (rows) {
      return rows.map(function (r) { return r.value; })
        .filter(function (v) { return isObj(v) && typeof v.id === 'string'; })
        .map(function (v) {
          return { id: v.id, name: v.name || 'TKB', updated: v.updated || 0, thumb: v.thumb || null };
        })
        .sort(function (a, b) { return b.updated - a.updated; });
    });
  }

  function saveSlot(cfg, thumbBlob, id) {
    var clean = normalize(cfg);
    var thumbP;
    if (typeof thumbBlob === 'string' && thumbBlob.slice(0, 5) === 'data:') thumbP = Promise.resolve(thumbBlob);
    else if (thumbBlob && typeof thumbBlob.size === 'number') thumbP = blobToDataURL(thumbBlob).catch(function () { return null; });
    else thumbP = Promise.resolve(null);
    return Promise.all([thumbP, id ? KV.get('slots', id) : Promise.resolve(null)]).then(function (r) {
      var old = r[1];
      var sid = id || uid('slot');
      var rec = {
        id: sid, name: clean.name, updated: Date.now(),
        thumb: r[0] || (old && old.thumb) || null, cfg: clean
      };
      return KV.put('slots', sid, rec).then(function () { return sid; });
    });
  }

  function getSlotRec(id) {
    return KV.get('slots', id).then(function (rec) {
      if (!isObj(rec) || !isObj(rec.cfg)) throw new Error('Không tìm thấy bản lưu này. Có thể nó đã bị xoá.');
      return rec;
    });
  }

  function loadSlot(id) {
    return getSlotRec(id).then(function (rec) { return normalize(rec.cfg); });
  }

  function renameSlot(id, name) {
    return getSlotRec(id).then(function (rec) {
      var n = str(name, '', 80).trim();
      if (!n) n = rec.name || 'TKB của tôi';
      rec.name = n;
      rec.cfg = normalize(rec.cfg);
      rec.cfg.name = n;
      rec.updated = Date.now();
      return KV.put('slots', id, rec);
    });
  }

  function deleteSlot(id) { return KV.del('slots', id); }

  function duplicateSlot(id) {
    return getSlotRec(id).then(function (rec) {
      var nid = uid('slot');
      var name = str((rec.name || 'TKB') + ' (bản sao)', 'TKB (bản sao)', 80);
      var cfg = normalize(rec.cfg);
      cfg.name = name;
      return KV.put('slots', nid, {
        id: nid, name: name, updated: Date.now(), thumb: rec.thumb || null, cfg: cfg
      }).then(function () { return nid; });
    });
  }

  /* ---------- .tkb.json export / import ---------- */
  function exportFile(cfg) {
    var clean = normalize(cfg);
    var ref = clean.bg.image.ref;
    var imgP = ref
      ? getImage(ref).then(function (blob) {
        if (!blob) return null;
        return processImage(blob, 1600, 0.85, 1.5 * 1024 * 1024).then(blobToDataURL);
      }).catch(function () { return null; })
      : Promise.resolve(null);
    return imgP.then(function (dataUrl) {
      clean.bg.image.ref = null;
      if (!dataUrl && clean.bg.type === 'image') clean.bg.type = 'pattern';
      var env = {
        app: 'tkb-studio', format: 1, exported: new Date().toISOString(),
        config: clean, image: dataUrl || null
      };
      return new Blob([JSON.stringify(env)], { type: 'application/json' });
    });
  }

  function importFile(file) {
    return Promise.resolve().then(function () {
      if (!file || typeof file.size !== 'number') throw new Error('Không đọc được tệp. Hãy chọn lại tệp .tkb.json.');
      var fname = String(file.name || '').toLowerCase();
      if (!/\.tkb\.json$/.test(fname)) throw new Error('Tệp không đúng định dạng. Hãy chọn tệp có đuôi .tkb.json.');
      if (file.size > MAX_IMPORT_BYTES) throw new Error('Tệp quá lớn để nhập (tối đa 40 MB).');
      return readText(file).catch(function () { throw new Error('Không đọc được tệp. Hãy thử lại.'); });
    }).then(function (text) {
      var env;
      try { env = JSON.parse(text); } catch (e) { throw new Error('Tệp bị hỏng hoặc không phải JSON hợp lệ.'); }
      if (!isObj(env) || env.app !== 'tkb-studio' || !isObj(env.config)) {
        throw new Error('Đây không phải tệp thời khoá biểu của TKB Studio.');
      }
      if (typeof env.format === 'number' && env.format > 1) {
        throw new Error('Tệp được tạo bởi phiên bản TKB Studio mới hơn. Hãy tải lại trang để cập nhật.');
      }
      var c = env.config;
      if (!isObj(c.data) || !Array.isArray(c.data.sessions) || !c.data.sessions.length) {
        throw new Error('Tệp không chứa dữ liệu thời khoá biểu hợp lệ.');
      }
      var cfg = normalize(c); // safe copy; image ref is set below
      var data = env.image;
      var wantsImage = c.bg && c.bg.type === 'image';
      if (typeof data === 'string' && /^data:image\/(png|jpeg|webp|gif);/i.test(data)) {
        var blob;
        try { blob = dataURLToBlob(data); } catch (e) { throw new Error('Ảnh nền trong tệp bị hỏng.'); }
        return putImage(blob).then(function (ref) {
          cfg.bg.image.ref = ref;
          if (wantsImage) cfg.bg.type = 'image';
          return cfg;
        }, function () {
          cfg.bg.image.ref = null;
          if (cfg.bg.type === 'image') cfg.bg.type = 'pattern';
          return cfg;
        });
      }
      cfg.bg.image.ref = null;
      if (cfg.bg.type === 'image') cfg.bg.type = 'pattern';
      return cfg;
    });
  }

  /* ---------- Public API ---------- */
  TKB.storage = {
    defaultConfig: defaultConfig,
    normalize: normalize,
    autosave: autosave,
    loadAutosave: loadAutosave,
    listSlots: listSlots,
    saveSlot: saveSlot,
    loadSlot: loadSlot,
    renameSlot: renameSlot,
    deleteSlot: deleteSlot,
    duplicateSlot: duplicateSlot,
    putImage: putImage,
    getImage: getImage,
    deleteImage: deleteImage,
    exportFile: exportFile,
    importFile: importFile
  };
})();
