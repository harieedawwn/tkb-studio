(function () {
  'use strict';
  var TKB = (window.TKB = window.TKB || {});

  var W9 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
  var G = { art: 'Nghệ thuật', script: 'Thư pháp', sans: 'Không chân', serif: 'Có chân', round: 'Bo tròn', cond: 'Hẹp & đậm', hand: 'Viết tay', mono: 'Đơn cách' };

  function r(a, b) { return W9.filter(function (w) { return w >= a && w <= b; }); }

  // [family, group, weights]
  var rows = [
    // display / art faces, all with a real Vietnamese subset
    ['Phudu', G.art, r(300, 900)],
    ['Vina Sans', G.art, [400]],
    ['Unbounded', G.art, r(200, 900)],
    ['Dela Gothic One', G.art, [400]],
    ['Bungee', G.art, [400]],
    ['Bungee Shade', G.art, [400]],
    ['Bungee Inline', G.art, [400]],
    ['Bungee Outline', G.art, [400]],
    ['Tilt Warp', G.art, [400]],
    ['Tilt Prism', G.art, [400]],
    ['Sigmar', G.art, [400]],
    ['Paytone One', G.art, [400]],
    ['Rowdies', G.art, [300, 400, 700]],
    ['Bevan', G.art, [400]],
    ['Chonburi', G.art, [400]],
    ['Pattaya', G.art, [400]],
    ['Potta One', G.art, [400]],
    ['Kablammo', G.art, [400]],
    ['Danfo', G.art, [400]],
    ['Sansita Swashed', G.art, r(300, 900)],
    ['Saira Stencil One', G.art, [400]],
    ['Big Shoulders Display', G.art, W9],
    ['Lexend Zetta', G.art, W9],
    ['Major Mono Display', G.art, [400]],

    ['Great Vibes', G.script, [400]],
    ['Moon Dance', G.script, [400]],
    ['Corinthia', G.script, [400, 700]],
    ['Imperial Script', G.script, [400]],
    ['Luxurious Script', G.script, [400]],
    ['Pinyon Script', G.script, [400]],
    ['Allura', G.script, [400]],
    ['Alex Brush', G.script, [400]],
    ['Italianno', G.script, [400]],
    ['Ephesis', G.script, [400]],
    ['Hurricane', G.script, [400]],
    ['Birthstone', G.script, [400]],
    ['Mea Culpa', G.script, [400]],
    ['Bonheur Royale', G.script, [400]],
    ['Lavishly Yours', G.script, [400]],
    ['Ballet', G.script, [400]],
    ['Island Moments', G.script, [400]],
    ['Twinkle Star', G.script, [400]],
    ['Comforter Brush', G.script, [400]],
    ['Water Brush', G.script, [400]],
    ['Send Flowers', G.script, [400]],
    ['Charm', G.script, [400, 700]],
    ['Charmonman', G.script, [400, 700]],
    ['Srisakdi', G.script, [400, 700]],

    ['Be Vietnam Pro', G.sans, W9],
    ['Lexend', G.sans, W9],
    ['Plus Jakarta Sans', G.sans, r(200, 800)],
    ['Manrope', G.sans, r(200, 800)],
    ['Epilogue', G.sans, W9],
    ['Familjen Grotesk', G.sans, r(400, 700)],
    ['Darker Grotesque', G.sans, r(300, 900)],
    ['Kanit', G.sans, W9],
    ['Prompt', G.sans, W9],
    ['Mitr', G.sans, r(200, 700)],
    ['Anybody', G.sans, W9],
    ['Montserrat', G.sans, W9],
    ['Inter', G.sans, W9],
    ['Nunito', G.sans, r(200, 900)],
    ['Quicksand', G.sans, r(300, 700)],
    ['Barlow', G.sans, W9],
    ['Josefin Sans', G.sans, r(100, 700)],
    ['Space Grotesk', G.sans, r(300, 700)],
    ['Bricolage Grotesque', G.sans, r(200, 800)],
    ['Archivo', G.sans, W9],
    ['Open Sans', G.sans, r(300, 800)],

    ['Playfair Display', G.serif, r(400, 900)],
    ['Playfair', G.serif, r(300, 900)],
    ['Noto Serif Display', G.serif, W9],
    ['EB Garamond', G.serif, r(400, 800)],
    ['Cormorant', G.serif, r(300, 700)],
    ['Cormorant Garamond', G.serif, r(300, 700)],
    ['Cormorant Upright', G.serif, r(300, 700)],
    ['Prata', G.serif, [400]],
    ['Newsreader', G.serif, r(200, 800)],
    ['Literata', G.serif, r(200, 900)],
    ['Alegreya', G.serif, r(400, 900)],
    ['Taviraj', G.serif, W9],
    ['Pridi', G.serif, r(200, 700)],
    ['Lora', G.serif, r(400, 700)],
    ['Merriweather', G.serif, [300, 400, 700, 900]],
    ['Spectral', G.serif, r(200, 800)],
    ['Vollkorn', G.serif, r(400, 900)],
    ['Source Serif 4', G.serif, r(200, 900)],
    ['Fraunces', G.serif, W9],
    ['Bitter', G.serif, W9],
    ['Crimson Pro', G.serif, r(200, 900)],
    ['Yeseva One', G.serif, [400]],

    ['Baloo 2', G.round, r(400, 800)],
    ['Comfortaa', G.round, r(300, 700)],
    ['Mali', G.round, r(200, 700)],
    ['Grandstander', G.round, W9],
    ['Lemonada', G.round, r(300, 700)],
    ['Itim', G.round, [400]],
    ['Sriracha', G.round, [400]],
    ['Pangolin', G.round, [400]],
    ['Montserrat Alternates', G.round, W9],
    ['Coiny', G.round, [400]],
    ['Gluten', G.round, W9],
    ['Yomogi', G.round, [400]],

    ['Oswald', G.cond, r(200, 700)],
    ['Anton', G.cond, [400]],
    ['Barlow Condensed', G.cond, W9],
    ['Roboto Condensed', G.cond, r(100, 900)],
    ['Saira Condensed', G.cond, W9],
    ['Chakra Petch', G.cond, r(300, 700)],
    ['Alfa Slab One', G.cond, [400]],
    ['Bangers', G.cond, [400]],

    ['Patrick Hand', G.hand, [400]],
    ['Playpen Sans', G.hand, r(100, 800)],
    ['Pacifico', G.hand, [400]],
    ['Dancing Script', G.hand, r(400, 700)],
    ['Lobster', G.hand, [400]],
    ['Playwrite VN', G.hand, r(100, 400)],
    ['Shantell Sans', G.hand, r(300, 800)],
    ['Mynerve', G.hand, [400]],
    ['Grape Nuts', G.hand, [400]],
    ['Sedgwick Ave Display', G.hand, [400]],
    ['Barriecito', G.hand, [400]],

    ['JetBrains Mono', G.mono, r(100, 800)],
    ['Space Mono', G.mono, [400, 700]],
    ['IBM Plex Mono', G.mono, r(100, 700)],
    ['Victor Mono', G.mono, r(100, 700)]
  ];

  var list = rows.map(function (x) { return { family: x[0], group: x[1], weights: x[2].slice() }; });
  var custom = [];

  var SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';
  var FALL = {};
  FALL[G.sans] = SANS;
  FALL[G.art] = SANS;
  FALL[G.script] = '"Segoe Script", "Brush Script MT", cursive';
  FALL[G.serif] = 'Georgia, "Times New Roman", "Noto Serif", serif';
  FALL[G.round] = 'ui-rounded, "Nunito", ' + SANS;
  FALL[G.cond] = '"Arial Narrow", "Roboto Condensed", ' + SANS;
  FALL[G.hand] = '"Segoe Print", "Bradley Hand", "Comic Sans MS", "Noto Sans", cursive';
  FALL[G.mono] = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';
  FALL['Của bạn'] = SANS;

  function all() { return list.concat(custom); }

  function find(family) {
    var a = all();
    for (var i = 0; i < a.length; i++) if (a[i].family === family) return a[i];
    return null;
  }

  function stack(family) {
    var f = find(family);
    var fb = f ? FALL[f.group] || SANS : SANS;
    return '"' + String(family).replace(/"/g, '') + '", ' + fb;
  }

  function nearestWeight(family, w) {
    var f = find(family);
    w = Number(w) || 400;
    if (!f || !f.weights.length) return w;
    var best = f.weights[0];
    for (var i = 1; i < f.weights.length; i++) {
      if (Math.abs(f.weights[i] - w) < Math.abs(best - w)) best = f.weights[i];
    }
    return best;
  }

  // ---- Google Fonts loading (one <link> per family) ----
  var SAMPLE = 'Thời khoá biểu Tiếng Việt ĐặngƯớc';
  var links = {};   // family -> Promise<boolean> (stylesheet loaded)
  var loads = {};   // family|weight -> Promise<boolean>

  function cssUrl(f) {
    var q = encodeURIComponent(f.family).replace(/%20/g, '+');
    if (f.weights.length > 1) q += ':wght@' + f.weights.join(';');
    return 'https://fonts.googleapis.com/css2?family=' + q + '&display=swap';
  }

  function ensureLink(f) {
    if (links[f.family]) return links[f.family];
    links[f.family] = new Promise(function (resolve) {
      try {
        var el = document.createElement('link');
        el.rel = 'stylesheet';
        el.href = cssUrl(f);
        el.setAttribute('data-tkb-font', f.family);
        el.onload = function () { resolve(true); };
        el.onerror = function () { resolve(false); };
        document.head.appendChild(el);
      } catch (e) { resolve(false); }
    });
    return links[f.family];
  }

  function timeout(ms, v) { return new Promise(function (res) { setTimeout(function () { res(v); }, ms); }); }

  function load(family, weight) {
    var f = find(family);
    if (!f) return Promise.resolve(false);
    var w = nearestWeight(family, weight || 400);
    var key = family + '|' + w;
    if (loads[key]) return loads[key];
    var job = (async function () {
      try {
        if (f.group !== 'Của bạn') {
          var ok = await ensureLink(f);
          if (!ok) return false;
        }
        if (!document.fonts || !document.fonts.load) return true;
        var faces = await document.fonts.load(w + ' 32px "' + family + '"', SAMPLE);
        return !!(faces && faces.length);
      } catch (e) { return false; }
    })();
    var p = Promise.race([job, timeout(4000, false)]).then(function (v) {
      if (!v) delete loads[key]; // allow a retry later (e.g. back online)
      return v;
    }, function () { delete loads[key]; return false; });
    loads[key] = p;
    return p;
  }

  async function ensure(cfg) {
    try {
      var fo = (cfg && cfg.look && cfg.look.fonts) || {};
      var jobs = [];
      if (fo.title) jobs.push(load(fo.title, fo.titleWeight));
      if (fo.body) jobs.push(load(fo.body, fo.bodyWeight));
      await Promise.all(jobs);
    } catch (e) {}
  }

  // ---- Custom fonts (IndexedDB "tkb-fonts") ----
  var DB = 'tkb-fonts', STORE = 'fonts';
  var mem = {};          // fallback when IndexedDB is unavailable
  var faces = {};        // family -> FontFace
  var dbp = null;

  function openDb() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve) {
      try {
        if (!window.indexedDB) return resolve(null);
        var req = indexedDB.open(DB, 1);
        req.onupgradeneeded = function () { req.result.createObjectStore(STORE, { keyPath: 'family' }); };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { resolve(null); };
        req.onblocked = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
    return dbp;
  }

  function tx(mode, fn) {
    return openDb().then(function (db) {
      if (!db) return fn(null);
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode), out;
        try { out = fn(t.objectStore(STORE)); } catch (e) { return reject(e); }
        t.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : out); };
        t.onerror = t.onabort = function () { reject(t.error || new Error('IndexedDB')); };
      });
    });
  }

  function dbPut(rec) {
    return tx('readwrite', function (s) { if (!s) { mem[rec.family] = rec; return; } s.put(rec); })
      .catch(function () { mem[rec.family] = rec; });
  }
  function dbDelete(family) {
    return tx('readwrite', function (s) { if (!s) { delete mem[family]; return; } s.delete(family); })
      .catch(function () { delete mem[family]; });
  }
  function dbAll() {
    return openDb().then(function (db) {
      if (!db) return Object.keys(mem).map(function (k) { return mem[k]; });
      return new Promise(function (resolve) {
        try {
          var q = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
          q.onsuccess = function () { resolve(q.result || []); };
          q.onerror = function () { resolve([]); };
        } catch (e) { resolve([]); }
      });
    });
  }

  async function register(rec) {
    var face = new FontFace(rec.family, rec.data, { weight: '100 900', style: 'normal' });
    await face.load();
    document.fonts.add(face);
    faces[rec.family] = face;
    if (!custom.some(function (c) { return c.family === rec.family; })) {
      custom.push({ family: rec.family, group: 'Của bạn', weights: [400] });
    }
  }

  function readBuf(file) {
    if (file.arrayBuffer) return file.arrayBuffer();
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result); };
      fr.onerror = function () { rej(fr.error); };
      fr.readAsArrayBuffer(file);
    });
  }

  async function addCustom(file) {
    if (!file) throw new Error('Chưa chọn tệp phông chữ.');
    var name = String(file.name || '');
    if (!/\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/.test(name)) throw new Error('Chỉ hỗ trợ tệp .ttf, .otf, .woff hoặc .woff2.');
    if (file.size > 8 * 1024 * 1024) throw new Error('Tệp phông chữ quá lớn (tối đa 8 MB).');
    var base = name.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N} _-]/gu, ' ').replace(/\s+/g, ' ').trim() || 'Phông của bạn';
    var family = base;
    if (list.some(function (f) { return f.family === family; })) family = base + ' (của bạn)';
    var data = await readBuf(file);
    try {
      await register({ family: family, data: data.slice(0) });
    } catch (e) {
      throw new Error('Không đọc được phông chữ này. Hãy thử tệp khác.');
    }
    await dbPut({ family: family, name: name, data: data });
    return { family: family };
  }

  async function removeCustom(family) {
    try { if (faces[family]) document.fonts.delete(faces[family]); } catch (e) {}
    delete faces[family];
    for (var i = custom.length - 1; i >= 0; i--) if (custom[i].family === family) custom.splice(i, 1);
    Object.keys(loads).forEach(function (k) { if (k.indexOf(family + '|') === 0) delete loads[k]; });
    await dbDelete(family);
  }

  async function initCustom() {
    try {
      var recs = await dbAll();
      for (var i = 0; i < recs.length; i++) {
        try { await register(recs[i]); } catch (e) {}
      }
    } catch (e) {}
  }

  TKB.fonts = {
    list: list,
    custom: custom,
    all: all,
    stack: stack,
    nearestWeight: nearestWeight,
    load: load,
    ensure: ensure,
    addCustom: addCustom,
    removeCustom: removeCustom,
    initCustom: initCustom
  };
})();
