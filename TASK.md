# TASK — đợt 2026-11 (Manager lập, Worker = Claude Code)

Mỗi phase = một phiên mới (`/clear` trước khi sang phase sau). Lệnh giao việc:
`Đọc CLAUDE.md rồi làm Phase N trong TASK.md. Không làm phase khác.`
Cuối mỗi phase: `node --check` các file đã sửa, `python3 tools/check.py` phải `SUMMARY bad=0`,
tăng `VERSION` trong sw.js (một lần mỗi phase), tick `[x]` dưới đây, commit và `git push origin HEAD:main`.

| Phase | Nội dung | Model / effort |
|---|---|---|
| 0 | CLAUDE.md, TASK.md, tools/check.py | Manager (đã xong) |
| 1 | Gộp helper trùng, readme, .nojekyll | Sonnet 5.5 · Low |
| 2 | Hệ quy chiếu kích thước + thu phóng | Sonnet 5.5 · High |
| 3 | Chuẩn hoá tên môn + đọc ảnh bằng Gemini | Sonnet 5.5 · Medium |

---

## Phase 1 — Dọn trùng lặp (Low) [ ]
1. Đầu `js/ui-core.js` (trước `var ui = ...`), thêm `TKB.dom = { h, clamp, clone, setVal, slug, cfg, upd }`:
   - `h(tag, props, kids)`: bỏ qua prop `null/undefined/false`; `true` → attribute rỗng; `class`, `text`, `onXxx` như hiện tại; kids bỏ `null/undefined/false`, chuỗi → text node.
   - `setVal(el, v)` = bản ở ui-data.js; `clamp(v,a,b)`; `clone(o)` JSON; `slug(s)` = bản ở ui-library.js;
     `cfg()` = `TKB.ui.get()`; `upd(fn, key)` = `TKB.ui.update(fn, key ? {key:key} : undefined)`.
2. Trong 5 file `ui-data/ui-style/ui-bg-place/ui-look/ui-library.js`: xoá bản sao các hàm trên, thay bằng
   `var D = TKB.dom, h = D.h, ...` (chỉ lấy hàm file đó dùng). `export.js` dùng `TKB.dom.slug` nếu cùng logic
   (export.js nạp trước ui-core → chỉ gọi lúc chạy, không gán lúc nạp file). `presets.js` giữ nguyên `clone` riêng.
   Kiểm tra: `grep -n "function h(\|function setVal\|function slug" js/` chỉ còn trong ui-core.js.
3. `readme.md`: bỏ nhắc `tkb-studio.zip`; thêm file rỗng `.nojekyll` (readme đang nhắc); thêm mục ngắn
   "Cấu trúc thư mục" khớp file thật (dẫn sang CLAUDE.md); sửa câu "Nếu thêm vào sw.js" cho rõ nghĩa.
4. Không đổi hành vi. `tools/check.py` phải bad=0 như trước.

## Phase 2 — Kích thước & thu phóng (High) [ ]
Gốc lỗi: `render.js` `u = W/1080` → màn ngang phình to rồi bị `placement()` ép theo chiều cao;
`place.width` ≥ 0.3; slider `sl[3]` (zoom) ở ui-bg-place.js không được gắn vào DOM; mức Nhỏ 0.74 quá rộng.

Mô hình mới (2 trục độc lập + preset thông minh):
- **Đơn vị**: `u = Math.min(W, H) / 1080` (cạnh ngắn). Màn dọc giữ nguyên như cũ (W là cạnh ngắn).
- **`place.width`** = độ rộng khối TRÊN ẢNH (tỉ lệ W), khoảng 0.12–1.
- **`place.zoom`** = cỡ nội dung (chữ, ô, viền), khoảng 0.25–3. Chiều rộng layout tính bằng
  `layoutW = width*W / s` → zoom đổi cỡ chữ mà không đổi độ rộng khối.
- **`place.preset`** ∈ `mini|s|m|l|null`. Khi khác null, width/zoom tính lại theo tỉ lệ màn hình mỗi lần vẽ:
  `ref = min(W, 0.9*H)`, `width = min(1, k*ref/W)`, `zoom = z`, với
  `mini {k:.45,z:.55}`, `s {k:.74,z:.85}`, `m {k:.86,z:1}`, `l {k:.96,z:1.1}`. Xuất `TKB.render.sizeOf(cfg,W,H)`.
Việc cần làm:
1. `render.js`: thêm `layoutW` vào `makeEnv` (thay `E.bw`). Viết `solve(ctx,cfg,W,H,avg)` dùng chung cho `paint` và
   `render.measure`: `s = zoom`; lặp ≤4 lần: `s = min(s, width*W / (MINW*u))` (MINW ≈ 420, tinh chỉnh để
   không layout nào phải cắt chữ), dựng layout với `layoutW = width*W/s`, nếu `lay.h*s > 0.96H` thì `s *= 0.96H/(lay.h*s)`.
   Cuối cùng an toàn: `s = min(s, 0.96H/lay.h, 0.96W/lay.w)`; giữ nguyên logic kẹp x/y hiện tại.
2. Đếm chữ bị cắt: biến đếm module tăng khi `ellipsize` thực sự cắt; `measure` trả thêm `clipped`.
   `colsFor` (layout cards) chọn số cột theo `layoutW` (vd ≥1500u → 3, ≥900u → 2, còn lại 1) thay vì `W>H`.
3. `TKB.render.corner(cfg, W, H, pos)` với pos `tl|tr|bl|br|c` → `{cx, cy}` là tâm THỰC sau khi đặt khối cách mép 4%
   (lưu tâm thực để kéo thả không có vùng chết).
4. `storage.js normalize`: width 0.12–1, zoom 0.25–3, preset hợp lệ hoặc null; mặc định `place.preset = 'm'`.
   Cấu hình cũ không có preset → null (giữ số cũ). `presets.js`: mẫu phong cách KHÔNG ghi đè width/zoom/preset của người dùng.
5. `ui-bg-place.js` panel Vị trí: gắn `sl[3]` vào DOM, đặt nhãn "Độ rộng khối" và "Cỡ chữ & ô"; kéo slider nào
   thì `preset = null`; slider hiển thị giá trị hiệu lực từ `sizeOf`. Thêm hàng chip preset (Mini/Nhỏ/Vừa/Lớn) và
   hàng "Góc nhanh" (↖ ↗ ↙ ↘ Giữa) dùng `render.corner`. Giữ nút Trên/Giữa/Dưới/Dưới đồng hồ.
6. `ui-style.js` chế độ Cơ bản: `Cỡ bảng` = Mini/Nhỏ/Vừa/Lớn theo `preset`; chọn Mini trên màn ngang (W>H) thì tự
   đặt góc trên-phải bằng `render.corner`.
7. Mở rộng `tools/check.py` (PLACES dùng preset) + thêm kiểm tra, tất cả phải đạt:
   - Mọi layout × mọi tỉ lệ × preset: dragbox nằm trong `#screen`, khớp `measure`, `clipped == 0` với `m`/`l`.
   - 16:9 và 21:9 preset `mini`: rộng ≤ 25% W và cao ≤ 50% H; preset `m`: rộng ≤ 50% W.
   - 9:20 preset `m`: rộng 84–88% W (gần như cũ).
   - `width=1, zoom=3` và `width=0.12, zoom=0.25`: không lỗi, khối vẫn trong màn hình.
   - Kéo thả: dispatch pointerdown/move/up trên dragbox, cx/cy đổi đúng chiều, không lỗi console.

## Phase 3 — Tên môn + đọc ảnh bằng Gemini (Medium) [ ]
A. Chuẩn hoá tên môn (`storage.js`):
1. `TKB.subjects` đổi sang dạng hiển thị: Toán, Văn, Anh, Lý, Hoá, Sinh, Sử, Địa, GDCD, GDKT&PL, GDQP, Tin, CN, HĐTN,
   SHL, Ch.cờ, GDĐP, Thể dục, Âm nhạc, Mĩ thuật, KHTN, KHXH, LS&ĐL, Pháp, Nga, Nhật, Hàn, Trung, Chuyên đề, Tự chọn, Ôn tập.
2. `TKB.canonSubject(s)`: NFC, gộp khoảng trắng; khoá = chữ thường, bỏ `. _ -` và khoảng trắng thừa; so KHỚP NGUYÊN CHUỖI
   với bảng alias (kể cả dạng không dấu). Bắt buộc:
   Chào cờ / Sinh hoạt dưới cờ / SHDC → `Ch.cờ`; NDGDĐP / Giáo dục địa phương / GDĐP → `GDĐP`;
   HĐHN-GVCN / HĐHN_GVCN / HĐTN / Hoạt động trải nghiệm (hướng nghiệp) → `HĐTN`; Tiếng Anh / Anh văn → `Anh`;
   Sinh hoạt / Sinh hoạt lớp / SHL → `SHL`; thêm alias cho mọi môn ở mục 1 (Ngữ văn, Vật lý/lí, Hoá/Hóa học, Lịch sử,
   Địa lý/lí, Tin học, Công nghệ, GDTC/Giáo dục thể chất → Thể dục, GDQP-AN…). Dạng "Toán - Cô Hằng" / "Toán (P.12)":
   nếu phần trước dấu `-`/`(` là alias thì lấy alias. Không khớp → giữ nguyên chuỗi đã gọn.
B. Bỏ tự viết hoa ở `ui-data.js`: xoá `text-transform:uppercase`, các `toUpperCase()` trong input/paste,
   `autocapitalize` → `sentences`. Áp `canonSubject` khi ô `change` (blur) và khi dán. Viết hoa toàn bộ chỉ còn do
   tuỳ chọn `look.upper` trong render.js (giữ nguyên). Dữ liệu cũ viết hoa không chuyển đổi. Màu môn không đổi (khoá thường).
C. `js/ai-import.js` (mới, nạp sau storage.js; thêm vào index.html + sw.js FILES) → `TKB.ai`:
- localStorage: `tkb.ai.key`, `tkb.ai.model` (mặc định `gemini-4-hydrogen`), `tkb.ai.level` (`low|medium`, mặc định `medium`).
  Key KHÔNG vào cfg, lịch sử, bản lưu hay `.tkb.json`. Không ghi key ra console.
- `prepare(blob)`: thu ảnh về cạnh dài ≤ 2048 px, JPEG 0.9 → base64.
- `request(blob)`: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`,
  header `x-goog-api-key`, body `{contents:[{role:'user',parts:[{text:PROMPT},{inlineData:{mimeType,data}}]}],
  generationConfig:{responseMimeType:'application/json', responseSchema:SCHEMA, thinkingConfig:{thinkingLevel:level}}}`.
  Timeout 90 s (AbortController). Ghép `candidates[0].content.parts[].text` (bỏ part có `thought`), bỏ rào ```json, `JSON.parse`.
  Lỗi → thông báo tiếng Việt: 400 (ảnh/tên model), 401/403 (key sai), 429 (hết hạn mức), mạng/timeout.
- SCHEMA: `{sessions:[{label:STRING, periods:INTEGER, times:[STRING], days:[{label:STRING, cells:[STRING]}]}]}` (kiểu OBJECT/ARRAY…).
- `toData(json)` (hàm thuần, test được): 1–2 buổi; nhãn ngày chuẩn hoá (T2, Thứ Hai, Hai, 2 → `Thứ 2` … Chủ nhật → `CN`),
  bỏ trùng, sắp theo thứ tự tuần; `periods` = max(số báo, ô có chữ cuối cùng), kẹp 1–10; cells cắt/đệm theo periods,
  qua `canonSubject`; times dạng `H:MM` hoặc `''`, toàn rỗng → `[]`; id `s1/s2`, nhãn mặc định Buổi sáng/Buổi chiều.
- PROMPT (giữ nguyên ý):
  "Đọc ảnh thời khoá biểu học sinh Việt Nam, trả JSON đúng schema. (1) Mỗi buổi Sáng/Chiều là một session; ảnh chỉ có
  một buổi thì trả 1 session; nhận biết buổi qua chữ Sáng/Chiều, cột Buổi, số tiết đánh lại từ 1, hoặc giờ từ 12:00.
  (2) periods = số hàng tiết thực tế của buổi (1–10), giữ tiết trống ở giữa, bỏ hàng trống ở cuối. (3) days chỉ gồm ngày
  có trên ảnh, label là một trong: Thứ 2, Thứ 3, Thứ 4, Thứ 5, Thứ 6, Thứ 7, CN; cells đúng periods phần tử theo thứ tự
  tiết, ô trống là "". Bảng xoay (ngày theo hàng) vẫn trả theo ngày. (4) times là giờ bắt đầu từng tiết dạng H:MM nếu ảnh
  có, không có thì []. (5) Chỉ ghi tên môn, bỏ tên giáo viên, phòng, lớp; ô gộp nhiều tiết thì lặp tên môn ở mỗi tiết.
  (6) Chuẩn hoá: Chào cờ/Sinh hoạt dưới cờ/SHDC→Ch.cờ; NDGDĐP/Giáo dục địa phương→GDĐP; HĐHN-GVCN/HĐHN_GVCN/Hoạt động
  trải nghiệm→HĐTN; Tiếng Anh→Anh; Sinh hoạt/Sinh hoạt lớp→SHL; môn khác viết hoa chữ đầu (Toán, Văn, Lý, Hoá, Sinh,
  Sử, Địa, Tin, CN, GDCD, GDQP, Thể dục). (7) Không đoán: chữ không đọc được để ""."
D. UI trong panel Lịch (`ui-data.js`), đặt sau các thẻ buổi, trước "Môn hay dùng":
  `<details class="card adv-only p-data-ai">` tiêu đề "Đọc ảnh TKB bằng AI (cần Gemini API key riêng)".
  Bên trong: nút "Chọn ảnh" (file image/*), "Dán ảnh" (`navigator.clipboard.read` nếu có) + bắt sự kiện `paste` có ảnh
  khi focus trong khối; dòng trạng thái (đang đọc…/lỗi). `<details>` con "Cài đặt": ô key `type=password autocomplete=off`,
  ô tên model, seg Mức suy luận Thấp (low)/Vừa (medium), nút Lưu/Xoá key, ghi chú "Key chỉ lưu trên trình duyệt này;
  ảnh được gửi thẳng tới Google". Thiếu key → mở phần Cài đặt và báo.
  Áp kết quả: nếu lịch đang có nội dung thì `TKB.ui.confirm` trước; một lần `TKB.ui.update(fn, {key:'ai-import'})`
  thay `c.data.sessions` (giữ title/subtitle) → Undo trả lại được; toast "Đã điền N buổi, M ngày — bấm Hoàn tác nếu sai".
E. Kiểm tra (không cần key thật): Playwright `page.route('**/generativelanguage.googleapis.com/**')` trả JSON mẫu
  (2 buổi, có "Chào cờ", "HĐHN_GVCN", "Tiếng Anh - Cô Lan", "Sinh hoạt lớp", ngày "T2", "Chủ nhật") → kiểm cfg.data đúng
  (Ch.cờ, HĐTN, Anh, SHL, Thứ 2, CN), Undo khôi phục, khối AI ẩn ở chế độ Cơ bản (`offsetParent === null`),
  `JSON.stringify(TKB.ui.get())` không chứa key, mock 403 → toast lỗi. Cuối cùng `tools/check.py` bad=0.
