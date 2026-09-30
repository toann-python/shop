# Web bán hàng — trang bán + giỏ hàng + khu vực chủ quán

Web tĩnh (HTML/CSS/JS thuần, không cần cài gì), dành cho bán đồ ăn, đồ uống hoặc bất kỳ món nào bạn muốn:

- **Trang bán hàng** (`index.html`): lưới sản phẩm, lọc theo danh mục, tìm kiếm, chạy mượt trên điện thoại ở mọi độ phân giải.
- **Giỏ hàng**: thêm/bớt/xoá, mã ưu đãi, phí giao hàng, tự tính tổng — tối giản, chỉ nhìn là dùng được.
- **Chốt đơn**: bắt buộc nhận **họ tên – số điện thoại – địa chỉ** (kiểm tra số điện thoại Việt Nam), kèm ghi chú tuỳ chọn.
- **Khu vực chủ quán** (`admin.html`): sửa **giá bán**, **logo**, **màu sắc** trang bán hàng, thêm/xoá sản phẩm, xem đơn hàng, sinh mã QR.
- **Máy chủ nhận đơn + đồng bộ cấu hình** (Google Apps Script + Google Sheet): đơn của khách tự về máy chủ, và **món/giá/màu/logo chủ quán sửa cũng tự tới mọi khách**.

Mọi thứ chạy bằng HTML/CSS/JavaScript thuần, không cần build, không cần server riêng.

---

## 1. Chạy thử trên máy

Mở `index.html` bằng trình duyệt là xem được ngay. Muốn chạy qua địa chỉ http (để điện thoại cùng Wi-Fi truy cập được):

```bash
python -m http.server 8000      # Python
npx serve .                    # Node
```

Sau đó mở `http://localhost:8000`.

## 2. Tài khoản chủ quán

| Tài khoản | Mật khẩu |
| --------- | -------- |
| `admin`   | `1234`   |

Đổi mật khẩu: sửa hàm `signIn()` trong `assets/js/data.js` (dòng `if (user === 'admin' && pass === '1234')`).
Phiên đăng nhập tự hết sau 8 giờ. Trước khi đưa web lên mạng, nên đổi mật khẩu này.

## 3. Sửa màu sắc, logo, giá bán

Mở `admin.html` → đăng nhập:

| Muốn làm | Cách làm |
| -------- | -------- |
| **Đổi màu trang bán hàng** | Tab **Cửa hàng → Màu sắc**: chọn *màu nhấn / màu nền / màu chữ* (hoặc bấm 1 trong 4 bảng màu mẫu). Trang bán hàng đổi màu ngay lập tức |
| **Đổi logo** | Tab **Cửa hàng → Logo**: **📷 Chọn logo từ máy** hoặc dán link ảnh. Áp dụng cho trang bán hàng, khu vực chủ quán, bảng in và icon tab trình duyệt |
| **Đổi giá bán** | Tab **Sản phẩm**: sửa ô giá ngay trên bảng, nhấn Enter |
| **Thêm / sửa / xoá sản phẩm** | Nút **+ Thêm sản phẩm**, nút **Sửa**, nút **Xoá**. Có ảnh (tải lên hoặc dán link), emoji dự phòng, đơn vị, giá gạch ngang, cờ *bán chạy*, cờ *đang bán* |
| **Ẩn món hết hàng** | Bỏ tick **Đang bán** trong hộp sửa sản phẩm — khách không thấy món đó nữa |
| **Đổi tên/địa chỉ/hotline/phí giao/mã ưu đãi/danh mục** | Tab **Cửa hàng** |

Màu chọn được tự suy ra thành màu viền, màu chữ phụ, nền ô nhập… nên không bao giờ lệch tông.

> **Lưu ý quan trọng:** thay đổi trong `admin.html` lưu trong trình duyệt của máy chủ quán. Muốn **mọi khách** thấy thay đổi, bấm
> **Cửa hàng → ⬆️ Đẩy món + giá + màu lên web** (cần cấu hình máy chủ ở mục 4). Nếu chưa cấu hình, bản đẩy lên
> GitHub vẫn có sẵn dữ liệu mặc định trong `assets/js/data.js` (`seedMenu()`).

## 4. Bật máy chủ: đơn hàng + đồng bộ cấu hình (khuyên dùng)

Khách đặt đơn trên điện thoại của họ, nên cần một chỗ tập trung. Dự án có sẵn mã máy chủ
(Google Apps Script + Google Sheet, miễn phí):

**Bước 1 — Tạo máy chủ (một lần, khoảng 5 phút)**

1. Tạo 1 file Google Sheet trống: [sheets.google.com](https://sheets.google.com).
2. Trong Sheet: menu **Extensions → Apps Script**.
3. Xoá nội dung sẵn có, dán toàn bộ mã trong [`google-apps-script/Code.gs`](google-apps-script/Code.gs), bấm **Save**.
4. Sửa hằng số `TOKEN` thành chuỗi khó đoán được, ví dụ `shop-` + chuỗi ngẫu nhiên 24 ký tự.
5. Bấm **Deploy → New deployment → Type: Web app**
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
   - Bấm **Deploy**, chấp nhận quyền, rồi **copy link** (link kết thúc bằng `/exec`).

**Bước 2 — Dán vào web**

Mở `assets/js/server-config.js`, điền `url` và `token`, lưu lại rồi commit — đây là lý do khách tự đặt
được mà không cần cài gì:

```js
window.BB_SERVER_CONFIG = {
  url: 'https://script.google.com/macros/s/AKfycb....../exec',
  token: 'shop-<chuỗi-ngẫu-nhiên-của-bạn>',
  shop: 'Tên cửa hàng của bạn'
};
```

**Bước 3 — Kiểm tra trong khu vực chủ quán**

1. `admin.html` → **Cửa hàng → Máy chủ** → dán link `/exec` + TOKEN → **💾 Lưu & kiểm tra**.
   Phải hiện *“✓ Kết nối được”*.
2. Bấm **⬆️ Đẩy món + giá + màu lên web** → mọi khách mở web là thấy giá/màu mới (tối đa 5 phút sau).
3. Đặt một đơn thử trên trang bán hàng → mở Google Sheet là thấy dòng đơn mới.
4. Quay lại `admin.html` → **Đơn hàng** → **🔄 Đồng bộ đơn**.

Đơn trong bảng *Đơn hàng* có nhãn **☁️ server** (đã về máy chủ) hoặc **📱 máy này** (chỉ có trên máy chủ quán).
**Nếu khách mất mạng lúc đặt**: đơn nằm trong hàng đợi trên máy khách và tự gửi lại ngay khi có mạng.

> **Bảo mật**: link `/exec` + TOKEN nằm trong file công khai của web. TOKEN chỉ chặn người đoán mò, không chặn
> người cố ý đọc mã nguồn — hãy dùng TOKEN dài và đổi lại trong `Code.gs` nếu bị lộ. Google Sheet mặc định
> *không* công khai: người có link mới mở được. Không nên đưa web này vào dữ liệu cực kỳ nhạy cảm.

## 5. Đưa lên GitHub Pages (miễn phí)

```bash
git init
git add .
git commit -m "Web ban hang"
git branch -M main
git remote add origin https://github.com/<tài-khoản-của-bạn>/<tên-repo>.git
git push -u origin main
```

Trên GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → chọn `main` / `root` → Save**.

Chờ 1–2 phút, web sẽ ở địa chỉ:

```
https://<tài-khoản-của-bạn>.github.io/<tên-repo>/
```

Không có Git trên máy thì tạo repo trên <https://github.com/new> rồi kéo thả toàn bộ thư mục này vào
(repo phải để **Public**), sau đó bật Pages như trên.

> Đây là web tĩnh nên mọi đường dẫn đều tương đối — đổi tên repo hay đổi tài khoản cũng chạy được.

## 6. Mã QR dẫn tới web

1. Vào `admin.html` → đăng nhập → tab **Cửa hàng** → dán link GitHub Pages vào ô *URL web (cho QR)* → **Lưu thông tin**.
2. Sang tab **Mã QR** → **🔄 Vẽ lại mã** → **⬇️ Tải PNG** (ảnh nền trắng, in rõ nét).
3. Bấm **🧾 Xem bảng giá + QR để in** để mở poster in được (nút *In / Lưu PDF*).

Mỗi lần dán mã lên bàn/bảng, QR vẫn trỏ đúng web hiện tại — không cần in lại khi đổi tên món.

## 7. Mã ưu đãi có sẵn

| Mã | Tác dụng |
| -- | -------- |
| `BUNBO10` | Giảm 10% |
| `GIAM20K` | Giảm thẳng 20.000 ₫ |
| `FREESHIP` | Miễn phí giao hàng |

Tạo mã mới ở tab *Cửa hàng → Mã ưu đãi*.

## 8. Cấu trúc thư mục

```
index.html                    trang bán hàng
admin.html                    khu vực chủ quán (đăng nhập admin/1234)
poster.html                   bảng giá + mã QR để in
google-apps-script/Code.gs    máy chủ nhận đơn + lưu cấu hình (Google Apps Script + Sheet)
assets/css/style.css          toàn bộ giao diện (màu lấy từ biến --accent/--bg/--text)
assets/js/data.js             dữ liệu: sản phẩm, giỏ hàng, đơn, tài khoản, tính tiền, màu sắc
assets/js/remote.js           gửi/nhận đơn + đồng bộ cấu hình với máy chủ
assets/js/server-config.js    link /exec và TOKEN (dán vào đây rồi commit)
assets/js/app.js              logic trang bán hàng
assets/js/admin.js            logic khu vực chủ quán
assets/js/qr.js               vẽ mã QR (thư viện qrcode-generator, chạy offline)
assets/vendor/qrcode.js
```

## 9. Sao lưu dữ liệu

Tab *Cửa hàng → Dữ liệu*: **⬇️ Xuất JSON** để lưu lại, **⬆️ Nhập JSON** để nạp lại trên máy khác,
**♻️ Khôi phục danh sách mặc định** để quay về bộ sản phẩm gốc.
