# TKB Studio — hướng dẫn cho Claude Code

Web tĩnh tạo hình nền thời khoá biểu. Không framework, không build, không npm cho app.
Việc cần làm nằm ở `TASK.md` — chỉ làm đúng phase được giao, xong thì đánh dấu `[x]`.

## Git (bắt buộc, luôn làm trên main)
- Đầu phiên: `git fetch origin && git checkout -B main origin/main`
- Cuối phiên: commit gọn (tiếng Việt hoặc Anh), rồi `git push origin HEAD:main`
- Không tạo/push nhánh `claude/*` hay nhánh phụ nào. Không mở PR.

## Quy ước code
- ES5 thuần: `var`, `function`, IIFE `(function(){ 'use strict'; ... })();`. Không `let/const`, arrow, class, template string, async/await, module.
- Mỗi file gắn API vào biến toàn cục `window.TKB` (`var TKB = window.TKB = window.TKB || {};`).
- Thứ tự `<script>` trong `index.html` là thứ tự phụ thuộc; file mới phải được chèn đúng chỗ.
- Panel UI tự chèn CSS riêng bằng `<style id="p-xxx-style">`; CSS chung ở `css/app.css`.
- Mọi thay đổi cấu hình đi qua `TKB.ui.update(fn, {key})` (tự ghi lịch sử Undo, lưu, vẽ lại).
- Chuẩn hoá/ràng buộc dữ liệu cấu hình nằm ở `TKB.storage.normalize` (storage.js).
- Chữ hiển thị tiếng Việt có dấu. Phần tử chỉ hiện ở chế độ Nâng cao: class `adv-only`.

## Service worker (sw.js) — bắt buộc
- Thêm/sửa/xoá BẤT KỲ file nào được app tải → tăng `VERSION` (`tkb-vN` → `tkb-vN+1`).
- File mới/xoá → cập nhật mảng `FILES` cho khớp `index.html`. Không cache `tools/`, `*.md`.

## Bản đồ file
- `index.html` — khung trang, thứ tự script.
- `css/app.css` — giao diện chung, biến màu, `.adv-only/.basic-only`.
- `sw.js` — cache offline (VERSION, FILES), font Google cache riêng.
- `js/devices.js` — danh sách tỉ lệ màn hình, `detect/flip/byRatio/pixels`, `TKB.QUALITY`.
- `js/patterns.js` — hoạ tiết nền vẽ bằng canvas.
- `js/themes.js` — bảng màu (theme).
- `js/fonts.js` — danh sách phông Google + tải phông (`TKB.fonts.ensure`).
- `js/presets.js` — 16 mẫu phong cách, `apply` lên cấu hình.
- `js/storage.js` — cấu hình mặc định, `normalize`, IndexedDB, ảnh, nhập/xuất `.tkb.json`, `TKB.subjects`.
- `js/render.js` — engine Canvas: `makeEnv` (đơn vị u), 10 layout, nền, `placement`, `render/measure`.
- `js/export.js` — xuất PNG/JPEG/WebP/PDF/ZIP, chia sẻ.
- `js/ui-core.js` — state, lịch sử Undo/Redo, vẽ preview, dragbox kéo thả, tab, toast, confirm, chế độ.
- `js/ui-data.js` — panel Lịch: buổi, ngày, số tiết, giờ, ô môn, dán từ Excel.
- `js/ui-style.js` — panel Mẫu: preset, layout, cỡ bảng nhanh (chế độ Cơ bản).
- `js/ui-bg-place.js` — panel Nền và panel Vị trí (vị trí, độ rộng, cỡ, tỉ lệ màn hình).
- `js/ui-look.js` — panel Kiểu và panel Chữ.
- `js/ui-library.js` — panel Lưu & Tải (bản lưu, xuất file).
- `js/pwa.js` — đăng ký SW, nút cài đặt, báo bản mới.
- `tools/check.py` — kiểm tra bố cục tự động (không thuộc app).

## Kiểm tra (tiết kiệm token)
- Cấm dùng subagent và tìm kiếm web.
- Không chụp ảnh màn hình. Kiểm tra bằng số liệu: `python3 tools/check.py` (đủ) hoặc `--quick`.
  Script chạy 10 layout × tỉ lệ 9:20/16:9/21:9 × khung điện thoại 412×915 và máy tính 1600×900,
  đo `getBoundingClientRect` của dragbox so với `#screen`, so với `TKB.render.measure`, tràn ngang trang, lỗi console.
- Cần thử luồng riêng: viết `page.evaluate` ngắn trong Playwright, in JSON gọn; giả lập mạng bằng `page.route`.
- Chỉ đọc đoạn file cần sửa (`grep -n`, `sed -n a,bp`), không đọc lại cả file lớn.
- Lỗi cú pháp nhanh: `node --check js/<file>.js`.
