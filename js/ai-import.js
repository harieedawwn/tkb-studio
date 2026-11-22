/* TKB Studio - ai-import.js: doc anh thoi khoa bieu bang Gemini (key do nguoi dung tu cung cap). */
(function () {
  'use strict';
  var TKB = window.TKB = window.TKB || {};

  var LS_KEY = 'tkb.ai.key', LS_MODEL = 'tkb.ai.model', LS_LEVEL = 'tkb.ai.level';
  var DEFAULT_MODEL = 'gemini-4-hydrogen';
  var MAX_SIDE = 2048, TIMEOUT = 45000;
  var DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

  var PROMPT = 'Đọc ảnh thời khoá biểu học sinh Việt Nam, trả JSON đúng schema. ' +
    '(1) Mỗi buổi Sáng/Chiều là một session; ảnh chỉ có một buổi thì trả 1 session; nhận biết buổi qua chữ Sáng/Chiều, cột Buổi, số tiết đánh lại từ 1, hoặc giờ từ 12:00. ' +
    '(2) periods = số hàng tiết thực tế của buổi (1–10), giữ tiết trống ở giữa, bỏ hàng trống ở cuối. ' +
    '(3) days chỉ gồm ngày có trên ảnh, label là một trong: Thứ 2, Thứ 3, Thứ 4, Thứ 5, Thứ 6, Thứ 7, CN; cells đúng periods phần tử theo thứ tự tiết, ô trống là "". Bảng xoay (ngày theo hàng) vẫn trả theo ngày. ' +
    '(4) times là giờ bắt đầu từng tiết dạng H:MM nếu ảnh có, không có thì []. ' +
    '(5) Chỉ ghi tên môn, bỏ tên giáo viên, phòng, lớp; ô gộp nhiều tiết thì lặp tên môn ở mỗi tiết. ' +
    '(6) Chuẩn hoá: Chào cờ/Sinh hoạt dưới cờ/SHDC→Ch.cờ; NDGDĐP/Giáo dục địa phương→GDĐP; HĐHN-GVCN/HĐHN_GVCN/Hoạt động trải nghiệm→HĐTN; Tiếng Anh→Anh; Sinh hoạt/Sinh hoạt lớp→SHL; ' +
    'môn khác viết hoa chữ đầu (Toán, Văn, Lý, Hoá, Sinh, Sử, Địa, Tin, CN, GDCD, GDQP, Thể dục). ' +
    '(7) Không đoán: chữ không đọc được để "".';

  var SCHEMA = {
    type: 'OBJECT',
    properties: {
      sessions: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            label: { type: 'STRING' },
            periods: { type: 'INTEGER' },
            times: { type: 'ARRAY', items: { type: 'STRING' } },
            days: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: { label: { type: 'STRING' }, cells: { type: 'ARRAY', items: { type: 'STRING' } } },
                required: ['label', 'cells']
              }
            }
          },
          required: ['label', 'periods', 'days']
        }
      }
    },
    required: ['sessions']
  };

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null || v === '') localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

  function getSettings() {
    var lv = lsGet(LS_LEVEL);
    return {
      key: lsGet(LS_KEY) || '',
      model: lsGet(LS_MODEL) || DEFAULT_MODEL,
      level: lv === 'medium' ? 'medium' : 'low'
    };
  }
  function saveSettings(o) {
    if (o.key !== undefined) lsSet(LS_KEY, String(o.key).trim());
    if (o.model !== undefined) lsSet(LS_MODEL, String(o.model).trim() === DEFAULT_MODEL ? '' : String(o.model).trim());
    if (o.level !== undefined) lsSet(LS_LEVEL, o.level === 'medium' ? 'medium' : 'low');
  }

  /* ---------- day label / time normalisation ---------- */
  function dayLabel(s) {
    var t = String(s == null ? '' : s).toLowerCase().normalize('NFC').replace(/[.\s]+/g, ' ').trim();
    var plain = t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
    if (/^(cn|chu nhat|chunhat)$/.test(plain)) return 'CN';
    var m = /^(?:thu |t)?\s*(hai|ba|tu|nam|sau|bay|[2-8])$/.exec(plain);
    if (!m) return null;
    var map = { hai: 2, ba: 3, tu: 4, nam: 5, sau: 6, bay: 7 };
    var n = map[m[1]] || Number(m[1]);
    if (n === 8) return 'CN';
    return n >= 2 && n <= 7 ? 'Thứ ' + n : null;
  }
  function timeStr(v) {
    var m = /^\s*(\d{1,2})\s*[:hH.]\s*(\d{1,2})?\s*$/.exec(String(v == null ? '' : v));
    if (!m) return '';
    var hh = Number(m[1]), mm = m[2] ? Number(m[2]) : 0;
    if (hh > 23 || mm > 59) return '';
    return hh + ':' + (mm < 10 ? '0' : '') + mm;
  }

  /* ---------- json -> data.sessions (pure) ---------- */
  function toData(json) {
    var src = json && Array.isArray(json.sessions) ? json.sessions.slice(0, 2) : [];
    var sessions = [];
    src.forEach(function (s) {
      if (!s || typeof s !== 'object') return;
      var byLabel = {};
      (Array.isArray(s.days) ? s.days : []).forEach(function (d) {
        if (!d) return;
        var lb = dayLabel(d.label);
        if (!lb || byLabel[lb]) return;
        byLabel[lb] = Array.isArray(d.cells) ? d.cells.map(function (x) { return TKB.canonSubject(x); }) : [];
      });
      var labels = DAYS.filter(function (l) { return byLabel[l]; });
      if (!labels.length) return;
      var last = 0;
      labels.forEach(function (l) {
        byLabel[l].forEach(function (x, i) { if (x && i + 1 > last) last = i + 1; });
      });
      var np = Number(s.periods);
      if (!isFinite(np)) np = 0;
      var P = Math.min(10, Math.max(1, Math.round(Math.max(np, last))));
      var i = sessions.length;
      var times = (Array.isArray(s.times) ? s.times : []).slice(0, P).map(timeStr);
      while (times.length < P) times.push('');
      var anyT = times.some(function (x) { return x; });
      var lab = String(s.label == null ? '' : s.label).replace(/\s+/g, ' ').trim().slice(0, 30);
      sessions.push({
        id: 's' + (i + 1),
        label: lab || (i === 0 ? 'Buổi sáng' : 'Buổi chiều'),
        periods: P,
        times: anyT ? times : [],
        days: labels.map(function (l) {
          var c = byLabel[l].slice(0, P);
          while (c.length < P) c.push('');
          return { label: l, cells: c };
        })
      });
    });
    return sessions;
  }

  /* ---------- image prep ---------- */
  function prepare(blob) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob), img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, MAX_SIDE / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
          var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
          var cx = cv.getContext('2d');
          cx.fillStyle = '#fff'; cx.fillRect(0, 0, cw, ch);
          cx.drawImage(img, 0, 0, cw, ch);
          var data = cv.toDataURL('image/jpeg', 0.9).split(',')[1];
          URL.revokeObjectURL(url);
          resolve({ mimeType: 'image/jpeg', data: data });
        } catch (e) { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh này.')); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh này. Hãy chọn ảnh PNG, JPEG hoặc WebP khác.')); };
      img.src = url;
    });
  }

  var RETRY = { 429: 1, 500: 1, 502: 1, 503: 1, 504: 1 };

  function httpError(status, msg) {
    var base;
    if (status === 400) base = 'Gemini không nhận yêu cầu (ảnh hoặc tên model).';
    else if (status === 401 || status === 403) base = 'API key không đúng hoặc không có quyền.';
    else if (status === 404) base = 'Không có model này. Hãy sửa tên model trong Cài đặt (bấm "Kiểm tra key" để xem tên đúng).';
    else if (status === 429) base = 'Đã hết hạn mức dùng Gemini. Hãy đợi một lúc rồi thử lại.';
    else if (status === 503 || status === 500 || status === 502 || status === 504) base = 'Máy chủ Gemini đang quá tải hoặc xử lý quá lâu (' + status + ').';
    else base = 'Gemini báo lỗi (' + status + ').';
    var e = new Error(msg ? base + ' Chi tiết: ' + msg : base);
    e.status = status;
    return e;
  }
  // read Google's own error text (never contains the key); keep it short
  function readError(r) {
    return r.text().then(function (t) {
      var m = '';
      try { var j = JSON.parse(t); m = (j.error && (j.error.message || j.error.status)) || ''; } catch (e) { m = t || ''; }
      m = String(m).replace(/\s+/g, ' ').trim();
      if (m.length > 220) m = m.slice(0, 217) + '…';
      throw httpError(r.status, m);
    }, function () { throw httpError(r.status, ''); });
  }
  function wait(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

  function parseText(res) {
    var cand = res && res.candidates && res.candidates[0];
    var parts = cand && cand.content && cand.content.parts || [];
    var txt = parts.filter(function (p) { return p && !p.thought && typeof p.text === 'string'; })
      .map(function (p) { return p.text; }).join('');
    txt = txt.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    if (!txt) {
      var why = (cand && cand.finishReason) || (res && res.promptFeedback && res.promptFeedback.blockReason) || '';
      throw new Error('Gemini không trả kết quả' + (why ? ' (' + why + ')' : '') + '. Hãy thử lại hoặc dùng ảnh rõ hơn.');
    }
    try { return JSON.parse(txt); } catch (e) { throw new Error('Không hiểu kết quả của Gemini. Hãy thử lại.'); }
  }

  // one HTTP call
  function callOnce(key, model, level, img) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, TIMEOUT);
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
    var gc = { responseMimeType: 'application/json', responseSchema: SCHEMA, thinkingConfig: { thinkingLevel: level } };
    var text = PROMPT;
    var body = { contents: [{ role: 'user', parts: [{ text: text }, { inlineData: { mimeType: img.mimeType, data: img.data } }] }], generationConfig: gc };
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) {
        var ra = parseFloat(r.headers.get('Retry-After'));
        return readError(r).catch(function (e) { if (ra > 0) e.retryAfter = ra * 1000; throw e; });
      }
      return r.json().then(parseText);
    }, function () {
      clearTimeout(timer);
      var e = new Error('Không kết nối được tới Gemini (mạng yếu hoặc quá ' + Math.round(TIMEOUT / 1000) + ' giây).');
      e.status = 0;
      throw e;
    });
  }

  // Models that answered fast and read tables correctly (tested 2026-11-22). Tried in order after the user's model.
  var FALLBACKS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];
  // user's model (one retry on overload), then each fallback model; 400/401/403 stop at once
  function request(blob, onStatus) {
    var cfg = getSettings(), say = typeof onStatus === 'function' ? onStatus : function () {};
    if (!cfg.key) return Promise.reject(new Error('Chưa có API key. Hãy nhập key trong phần Cài đặt.'));
    var plan = [{ model: cfg.model, msg: 'Đang đọc ảnh bằng ' + cfg.model + '…' },
      { model: cfg.model, msg: cfg.model + ' đang bận, thử lại…', delay: 2000 }];
    FALLBACKS.forEach(function (m) {
      if (m !== cfg.model) plan.push({ model: m, msg: 'Model đang bận, chuyển sang ' + m + '…', delay: 500 });
    });
    return prepare(blob).then(function (img) {
      var i = 0, last = null, first = null;
      function next() {
        if (i >= plan.length) throw first || last;
        var st = plan[i++], d = st.delay || 0;
        // a missing model is not worth a retry on the same name
        if (last && last.status === 404 && st.model === cfg.model) return next();
        if (last && last.retryAfter && st.model === cfg.model) d = Math.min(10000, Math.max(d, last.retryAfter));
        return wait(d).then(function () {
          say(st.msg);
          return callOnce(cfg.key, st.model, cfg.level, img);
        }).then(function (json) {
          if (st.model !== cfg.model) json.__model = st.model;
          return json;
        }).catch(function (e) {
          last = e; if (!first) first = e;
          if (e && (e.status === 0 || e.status === 404 || RETRY[e.status])) return next();
          throw e;
        });
      }
      return next();
    });
  }

  // quick diagnosis: is the key valid and does the model name exist?
  function check() {
    var cfg = getSettings();
    if (!cfg.key) return Promise.reject(new Error('Chưa có API key.'));
    return fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': cfg.key } })
      .then(function (r) {
        if (!r.ok) return readError(r);
        return r.json().then(function (j) {
          var names = (j.models || []).filter(function (m) {
            return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0;
          }).map(function (m) { return String(m.name || '').replace(/^models\//, ''); });
          return { ok: names.indexOf(cfg.model) >= 0, model: cfg.model, names: names };
        });
      }, function () { throw new Error('Không kết nối được tới Gemini.'); });
  }

  TKB.ai = {
    PROMPT: PROMPT, SCHEMA: SCHEMA, DEFAULT_MODEL: DEFAULT_MODEL,
    getSettings: getSettings, saveSettings: saveSettings,
    prepare: prepare, request: request, check: check, toData: toData
  };
})();
