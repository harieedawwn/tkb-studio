# TKB Studio

Web tĩnh giúp học sinh nhập thời khoá biểu và xuất thành hình nền (điện thoại, máy tính bảng, laptop, in giấy). Chạy hoàn toàn trên trình duyệt, không cần cài đặt hay máy chủ.

## Có gì mới (bản 5)
- **Chế độ Cơ bản / Nâng cao** (công tắc trên thanh đầu): Cơ bản chỉ có Lịch → Mẫu → Tải về; Nâng cao mở đủ Nền, Kiểu, Chữ, Vị trí.
- **16 mẫu phong cách** dựng sẵn (Matcha, Tạp chí, Thụy Sĩ, Hội An, Thư pháp, Anh đào, Đêm sao, Biển xanh, Sen hồng, Báo tường, Bảng đen, Pop, Sổ da, Trắng tinh, Viết tay, Giấy kem) — xem trước bằng chính lịch của bạn.
- **5 bố cục mới**: Sổ tay (2 cột, lấp đầy màn dài), Bento, Tạp chí, Thụy Sĩ, Tối giản.
- **~70 phông tiếng Việt mới** (nhóm Nghệ thuật, Thư pháp…), tất cả đã kiểm tra có bộ dấu tiếng Việt.
- **Cài như ứng dụng (PWA)** trên Android, iPhone/iPad (Safari → Chia sẻ → Thêm vào MH chính), Windows/macOS (Chrome/Edge).
- Giao diện điện thoại có thanh tab dưới, nút phóng to bản xem trước.

## Chạy thử trên máy
- Cách 1: mở thư mục dự án trong terminal và chạy `python -m http.server 8000`, rồi vào http://localhost:8000
- Cách 2: bấm đúp `index.html` (chạy được từ file://, nhưng chế độ offline/cài ứng dụng chỉ hoạt động khi qua http://localhost hoặc https).

## Đưa lên GitHub Pages
1. Đăng nhập github.com, bấm **New repository**, đặt tên (ví dụ `tkb-studio`), chọn **Public**, bấm **Create repository**.
2. Bấm **uploading an existing file**, kéo toàn bộ nội dung đã giải nén (có `index.html` ở ngoài cùng, kể cả file `.nojekyll`) vào, bấm **Commit changes**.
3. Vào **Settings → Pages**. Ở mục **Build and deployment**, chọn **Deploy from a branch**, nhánh `main`, thư mục `/ (root)`, bấm **Save**.
4. Đợi 1–2 phút, trang sẽ có địa chỉ `https://<tên-bạn>.github.io/tkb-studio/`.

## Đưa lên Netlify (kéo thả)
1. Giải nén `tkb-studio.zip` ra một thư mục.
2. Vào app.netlify.com/drop (đăng nhập nếu cần).
3. Kéo cả thư mục vào khung. Netlify cấp ngay một địa chỉ; có thể đổi tên ở **Site configuration**.

## Dùng offline
Lần đầu mở trang cần có mạng để tải phông chữ từ Google Fonts. Sau đó trình duyệt lưu lại mã nguồn và các phông đã dùng, nên lần sau mở không có mạng vẫn dùng được. Phông chưa từng dùng khi online sẽ chưa có offline (tạm dùng phông hệ thống). Service worker ưu tiên mạng nên bản mới lên ngay khi có mạng; vẫn nên đổi `VERSION` trong `sw.js` mỗi lần phát hành và thêm tệp mới vào danh sách `FILES`.

## Thêm phông chữ mới
1. Chọn phông trên fonts.google.com có hỗ trợ tiếng Việt (Vietnamese subset).
2. Mở `js/fonts.js`, thêm một dòng vào `TKB.fonts.list`, ví dụ:
   `{ family: 'Tên Phông', group: 'Không chân', weights: [400, 700] }`
   Chỉ ghi những độ đậm thật sự có. `group` là một trong: Nghệ thuật, Thư pháp, Không chân, Có chân, Bo tròn, Hẹp & đậm, Viết tay, Đơn cách. Kiểm tra phông có tiếng Việt: mở link CSS của phông, phải thấy dòng `/* vietnamese */`.
3. Nếu thêm vào `sw.js`: không cần, phông được lưu tự động khi dùng.

## Giới hạn đã biết
- Cần mạng ở lần đầu để có phông Google; phông riêng tải lên được lưu trên máy này.
- Dữ liệu (lịch, ảnh nền, bản lưu) nằm trong trình duyệt; xoá dữ liệu trình duyệt sẽ mất. Hãy xuất tệp `.tkb.json` để sao lưu.
- Ảnh 4K hoặc PDF kích thước lớn có thể thất bại trên điện thoại yếu (thiếu bộ nhớ).
- Chế độ riêng tư có thể không lưu được ảnh nền và bản lưu lâu dài.
- Chia sẻ trực tiếp (Web Share) chỉ có trên một số trình duyệt di động.
