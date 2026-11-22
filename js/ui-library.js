/* TKB Studio - panel "save" (Lưu & Tải) */
(function () {
  'use strict';
  var TKB = window.TKB = window.TKB || {};
  var D = TKB.dom, h = D.h, slug = D.slug;

  function toast(t, k) { TKB.ui.toast(t, k); }
  function errMsg(e) { return (e && e.message) || 'Có lỗi xảy ra, thử lại nhé.'; }

  var CSS =
    '.p-save-slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}' +
    '.p-save-slot{display:flex;flex-direction:column;gap:6px;padding:8px}' +
    '.p-save-slot.is-cur{border:2px solid var(--accent)}' +
    '.p-save-slot img{width:100%;height:auto;display:block;background:var(--paper-2);border-radius:4px;aspect-ratio:3/4;object-fit:cover}' +
    '.p-save-name{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.p-save-acts{display:flex;flex-wrap:wrap;gap:4px}' +
    '.p-save-q{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px}' +
    '.p-save-q .tile{display:flex;flex-direction:column;gap:2px;padding:8px;min-height:44px;text-align:center}' +
    '.p-save-q small{font-size:12px;color:var(--ink-soft)}' +
    '.p-save-q .is-on small{color:inherit}' +
    '.p-save-status{display:none;align-items:center;gap:8px;font-size:14px}.p-save-status.is-on{display:flex}' +
    '.p-save-spin{width:18px;height:18px;border:3px solid var(--line);border-top-color:var(--accent);border-radius:50%;animation:p-save-rot .8s linear infinite}' +
    '@keyframes p-save-rot{to{transform:rotate(360deg)}}';

  function mount(root) {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var fmt = 'png', qid = '1080p', qual = 0.92, busy = false, locks = [], refs = [];

    function sec(t) { return h('div', { class: 'label', text: t }); }
    function btn(text, cls, fn, noLock) {
      var b = h('button', { type: 'button', class: 'btn ' + cls, text: text, onclick: fn });
      if (!noLock) locks.push(b);
      return b;
    }

    root.appendChild(h('h2', { class: 'p-title', text: 'Lưu & Tải' }));
    var stack = h('div', { class: 'stack' });
    root.appendChild(stack);

    var status = h('div', { class: 'p-save-status', role: 'status' });
    var statusTxt = h('span');
    status.appendChild(h('span', { class: 'p-save-spin' })); status.appendChild(statusTxt);
    function setBusy(b, msg) {
      busy = b;
      locks.forEach(function (x) { x.disabled = b; });
      status.classList.toggle('is-on', b);
      statusTxt.textContent = msg || 'Đang xử lý…';
    }
    function run(msg, fn) {
      if (busy) return Promise.resolve();
      setBusy(true, msg);
      return Promise.resolve().then(fn).catch(function (e) { toast(errMsg(e), 'error'); })
        .then(function () { setBusy(false); });
    }

    // ---- Bản lưu
    stack.appendChild(sec('Bản lưu'));
    var nameIn = h('input', { class: 'input', type: 'text', maxlength: 60, placeholder: 'Tên thời khoá biểu', 'aria-label': 'Tên bản lưu' });
    nameIn.addEventListener('input', function () {
      var v = nameIn.value;
      TKB.ui.update(function (c) { c.name = v; }, { key: 'name' });
    });
    stack.appendChild(nameIn);
    refs.push(function () { if (document.activeElement !== nameIn) nameIn.value = TKB.ui.get().name || ''; });

    function save(asNew) {
      return run('Đang lưu…', function () {
        var c = TKB.ui.get();
        return TKB.ui.thumbnail().then(function (th) {
          return TKB.storage.saveSlot(c, th, asNew ? undefined : (TKB.ui.slotId || undefined));
        }).then(function (id) {
          TKB.ui.slotId = id;
          toast('Đã lưu', 'ok');
          return refreshSlots();
        });
      });
    }
    stack.appendChild(h('div', { class: 'row' }, [
      btn('Lưu', 'btn-primary', function () { save(false); }),
      btn('Lưu bản mới', '', function () { save(true); }),
      btn('Bản mới', 'btn-ghost', function () {
        TKB.ui.confirm('Tạo bản mới? Thời khoá biểu hiện tại sẽ được thay bằng mẫu (bản đã lưu vẫn còn).').then(function (ok) {
          if (!ok) return;
          TKB.ui.load(TKB.storage.defaultConfig(), { slotId: null });
          TKB.ui.slotId = null;
          toast('Đã tạo bản mới', 'info');
        });
      })
    ]));

    var slotBox = h('div', { class: 'p-save-slots' });
    stack.appendChild(slotBox);
    var slotTok = 0;
    function refreshSlots() {
      var tok = ++slotTok;
      return TKB.storage.listSlots().then(function (list) {
        if (tok !== slotTok) return;
        slotBox.innerHTML = '';
        if (!list.length) { slotBox.appendChild(h('div', { class: 'empty', text: 'Chưa có bản lưu nào.' })); return; }
        list.sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); });
        list.forEach(function (s) {
          var d = s.updated ? new Date(s.updated).toLocaleDateString('vi-VN') : '';
          var acts = h('div', { class: 'p-save-acts' }, [
            slotBtn('Mở', function () {
              return TKB.storage.loadSlot(s.id).then(function (c) { TKB.ui.load(c, { slotId: s.id }); TKB.ui.slotId = s.id; toast('Đã mở "' + s.name + '"', 'ok'); });
            }),
            slotBtn('Đổi tên', function () {
              var n = window.prompt('Tên mới', s.name);
              if (!n || !n.trim()) return;
              n = n.trim();
              return TKB.storage.renameSlot(s.id, n).then(function () {
                if (s.id === TKB.ui.slotId) TKB.ui.update(function (c) { c.name = n; });
                return refreshSlots();
              });
            }),
            slotBtn('Nhân đôi', function () { return TKB.storage.duplicateSlot(s.id).then(function () { toast('Đã nhân đôi', 'ok'); return refreshSlots(); }); }),
            slotBtn('Xoá', function () {
              return TKB.ui.confirm('Xoá bản lưu "' + s.name + '"?').then(function (ok) {
                if (!ok) return;
                return TKB.storage.deleteSlot(s.id).then(function () {
                  if (TKB.ui.slotId === s.id) TKB.ui.slotId = null;
                  return refreshSlots();
                });
              });
            }, true)
          ]);
          var img = h('img', { alt: '', loading: 'lazy' });
          if (s.thumb) img.src = s.thumb;
          slotBox.appendChild(h('div', { class: 'card p-save-slot' + (s.id === TKB.ui.slotId ? ' is-cur' : '') },
            [img, h('div', { class: 'p-save-name', text: s.name, title: s.name }), h('div', { class: 'hint', text: d }), acts]));
        });
      }).catch(function (e) { toast(errMsg(e), 'error'); });
    }
    function slotBtn(text, fn, danger) {
      return btn(text, 'btn-sm ' + (danger ? 'btn-danger' : 'btn-ghost'), function () { run('Đang xử lý…', fn); });
    }

    // ---- Sao lưu
    stack.appendChild(h('div', { class: 'divider' }));
    stack.appendChild(sec('Sao lưu'));
    var impIn = h('input', { type: 'file', accept: '.json,.tkb.json,application/json', hidden: true });
    impIn.addEventListener('change', function () {
      var f = impIn.files && impIn.files[0]; impIn.value = '';
      if (!f) return;
      run('Đang nhập…', function () {
        return TKB.storage.importFile(f).then(function (c) {
          TKB.ui.load(c, { slotId: null }); TKB.ui.slotId = null;
          toast('Đã nhập thời khoá biểu', 'ok');
        });
      });
    });
    stack.appendChild(h('div', { class: 'row' }, [
      btn('Xuất file .tkb.json', '', function () {
        run('Đang xuất…', function () {
          var c = TKB.ui.get();
          return TKB.storage.exportFile(c).then(function (b) {
            TKB.export.download(b, 'tkb-' + slug(c.name) + '.tkb.json');
            toast('Đã xuất file sao lưu', 'ok');
          });
        });
      }),
      btn('Nhập file', '', function () { impIn.click(); }), impIn
    ]));

    // ---- Tải ảnh
    stack.appendChild(h('div', { class: 'divider' }));
    stack.appendChild(sec('Tải ảnh'));
    var fmtBox = h('div', { class: 'seg', role: 'group', 'aria-label': 'Định dạng' });
    var fmts = [['png', 'PNG'], ['jpeg', 'JPG'], ['webp', 'WebP'], ['pdf', 'PDF']];
    var fmtBtns = fmts.map(function (f) {
      var b = h('button', { type: 'button', text: f[1], 'aria-pressed': 'false', onclick: function () { fmt = f[0]; refreshOpts(); } });
      fmtBox.appendChild(b); return b;
    });
    stack.appendChild(fmtBox);

    stack.appendChild(h('div', { class: 'label', text: 'Chất lượng (kích thước ảnh)' }));
    var qBox = h('div', { class: 'p-save-q' });
    stack.appendChild(qBox);
    var qTiles = TKB.QUALITY.map(function (q) {
      var size = h('small');
      var t = h('button', { type: 'button', class: 'tile', 'aria-pressed': 'false', onclick: function () { qid = q.id; refreshOpts(); } },
        [h('strong', { text: q.label }), size]);
      qBox.appendChild(t); return { q: q, t: t, size: size };
    });

    var qOut = h('span', { class: 'hint' });
    var qIn = h('input', { type: 'range', class: 'range', min: 0.5, max: 1, step: 0.01, value: qual, 'aria-label': 'Chất lượng nén' });
    qIn.addEventListener('input', function () { qual = parseFloat(qIn.value); qOut.textContent = Math.round(qual * 100) + '%'; });
    var qRow = h('div', { class: 'field' }, [h('div', { class: 'row' }, [h('span', { class: 'label', text: 'Độ nén' }), qOut]), qIn]);
    stack.appendChild(qRow);

    function curShort() { var q = TKB.QUALITY.filter(function (x) { return x.id === qid; })[0] || TKB.QUALITY[1]; return q.short; }
    function refreshOpts() {
      var c = TKB.ui.get();
      fmtBtns.forEach(function (b, i) { b.setAttribute('aria-pressed', fmts[i][0] === fmt ? 'true' : 'false'); });
      qTiles.forEach(function (o) {
        var on = o.q.id === qid, p = null;
        try { p = TKB.export.pixels(c, o.q.short); } catch (e) { /* ignore */ }
        o.size.textContent = p ? p.w + ' × ' + p.h : '';
        o.t.classList.toggle('is-on', on); o.t.setAttribute('aria-pressed', on);
      });
      qRow.style.display = fmt === 'png' ? 'none' : '';
      qOut.textContent = Math.round(qual * 100) + '%';
    }
    refs.push(refreshOpts);

    function makeOne() {
      var c = TKB.ui.get(), short = curShort();
      return TKB.export.toBlob(c, { short: short, format: fmt, quality: qual }).then(function (b) {
        return { blob: b, name: TKB.export.filename(c, short, fmt) };
      });
    }
    var shareBtn = btn('Chia sẻ / Lưu vào máy', '', function () {
      run('Đang tạo ảnh…', function () {
        return makeOne().then(function (r) {
          return TKB.export.share(r.blob, r.name).then(function (ok) {
            if (!ok) { TKB.export.download(r.blob, r.name); toast('Máy không hỗ trợ chia sẻ, đã tải xuống.', 'info'); }
          });
        }).catch(function (e) { if (e && e.name === 'AbortError') return; throw e; });
      });
    });
    if (!(navigator.share && navigator.canShare)) shareBtn.style.display = 'none';

    stack.appendChild(h('div', { class: 'row' }, [
      btn('Tải ảnh', 'btn-primary', function () {
        run('Đang tạo ảnh…', function () {
          return makeOne().then(function (r) { TKB.export.download(r.blob, r.name); toast('Đã tạo ' + r.name, 'ok'); });
        });
      }),
      btn('Tải tất cả kích cỡ (.zip)', '', function () {
        run('Đang tạo 0/' + TKB.QUALITY.length + '…', function () {
          var c = TKB.ui.get();
          return TKB.export.zipAll(c, {
            shorts: TKB.QUALITY.map(function (q) { return q.short; }), format: fmt, quality: qual,
            onProgress: function (i, n) { statusTxt.textContent = 'Đang tạo ' + i + '/' + n + '…'; }
          }).then(function (b) { TKB.export.download(b, 'tkb-' + slug(c.name) + '-' + fmt + '.zip'); toast('Đã tạo file zip', 'ok'); });
        });
      }),
      shareBtn
    ]));
    stack.appendChild(status);
    stack.appendChild(h('div', { class: 'hint', text: 'Trên điện thoại: sau khi tải, ảnh nằm trong Downloads hoặc Files. Trên iPhone, bấm Chia sẻ rồi chọn Lưu hình ảnh.' }));

    function refreshAll() { refs.forEach(function (f) { f(); }); }
    TKB.ui.on('change', refreshAll);
    TKB.ui.on('load', function () { refreshAll(); refreshSlots(); });
    try { refreshAll(); } catch (e) { /* config not ready yet */ }
    refreshSlots();
  }

  TKB.ui.registerPanel({ id: 'save', title: 'Lưu & Tải', short: 'Tải về', order: 6,
    icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></svg>',
    mount: mount });
})();
