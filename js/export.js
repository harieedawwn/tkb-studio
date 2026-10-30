/* TKB Studio - export.js: render to PNG/JPEG/WebP/PDF, download, share, store-only ZIP. */
(function () {
  'use strict';
  var TKB = (window.TKB = window.TKB || {});

  var FORMATS = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp', pdf: 'application/pdf' };
  var EXT = { png: 'png', jpeg: 'jpg', webp: 'webp', pdf: 'pdf' };

  var ERR_SIZE = 'Trình duyệt không tạo được ảnh cỡ này. Hãy chọn chất lượng thấp hơn (ví dụ 1080p hoặc 720p) rồi thử lại.';
  var ERR_RENDER = 'Không dựng được ảnh. Hãy thử lại hoặc chọn chất lượng thấp hơn.';

  /* ---------- Helpers ---------- */
  function clamp01(v, def) {
    if (typeof v !== 'number' || !isFinite(v)) return def;
    return Math.min(1, Math.max(0, v));
  }

  function normFormat(f) {
    f = String(f || 'png').toLowerCase();
    if (f === 'jpg') f = 'jpeg';
    if (!FORMATS[f]) throw new Error('Định dạng "' + f + '" chưa được hỗ trợ. Hãy chọn PNG, JPEG, WebP hoặc PDF.');
    return f;
  }

  function nextTick() { return new Promise(function (r) { setTimeout(r, 0); }); }

  function readBytes(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(new Uint8Array(fr.result)); };
      fr.onerror = function () { reject(fr.error || new Error('read')); };
      fr.readAsArrayBuffer(blob);
    });
  }

  function ascii(s) {
    var u = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255;
    return u;
  }

  function utf8(s) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    var bin = unescape(encodeURIComponent(s));
    return ascii(bin);
  }

  function pixels(cfg, short) {
    var p = TKB.devices.pixels(cfg.size, short);
    return { w: Math.max(1, Math.round(p.w)), h: Math.max(1, Math.round(p.h)) };
  }

  function canvasToBlob(canvas, type, q) {
    return new Promise(function (resolve, reject) {
      try {
        canvas.toBlob(function (b) { b ? resolve(b) : reject(new Error(ERR_SIZE)); }, type, q);
      } catch (e) { reject(new Error(ERR_SIZE)); }
    });
  }

  function releaseCanvas(c) { try { c.width = 0; c.height = 0; } catch (e) { /* ignore */ } }

  /* ---------- PDF writer (single page, one DCT image) ---------- */
  function buildPdf(jpeg, w, h) {
    var A4W = 595.28, A4H = 841.89;
    var pw = w * 0.75, ph = h * 0.75;
    var r = w / h;
    if (Math.abs(r / (A4W / A4H) - 1) <= 0.01) { pw = A4W; ph = A4H; }
    else if (Math.abs(r / (A4H / A4W) - 1) <= 0.01) { pw = A4H; ph = A4W; }
    function f(n) { return n.toFixed(2); }

    var chunks = [];
    var offsets = [];
    var len = 0;
    function push(x) {
      var b = typeof x === 'string' ? ascii(x) : x;
      chunks.push(b);
      len += b.length;
    }
    function begin(n) { offsets[n] = len; push(n + ' 0 obj\n'); }

    push('%PDF-1.4\n%âãÏÓ\n');
    begin(1); push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    begin(2); push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    begin(3);
    push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + f(pw) + ' ' + f(ph) + '] ' +
      '/Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 5 0 R >>\nendobj\n');
    begin(4);
    push('<< /Type /XObject /Subtype /Image /Width ' + w + ' /Height ' + h +
      ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpeg.length + ' >>\nstream\n');
    push(jpeg);
    push('\nendstream\nendobj\n');
    var content = 'q ' + f(pw) + ' 0 0 ' + f(ph) + ' 0 0 cm /Im0 Do Q';
    begin(5); push('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream\nendobj\n');
    begin(6); push('<< /Producer (TKB Studio) /Creator (TKB Studio) >>\nendobj\n');

    var xrefPos = len;
    var x = 'xref\n0 7\n0000000000 65535 f \n';
    for (var i = 1; i <= 6; i++) {
      x += ('0000000000' + offsets[i]).slice(-10) + ' 00000 n \n';
    }
    x += 'trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n' + xrefPos + '\n%%EOF\n';
    push(x);
    return new Blob(chunks, { type: 'application/pdf' });
  }

  /* ---------- CRC32 + ZIP (store only) ---------- */
  var crcTable = null;
  function crc32(bytes) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        crcTable[n] = c >>> 0;
      }
    }
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function buildZip(entries) {
    // entries: [{name, blob, size, crc}]
    var d = new Date();
    var dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var dosDate = (Math.max(0, d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    var parts = [];
    var central = [];
    var offset = 0;

    entries.forEach(function (e) {
      var name = utf8(e.name);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true);
      lh.setUint16(4, 20, true);
      lh.setUint16(6, 0x0800, true); // UTF-8 names
      lh.setUint16(8, 0, true); // store
      lh.setUint16(10, dosTime, true);
      lh.setUint16(12, dosDate, true);
      lh.setUint32(14, e.crc, true);
      lh.setUint32(18, e.size, true);
      lh.setUint32(22, e.size, true);
      lh.setUint16(26, name.length, true);
      lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, e.blob);

      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true);
      ch.setUint16(4, 20, true);
      ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true);
      ch.setUint16(12, dosTime, true);
      ch.setUint16(14, dosDate, true);
      ch.setUint32(16, e.crc, true);
      ch.setUint32(20, e.size, true);
      ch.setUint32(24, e.size, true);
      ch.setUint16(28, name.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);

      offset += 30 + name.length + e.size;
    });

    var cdSize = 0;
    central.forEach(function (c) { cdSize += c.length; });
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, entries.length, true);
    end.setUint16(10, entries.length, true);
    end.setUint32(12, cdSize, true);
    end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), { type: 'application/zip' });
  }

  /* ---------- Public API ---------- */
  function toBlob(cfg, opts) {
    opts = opts || {};
    return Promise.resolve().then(function () {
      var format = normFormat(opts.format);
      var short = Number(opts.short) || 1080;
      var q = clamp01(opts.quality, 0.92);
      var px = pixels(cfg, short);
      var canvas = document.createElement('canvas');
      var final = canvas;

      function cleanup() { releaseCanvas(canvas); if (final !== canvas) releaseCanvas(final); }

      return Promise.resolve()
        .then(function () {
          // Probe that the browser can allocate a canvas this large.
          var probe = document.createElement('canvas');
          probe.width = px.w; probe.height = px.h;
          var ok = !!probe.getContext('2d');
          releaseCanvas(probe);
          if (!ok) throw new Error(ERR_SIZE);
        })
        .then(function () {
          return TKB.render(canvas, cfg, { width: px.w }).then(null, function (e) {
            if (e && console && console.error) console.error(e);
            throw new Error(ERR_RENDER);
          });
        })
        .then(function () {
          if (canvas.width !== px.w || canvas.height !== px.h) {
            // Make the output exactly the requested pixel size.
            final = document.createElement('canvas');
            final.width = px.w; final.height = px.h;
            var x = final.getContext('2d');
            if (!x) throw new Error(ERR_SIZE);
            x.imageSmoothingQuality = 'high';
            x.drawImage(canvas, 0, 0, px.w, px.h);
          }
          if (format === 'png') return canvasToBlob(final, 'image/png');
          if (format === 'jpeg') return canvasToBlob(final, 'image/jpeg', q);
          if (format === 'webp') {
            return canvasToBlob(final, 'image/webp', q).then(function (b) {
              if (b.type !== 'image/webp') throw new Error('Trình duyệt này không hỗ trợ xuất WebP. Hãy chọn PNG hoặc JPEG.');
              return b;
            });
          }
          return canvasToBlob(final, 'image/jpeg', q).then(readBytes).then(function (bytes) {
            return buildPdf(bytes, px.w, px.h);
          });
        })
        .then(function (b) { cleanup(); return b; }, function (e) { cleanup(); throw e; });
    });
  }

  function filename(cfg, short, format) {
    var f = normFormat(format);
    var slug = String((cfg && cfg.name) || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'd')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      .replace(/^tkb(-|$)/, '');
    var qid = String(short) + 'p';
    var list = TKB.QUALITY || [];
    for (var i = 0; i < list.length; i++) if (list[i].short === Number(short)) { qid = list[i].id; break; }
    return 'tkb-' + (slug ? slug + '-' : '') + qid + '.' + EXT[f];
  }

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      if (a.parentNode) a.parentNode.removeChild(a);
      URL.revokeObjectURL(url);
    }, 10000);
  }

  function share(blob, name) {
    return Promise.resolve().then(function () {
      if (!navigator.share || !navigator.canShare) return false;
      var file;
      try { file = new File([blob], name, { type: blob.type }); } catch (e) { return false; }
      var data = { files: [file] };
      if (!navigator.canShare(data)) return false;
      return navigator.share({ files: [file], title: name }).then(
        function () { return true; },
        function (e) { return !!(e && e.name === 'AbortError'); } // cancelled by user counts as handled
      );
    }).catch(function () { return false; });
  }

  function zipAll(cfg, opts) {
    opts = opts || {};
    var shorts = [];
    (opts.shorts || []).forEach(function (s) {
      s = Number(s);
      if (s > 0 && shorts.indexOf(s) < 0) shorts.push(s);
    });
    if (!shorts.length) return Promise.reject(new Error('Chưa chọn chất lượng nào để xuất.'));
    var format = normFormat(opts.format);
    var n = shorts.length;
    var entries = [];
    var used = {};

    function step(i) {
      if (opts.onProgress) { try { opts.onProgress(i, n); } catch (e) { /* ignore */ } }
      if (i >= n) return Promise.resolve();
      return nextTick()
        .then(function () { return toBlob(cfg, { short: shorts[i], format: format, quality: opts.quality }); })
        .then(function (blob) {
          return readBytes(blob).then(function (bytes) {
            var name = filename(cfg, shorts[i], format);
            while (used[name]) name = name.replace(/(\.\w+)$/, '-2$1');
            used[name] = true;
            entries.push({ name: name, blob: blob, size: bytes.length, crc: crc32(bytes) });
          });
        })
        .then(function () { return step(i + 1); });
    }

    return step(0).then(function () { return buildZip(entries); });
  }

  TKB.export = {
    pixels: pixels,
    toBlob: toBlob,
    filename: filename,
    download: download,
    share: share,
    zipAll: zipAll
  };
})();
