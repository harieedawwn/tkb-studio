/* TKB Studio - panel "data" (Lich) */
(function () {
  'use strict';
  var TKB = window.TKB = window.TKB || {};
  var DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

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
  function blank(n) { var a = []; while (a.length < n) a.push(''); return a; }
  function fit(a, n) { var r = (a || []).slice(0, n); while (r.length < n) r.push(''); return r; }
  function fmt(m) { var hh = Math.floor(m / 60), mm = m % 60; return hh + ':' + (mm < 10 ? '0' : '') + mm; }
  function hasContent(s) {
    return !!s && s.days.some(function (d) { return d.cells.some(function (x) { return x && String(x).trim(); }); });
  }

  var CSS = '' +
    '.p-data-sess{display:flex;flex-direction:column;gap:12px}' +
    '.p-data-head{display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
    '.p-data-step{display:inline-flex;align-items:center;gap:6px}' +
    '.p-data-step b{min-width:28px;text-align:center;font-size:18px}' +
    '.p-data-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%}' +
    '.p-data-tbl{border-collapse:separate;border-spacing:4px}' +
    '.p-data-tbl th{font-size:12px;font-weight:700;color:var(--ink-soft);white-space:nowrap;text-align:center}' +
    '.p-data-pcol{position:sticky;left:0;z-index:2;background:var(--paper);text-align:left!important;padding-right:6px;min-width:60px}' +
    '.p-data-pcol .p-data-time{display:block;width:60px;min-height:34px;margin-top:4px;font-size:13px;padding:4px 6px}' +
    '.p-data-cell{position:relative}' +
    '.p-data-in{width:84px;min-height:44px;padding:6px 6px 6px 20px;font-size:16px;font-weight:600;text-transform:uppercase}' +
    '.p-data-dot{position:absolute;left:7px;top:50%;width:8px;height:8px;margin-top:-4px;border-radius:50%;pointer-events:none;background:transparent}' +
    '.p-data-subj{max-height:150px;overflow-y:auto}';

  function sig(c) {
    return c.data.sessions.map(function (s) {
      return [s.periods, s.times && s.times.length ? 1 : 0, s.days.map(function (d) { return d.label; }).join(',')].join('|');
    }).join('#');
  }

  TKB.ui.registerPanel({
    id: 'data', title: 'Lịch', order: 1,
    icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M9 9v12M15 9v12M3 15h18"/></svg>',
    mount: function (root) {
      if (!document.getElementById('p-data-style')) {
        var stl = h('style', { id: 'p-data-style' }); stl.textContent = CSS; document.head.appendChild(stl);
      }
      var st = { sig: null, refs: [], last: null };

      var titleIn = h('input', { class: 'input', type: 'text', maxlength: 60, 'aria-label': 'Tiêu đề' });
      titleIn.addEventListener('input', function () { upd(function (c) { c.data.title = titleIn.value; }, 'd-title'); });
      var subIn = h('input', { class: 'input', type: 'text', maxlength: 80, 'aria-label': 'Phụ đề' });
      subIn.addEventListener('input', function () { upd(function (c) { c.data.subtitle = subIn.value; }, 'd-sub'); });

      var b1 = h('button', { type: 'button', 'aria-pressed': 'false' }, ['1 buổi']);
      var b2 = h('button', { type: 'button', 'aria-pressed': 'false' }, ['2 buổi']);
      b1.addEventListener('click', function () { setCount(1); });
      b2.addEventListener('click', function () { setCount(2); });

      function setCount(n) {
        var c = cfg(), cur = c.data.sessions.length;
        if (n === cur) return;
        if (n === 1) {
          var cut = function () { upd(function (c2) { c2.data.sessions.length = 1; }); };
          if (hasContent(c.data.sessions[1])) {
            TKB.ui.confirm('Buổi 2 đang có nội dung. Bỏ buổi 2?').then(function (ok) { if (ok) cut(); });
          } else cut();
        } else {
          upd(function (c2) {
            var s1 = c2.data.sessions[0];
            c2.data.sessions.push({
              id: 's2', label: 'Buổi chiều', periods: s1.periods, times: [],
              days: s1.days.map(function (d) { return { label: d.label, cells: blank(s1.periods) }; })
            });
          });
        }
      }

      var box = h('div', { class: 'stack' });

      function focusCell(si, di, p) {
        var r = st.refs[si], i = r && r.inputs[di] && r.inputs[di][p];
        if (i) { i.focus(); return true; }
        return false;
      }

      function onKey(e, si, di, p) {
        var s = cfg().data.sessions[si], t = e.target, k = e.key;
        if (!s) return;
        function go(d2, p2) { if (focusCell(si, d2, p2)) e.preventDefault(); }
        if (k === 'Enter') { e.preventDefault(); if (p + 1 < s.periods) go(di, p + 1); else go(di + 1, 0); }
        else if (k === 'ArrowDown') go(di, p + 1);
        else if (k === 'ArrowUp') go(di, p - 1);
        else if (k === 'ArrowLeft' && t.selectionStart === 0) go(di - 1, p);
        else if (k === 'ArrowRight' && t.selectionEnd === t.value.length) go(di + 1, p);
      }

      function onPaste(e, si, di, p) {
        var t = (e.clipboardData || window.clipboardData).getData('text') || '';
        t = t.replace(/\r/g, '').replace(/\n$/, '');
        if (!/[\n\t]/.test(t)) return;
        e.preventDefault();
        var rows = t.split('\n').map(function (r) { return r.split('\t'); });
        upd(function (c) {
          var s = c.data.sessions[si]; if (!s) return;
          rows.forEach(function (row, ri) {
            var pp = p + ri; if (pp >= s.periods) return;
            row.forEach(function (v, ci) {
              var d = s.days[di + ci];
              if (d) d.cells[pp] = v.replace(/^"|"$/g, '').trim().toUpperCase();
            });
          });
        });
        TKB.ui.toast('Đã dán vào bảng', 'ok');
      }

      function toggleDay(si, label) {
        var s = cfg().data.sessions[si];
        var has = s.days.some(function (d) { return d.label === label; });
        if (has && s.days.length <= 1) { TKB.ui.toast('Cần giữ ít nhất 1 ngày', 'info'); return; }
        upd(function (c) {
          var ss = c.data.sessions[si], i;
          for (i = 0; i < ss.days.length; i++) if (ss.days[i].label === label) break;
          if (i < ss.days.length) ss.days.splice(i, 1);
          else {
            ss.days.push({ label: label, cells: blank(ss.periods) });
            ss.days.sort(function (a, b) { return DAYS.indexOf(a.label) - DAYS.indexOf(b.label); });
          }
        });
      }

      function setPeriods(si, n) {
        n = Math.max(1, Math.min(10, n));
        upd(function (c) {
          var s = c.data.sessions[si];
          if (!s || s.periods === n) return;
          s.periods = n;
          s.days.forEach(function (d) { d.cells = fit(d.cells, n); });
          if (s.times && s.times.length) s.times = fit(s.times, n);
        });
      }

      function build() {
        box.textContent = ''; st.refs = [];
        var c = cfg();
        c.data.sessions.forEach(function (s, si) {
          var r = { chips: {}, inputs: [], dots: [], times: [] }; st.refs[si] = r;
          r.label = h('input', { class: 'input', type: 'text', maxlength: 30, 'aria-label': 'Tên buổi' });
          r.label.addEventListener('input', function () { upd(function (c2) { c2.data.sessions[si].label = r.label.value; }, 'd-lab' + si); });

          var chips = h('div', { class: 'row' });
          DAYS.forEach(function (d) {
            var b = h('button', { type: 'button', class: 'chip', 'aria-pressed': 'false' }, [d]);
            b.addEventListener('click', function () { toggleDay(si, d); });
            r.chips[d] = b; chips.appendChild(b);
          });

          r.minus = h('button', { type: 'button', class: 'btn btn-icon btn-sm', 'aria-label': 'Bớt một tiết' }, ['−']);
          r.plus = h('button', { type: 'button', class: 'btn btn-icon btn-sm', 'aria-label': 'Thêm một tiết' }, ['+']);
          r.pv = h('b', { 'aria-live': 'polite' });
          r.minus.addEventListener('click', function () { setPeriods(si, cfg().data.sessions[si].periods - 1); });
          r.plus.addEventListener('click', function () { setPeriods(si, cfg().data.sessions[si].periods + 1); });

          r.sw = h('input', { type: 'checkbox' });
          r.sw.addEventListener('change', function () {
            upd(function (c2) {
              var ss = c2.data.sessions[si];
              if (r.sw.checked) {
                var a = si === 0 ? 420 : 780, t = [], i;
                for (i = 0; i < ss.periods; i++) t.push(fmt(a + i * 50));
                ss.times = t;
              } else ss.times = [];
            });
          });

          var withTimes = s.times && s.times.length > 0;
          var thead = h('tr', {}, [h('th', { class: 'p-data-pcol', scope: 'col' }, ['Tiết'])]);
          s.days.forEach(function (d) { thead.appendChild(h('th', { scope: 'col' }, [d.label])); r.inputs.push([]); r.dots.push([]); });
          var tbody = h('tbody');
          for (var p = 0; p < s.periods; p++) (function (p) {
            var th = h('th', { class: 'p-data-pcol', scope: 'row' }, ['Tiết ' + (p + 1)]);
            if (withTimes) {
              var ti = h('input', { class: 'input p-data-time', type: 'text', maxlength: 5, placeholder: '7:00', 'aria-label': 'Giờ tiết ' + (p + 1) });
              ti.addEventListener('input', function () {
                upd(function (c2) { var ss = c2.data.sessions[si]; if (ss.times && ss.times.length > p) ss.times[p] = ti.value; }, 'd-time' + si + '-' + p);
              });
              r.times[p] = ti; th.appendChild(ti);
            }
            var tr = h('tr', {}, [th]);
            s.days.forEach(function (d, di) {
              var dot = h('span', { class: 'p-data-dot' });
              var inp = h('input', {
                class: 'input p-data-in', type: 'text', autocomplete: 'off', autocapitalize: 'characters',
                spellcheck: 'false', enterkeyhint: 'next', 'aria-label': d.label + ', tiết ' + (p + 1)
              });
              inp.addEventListener('input', function () {
                var v = inp.value, up = v.toUpperCase();
                if (up !== v) { var pos = inp.selectionStart; inp.value = up; try { inp.setSelectionRange(pos, pos); } catch (e) {} }
                upd(function (c2) { var dd = c2.data.sessions[si].days[di]; if (dd) dd.cells[p] = up; }, 'd-c' + si + '-' + di + '-' + p);
              });
              inp.addEventListener('focus', function () {
                st.last = { si: si, di: di, p: p };
                requestAnimationFrame(function () { if (document.activeElement === inp) inp.select(); });
              });
              inp.addEventListener('keydown', function (e) { onKey(e, si, di, p); });
              inp.addEventListener('paste', function (e) { onPaste(e, si, di, p); });
              r.inputs[di][p] = inp; r.dots[di][p] = dot;
              tr.appendChild(h('td', {}, [h('div', { class: 'p-data-cell' }, [dot, inp])]));
            });
            tbody.appendChild(tr);
          })(p);

          var clr = h('button', { type: 'button', class: 'btn btn-ghost btn-sm' }, ['Xoá buổi này']);
          clr.addEventListener('click', function () {
            upd(function (c2) { var ss = c2.data.sessions[si]; ss.days.forEach(function (d) { d.cells = blank(ss.periods); }); });
          });

          box.appendChild(h('section', { class: 'card p-data-sess' }, [
            h('div', { class: 'field' }, [h('span', { class: 'label' }, ['Tên buổi']), r.label]),
            h('div', { class: 'field' }, [h('span', { class: 'label' }, ['Ngày học']), chips]),
            h('div', { class: 'row p-data-head' }, [
              h('span', { class: 'label' }, ['Số tiết']),
              h('span', { class: 'p-data-step' }, [r.minus, r.pv, r.plus]),
              h('label', { class: 'switch' }, [r.sw, h('span'), ' Giờ học'])
            ]),
            h('div', { class: 'p-data-scroll scroll-x' }, [h('table', { class: 'p-data-tbl' }, [h('thead', {}, [thead]), tbody])]),
            h('div', { class: 'row' }, [clr])
          ]));
        });
      }

      function sync() {
        var c = cfg(), sg = sig(c);
        if (sg !== st.sig) { st.sig = sg; build(); }
        setVal(titleIn, c.data.title); setVal(subIn, c.data.subtitle);
        var n = c.data.sessions.length;
        b1.setAttribute('aria-pressed', String(n === 1)); b2.setAttribute('aria-pressed', String(n === 2));
        c.data.sessions.forEach(function (s, si) {
          var r = st.refs[si]; if (!r) return;
          setVal(r.label, s.label);
          DAYS.forEach(function (d) {
            var on = s.days.some(function (x) { return x.label === d; });
            r.chips[d].classList.toggle('is-on', on); r.chips[d].setAttribute('aria-pressed', String(on));
          });
          r.pv.textContent = s.periods;
          r.minus.disabled = s.periods <= 1; r.plus.disabled = s.periods >= 10;
          r.sw.checked = !!(s.times && s.times.length);
          r.times.forEach(function (ti, p) { setVal(ti, s.times[p]); });
          s.days.forEach(function (d, di) {
            d.cells.forEach(function (v, p) {
              var inp = r.inputs[di] && r.inputs[di][p]; if (!inp) return;
              setVal(inp, v);
              var col = null;
              try { col = v ? TKB.render.subjectColor(c, v) : null; } catch (e) {}
              r.dots[di][p].style.background = col || 'transparent';
            });
          });
        });
      }

      // subject chips
      var subj = h('div', { class: 'row p-data-subj' });
      (TKB.subjects || []).forEach(function (name) {
        var b = h('button', { type: 'button', class: 'chip' }, [name]);
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.addEventListener('click', function () { fillSubject(name); });
        subj.appendChild(b);
      });
      function fillSubject(name) {
        var t = st.last;
        if (!(t && st.refs[t.si] && st.refs[t.si].inputs[t.di] && st.refs[t.si].inputs[t.di][t.p])) {
          t = null;
          cfg().data.sessions.some(function (s, si) {
            return s.days.some(function (d, di) {
              var p = d.cells.findIndex(function (x) { return !x; });
              if (p >= 0) { t = { si: si, di: di, p: p }; return true; }
            });
          });
          if (!t) t = { si: 0, di: 0, p: 0 };
        }
        upd(function (c) { var d = c.data.sessions[t.si].days[t.di]; if (d) d.cells[t.p] = name; });
        st.refs[t.si].inputs[t.di][t.p].value = name;
        var s = cfg().data.sessions[t.si];
        if (!focusCell(t.si, t.di, t.p + 1) && t.di + 1 < s.days.length) focusCell(t.si, t.di + 1, 0);
      }

      var sample = h('button', { type: 'button', class: 'btn btn-ghost' }, ['Nạp lịch mẫu']);
      sample.addEventListener('click', function () {
        TKB.ui.confirm('Thay toàn bộ lịch hiện tại bằng lịch mẫu?').then(function (ok) {
          if (!ok) return;
          var d = JSON.parse(JSON.stringify(TKB.storage.defaultConfig().data));
          upd(function (c) { c.data = d; });
          TKB.ui.toast('Đã nạp lịch mẫu', 'ok');
        });
      });

      root.appendChild(h('div', { class: 'stack p-data-root' }, [
        h('h2', { class: 'p-title' }, ['Lịch học']),
        h('div', { class: 'field' }, [h('span', { class: 'label' }, ['Tiêu đề']), titleIn]),
        h('div', { class: 'field' }, [h('span', { class: 'label' }, ['Phụ đề']), subIn]),
        h('div', { class: 'field' }, [h('span', { class: 'label' }, ['Số buổi']), h('div', { class: 'seg', role: 'group' }, [b1, b2])]),
        box,
        h('div', { class: 'field' }, [
          h('span', { class: 'label' }, ['Môn hay dùng']),
          h('p', { class: 'hint' }, ['Chạm vào một ô rồi chọn môn. Có thể dán từ Excel hoặc Google Sheets vào ô đầu tiên.']),
          subj
        ]),
        h('div', { class: 'row' }, [sample])
      ]));

      TKB.ui.on('change', sync);
      TKB.ui.on('load', function () { st.last = null; sync(); });
      sync();
    }
  });
})();
