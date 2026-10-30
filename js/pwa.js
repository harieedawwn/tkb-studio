/* TKB Studio - PWA: service worker, install button (Android/desktop prompt, iOS instructions), update notice. */
(function () {
  'use strict';
  var TKB = window.TKB = window.TKB || {};
  var btn = document.getElementById('install'), deferred = null;
  var ua = navigator.userAgent || '';
  var ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  function standalone() {
    return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  }
  function toast(t, k) { if (TKB.ui && TKB.ui.toast) TKB.ui.toast(t, k); }

  // service worker: only on https or localhost
  try {
    var h = location.hostname;
    var ok = location.protocol === 'https:' || h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
    if (ok && 'serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').then(function (reg) {
          reg.addEventListener('updatefound', function () {
            var w = reg.installing; if (!w) return;
            w.addEventListener('statechange', function () {
              if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Đã có bản mới. Tải lại trang để dùng.', 'info');
            });
          });
        }).catch(function () {});
      });
    }
  } catch (e) {}

  if (!btn || standalone()) return;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e; btn.hidden = false;
  });
  window.addEventListener('appinstalled', function () {
    deferred = null; btn.hidden = true; toast('Đã cài TKB Studio. Mở từ màn hình chính nhé!', 'ok');
  });
  if (ios) btn.hidden = false;

  function iosHelp() {
    var back = document.createElement('div'); back.className = 'modal-back';
    back.innerHTML =
      '<div class="modal install-help" role="dialog" aria-modal="true" aria-labelledby="ih-t">' +
      '<h2 id="ih-t" class="p-title">Cài lên iPhone / iPad</h2>' +
      '<ol><li>Mở trang này bằng <b>Safari</b>.</li>' +
      '<li>Bấm nút <b>Chia sẻ</b> <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5v10h14V11h-1"/></svg> ở thanh dưới.</li>' +
      '<li>Chọn <b>Thêm vào MH chính</b> rồi bấm <b>Thêm</b>.</li></ol>' +
      '<div class="modal-actions"><button type="button" class="btn btn-primary">Đã hiểu</button></div></div>';
    document.body.appendChild(back);
    var close = function () { if (back.parentNode) back.parentNode.removeChild(back); };
    back.querySelector('button').addEventListener('click', close);
    back.addEventListener('pointerdown', function (e) { if (e.target === back) close(); });
    back.querySelector('button').focus();
  }

  btn.addEventListener('click', function () {
    if (deferred) {
      deferred.prompt();
      Promise.resolve(deferred.userChoice).then(function (r) { if (r && r.outcome === 'accepted') btn.hidden = true; });
      deferred = null;
    } else if (ios) iosHelp();
    else toast('Mở menu trình duyệt và chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”.', 'info');
  });
})();
