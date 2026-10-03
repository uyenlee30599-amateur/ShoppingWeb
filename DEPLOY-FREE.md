# Deploy miễn phí: Render + Atlas + Cloudinary + SendGrid trial

Mã phục vụ Client `/`, Admin `/admin/`, API `/api`, Socket.IO `/socket.io` trên cùng một Web Service. Local vẫn có ba ứng dụng trên ba port. Chưa có dịch vụ online được tạo hoặc tài khoản cloud được cấu hình bởi agent.

Render Free và Atlas Free/M0 phù hợp cho demo. Cloudinary Free có quota. SendGrid là trial 60 ngày, tối đa 100 email/ngày, không phải miễn phí lâu dài. Không chọn paid plan hoặc nâng cấp nếu không muốn trả phí. Kiểm tra lại màn hình đăng ký và ngày hết trial của tài khoản trước khi đồng ý.

## 1. MongoDB Atlas

1. Đăng ký/đăng nhập Atlas. Tạo project `Boutique-Assignment03` và cluster **Free/M0**, không chọn Flex/Dedicated trả phí. Chọn region gần Render nếu có.
2. Database Access: tạo user `boutique_app`, mật khẩu ngẫu nhiên. Chọn quyền cụ thể `readWrite` trên database `boutique`, hạn chế vào cluster bài này; không cần Atlas Admin.
3. Network Access: thêm **IP hiện tại của máy bạn**. Không chọn `0.0.0.0/0`.
4. Cluster → Connect → Drivers → Node.js: sao chép URI; đặt database `boutique` sau host và trước `?`:

```text
mongodb+srv://boutique_app:<PASSWORD>@<CLUSTER>/boutique?retryWrites=true&w=majority
```

Thay placeholder riêng trên máy/Render. URL-encode mật khẩu nếu có ký tự đặc biệt. Database user khác tài khoản đăng nhập Atlas. Không gửi URI đầy đủ qua chat hoặc đưa lên GitHub.

## 2. Cloudinary Free

1. Tạo tài khoản **Image and Video API / Free**. Không cần mua domain hoặc thêm disk Render.
2. Trong Console, chọn đúng product environment, ghi lại **Cloud name**. Vào Settings → API Keys để lấy **API key**, **API secret**.
3. Không cần unsigned upload preset. Backend ký yêu cầu upload bằng secret và chỉ Admin được tạo sản phẩm.

Biến môi trường backend:

```dotenv
IMAGE_STORAGE=cloudinary
CLOUDINARY_CLOUD_NAME=cloud-name-cua-ban
CLOUDINARY_API_KEY=api-key-cua-ban
CLOUDINARY_API_SECRET=api-secret-cua-ban
```

Ảnh tạo mới được lưu Cloudinary, URL HTTPS được lưu Atlas. Không xóa ảnh thủ công còn được sản phẩm hoặc đơn lịch sử tham chiếu. Sản phẩm soft-delete vẫn giữ ảnh cho lịch sử. Upload thất bại giữa chừng được dọn theo khả năng của dịch vụ; nếu mạng bị ngắt/tiến trình dừng, có thể còn ảnh chưa gắn sản phẩm, xem Media Library để đối chiếu khi cần. Ảnh cũ trong local `/uploads` không tự chuyển lên Cloudinary; tạo lại sản phẩm demo trên online nếu cần.

## 3. SendGrid trial và Nodemailer

1. Tạo tài khoản trial SendGrid, hoàn thành xác minh/duyệt tài khoản nếu dịch vụ yêu cầu. Kiểm tra ngày hết trial trong Dashboard.
2. Settings → Sender Authentication → Single Sender Verification: thêm email bạn sở hữu, điền thông tin trung thực và xác minh qua email. Không cần mua domain cho demo Single Sender; gửi thực tế còn tùy việc tài khoản được phép gửi.
3. Settings → API Keys → Create API Key: chọn **Restricted Access**, chỉ bật **Mail Send** cần thiết. Sao chép key vào nơi giữ secret riêng; không chọn Full Access nếu không cần.
4. Dùng cổng `2525`, vì Render Free chặn `25`, `465`, `587`. Code yêu cầu STARTTLS, không tắt TLS để xử lý lỗi.

```dotenv
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=2525
SMTP_USER=apikey
SMTP_PASS=API_KEY_SENDGRID_CUA_BAN
MAIL_FROM=email-gui-da-xac-minh@example.com
```

`SMTP_USER` là chữ `apikey`; mật khẩu SMTP là API key, không phải mật khẩu tài khoản. Email người nhận do người mua điền ở Checkout. Chỉ thử với hộp thư bạn sở hữu. Email sẽ dừng sau khi trial hết hạn nếu không nâng cấp; ghi rõ trong thông tin nộp bài.

## 4. Import dữ liệu Atlas từ máy

Tại gốc folder bài, nếu chưa có `.env`, sao chép `.env.example` thành `.env`. Nếu đã có `.env`, chỉnh file hiện có, không ghi đè cấu hình riêng. Tự đặt `MONGODB_URI` trỏ **Atlas database boutique**. Lệnh này chỉ cần URI:

```bash
npm run seed
```

Kết quả mong đợi: đã import 8 sản phẩm. Lệnh giữ nguyên các sản phẩm đã tồn tại, không xóa database. Dữ liệu tài khoản/đơn local không tự chuyển lên Atlas.

## 5. GitHub

Tạo repository `boutique-assignment03`, có thể chọn Private. Với repo mới để trống, không tạo sẵn README/license để tránh xung đột. Nếu bài đã có Git/repo, dùng repo hiện có và bỏ qua bước init/remote.

Chạy từng lệnh tại folder bài:

```bash
git init
git branch -M main
git add .
git status
git diff --cached --name-only
```

Kiểm tra danh sách **không chứa `.env`, `server/private`, `node_modules`, API key hoặc mật khẩu**. `.env.example` chỉ chứa placeholder được phép commit. `.gitignore` đã loại trừ secret local. Không dùng `git add -f` với secret. Nếu vô tình lộ secret, thu hồi/đổi secret trước khi tiếp tục; chỉ xóa file khỏi commit mới không đủ.

Sau khi kiểm tra:

```bash
git commit -m "Prepare assignment for Render Free deployment"
git remote add origin https://github.com/TEN-GITHUB/boutique-assignment03.git
git push -u origin main
```

Thay `TEN-GITHUB`. Xác thực GitHub qua trình duyệt/Git credential manager; không gửi token qua chat. Khi kết nối Render, chỉ cấp repository này thay vì mọi repository.

## 6. Render Free

Dùng **New → Web Service**, không chọn Static Site, kết nối repository GitHub. Nếu Render đưa ra bước thanh toán/nâng cấp ngoài Free thì dừng và kiểm tra lựa chọn.

| Mục               | Giá trị                                        |
| ----------------- | ---------------------------------------------- |
| Name              | `boutique-assignment03` hoặc tên còn trống     |
| Branch            | `main`                                         |
| Region            | Gần Atlas nếu có                               |
| Runtime           | Node                                           |
| Root Directory    | Để trống nếu package.json ở gốc repository     |
| Build Command     | `npm ci --include=dev && npm run build:hosted` |
| Start Command     | `npm start`                                    |
| Instance Type     | **Free**                                       |
| Health Check Path | `/api/health`                                  |
| Disk              | **Không thêm**                                 |

Environment: nhập từng key/value, không đưa dấu ngoặc kép bao quanh giá trị trong UI:

| Key                     | Value                                         |
| ----------------------- | --------------------------------------------- |
| `NODE_ENV`              | `production`                                  |
| `NODE_VERSION`          | `24`                                          |
| `MONGODB_URI`           | URI Atlas đầy đủ của bạn                      |
| `SESSION_SECRET`        | Secret ngẫu nhiên ít nhất 32 ký tự            |
| `ALLOWED_ORIGINS`       | URL HTTPS thật của service, không có `/` cuối |
| `IMAGE_STORAGE`         | `cloudinary`                                  |
| `CLOUDINARY_CLOUD_NAME` | Cloud name                                    |
| `CLOUDINARY_API_KEY`    | API key Cloudinary                            |
| `CLOUDINARY_API_SECRET` | API secret Cloudinary                         |
| `SMTP_HOST`             | `smtp.sendgrid.net`                           |
| `SMTP_PORT`             | `2525`                                        |
| `SMTP_USER`             | `apikey`                                      |
| `SMTP_PASS`             | API key SendGrid                              |
| `MAIL_FROM`             | Email sender đã xác minh                      |

Tạo secret trên máy bằng `openssl rand -hex 32`; tự copy kết quả vào Render. Không đặt secret trong biến `VITE_*`. Không cần `VITE_API_URL`, `COOKIE_CROSS_SITE` hoặc `UPLOAD_DIR` cho cách cùng origin này. Render tự cấp `PORT`; không cần ép port 5000.

Tạo service để có URL. Nếu URL chưa biết khi nhập Environment, cập nhật `ALLOWED_ORIGINS` ngay sau khi Render cấp URL và deploy lại. Lần khởi động đầu có thể chưa kết nối Atlas vì chưa thêm IP Render; thực hiện bước kế tiếp rồi redeploy.

Trong service: **Connect → Outbound**, copy toàn bộ IP ranges/CIDR. Thêm từng dải vào **Atlas → Network Access**, chờ áp dụng, rồi Render → Manual Deploy → Deploy latest commit. Đây là dải IP dùng chung của Render region, không phải IP riêng của bạn; database vẫn cần xác thực mật khẩu và chỉ có quyền trên `boutique`.

`render.yaml` cũng đã cấu hình Free, không có disk và có các placeholder secret cho Blueprint. Hướng dẫn này dùng Web Service thủ công để bạn kiểm tra từng mục.

## 7. Tạo Admin

1. Mở URL Client online, đăng ký tài khoản riêng cho Admin.
2. Trên máy, kiểm tra `.env` đang trỏ đúng **Atlas boutique**, không phải local.
3. Chạy (thay email bằng email vừa đăng ký):

```bash
npm run user:role -- email-cua-ban@example.com admin
```

4. Mở `https://TEN-SERVICE.onrender.com/admin/` để đăng nhập. Nếu đã đăng nhập trước khi cấp quyền, đăng xuất rồi đăng nhập lại.
5. Nếu cần consultant, đăng ký tài khoản thứ hai và chạy cùng lệnh với `consultant` thay `admin`. Đây là role trong ứng dụng, không phải quyền database Atlas.

## 8. Kiểm tra và nộp

- `https://TEN-SERVICE.onrender.com/api/health` trả JSON thành công.
- Client có 8 sản phẩm; đăng ký/đăng nhập/đăng xuất hoạt động.
- Đặt một đơn bằng email thử của bạn: tồn kho giảm đúng, lịch sử/detail đúng, `emailStatus=sent`; kiểm tra inbox/Spam và SendGrid Email Activity. `sent` là SMTP đã nhận yêu cầu, cần kiểm tra hộp thư để xác nhận delivery.
- Admin thêm sản phẩm có ảnh. Manual Deploy lại và xác nhận ảnh vẫn hiện; URL ảnh mới phải là Cloudinary HTTPS.
- Kiểm tra sửa/xóa, hết hàng, khách không truy cập được Admin.
- Hai browser profile khác nhau: khách gửi chat, admin/consultant trả lời, `/end` kết thúc.
- Chuẩn bị URL Client, Admin, source repo/zip theo yêu cầu giảng viên, tài khoản demo riêng gửi qua kênh nộp bài, ảnh/video email đã nhận; ghi ngày hết SendGrid trial.

## Lỗi thường gặp

| Hiện tượng                                  | Kiểm tra                                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| MongoServerSelectionError / không khởi động | Atlas Network Access có mọi CIDR Render; cluster hoạt động; URI đúng database/password                |
| Authentication failed MongoDB               | Database user/mật khẩu, URL-encoding, authSource trong URI Atlas                                      |
| Lỗi Cloudinary 502 khi thêm ảnh             | Đủ ba biến Cloudinary của cùng product environment, Free quota, key còn hoạt động                     |
| Login/checkout 403                          | ALLOWED_ORIGINS đúng origin HTTPS không có slash cuối; Save + redeploy                                |
| Email failed                                | SMTP_PORT=2525, user=apikey, key có Mail Send, sender verified, tài khoản được duyệt, trial/quota còn |
| Không thấy email dù sent                    | SendGrid Activity có delivered/bounce; inbox/Spam; gửi thử tới hộp thư khác bạn sở hữu                |
| Build không tìm thấy Vite                   | Build command phải có npm ci --include=dev; không đặt root=server                                     |
| Upload ảnh mất sau redeploy                 | IMAGE_STORAGE phải cloudinary; ảnh local cũ không tự migrate                                          |
| Web lần đầu tải chậm                        | Render Free ngủ sau 15 phút idle, khởi động lại khoảng một phút                                       |

Không tự nâng cấp trả phí hoặc mở Atlas ra mọi IP để sửa lỗi. Không tạo dịch vụ ping liên tục nhằm né giới hạn Free. Trong hạn mức demo, không cần disk, custom domain hay phương thức thanh toán.

## Tài liệu chính thức

- [Render Free và giới hạn](https://render.com/docs/free)
- [Render outbound IP](https://render.com/docs/outbound-ip-addresses)
- [Atlas Free cluster](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/)
- [Cloudinary Free quota](https://cloudinary.com/documentation/billing_and_plans)
- [Cloudinary signed uploads](https://cloudinary.com/documentation/upload_images)
- [SendGrid SMTP](https://www.twilio.com/docs/sendgrid/for-developers/sending-email/integrating-with-the-smtp-api)
- [SendGrid trial 60 ngày](https://support.sendgrid.com/hc/en-us/articles/35270136965403-Twilio-SendGrid-Trial-Account-Plan)
