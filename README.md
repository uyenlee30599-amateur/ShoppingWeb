# Boutique — NodeJS Assignment 03

Boutique là ứng dụng bán hàng gồm cửa hàng dành cho khách, trang quản trị và API backend. MongoDB lưu sản phẩm, tài khoản, đơn hàng và hội thoại. Nodemailer gửi email xác nhận đơn; Cloudinary lưu ảnh sản phẩm upload từ Admin.

## Sản phẩm online và tài khoản chấm bài

Các thông tin dưới đây cần được điền và kiểm tra sau khi deploy, trước khi nộp bài.

| Nội dung            | Thông tin                                    |
| ------------------- | -------------------------------------------- |
| Website khách hàng  | https://shoppingweb-dfar.onrender.com/       |
| Trang Admin         | https://shoppingweb-dfar.onrender.com/admin/ |
| Email Admin demo    | uyen005@gmail.com                            |
| Mật khẩu Admin demo | thanuyen30                                   |

Tài khoản Admin demo dành cho kiểm tra dashboard, quản lý sản phẩm và chat hỗ trợ trên dữ liệu bài tập. Đăng nhập bằng email và mật khẩu trong bảng trên.

## Chức năng

- Khách hàng: xem và tìm kiếm sản phẩm, lọc danh mục, xem chi tiết và sản phẩm liên quan, quản lý giỏ hàng, đăng ký và đăng nhập.
- Đơn hàng: đặt hàng, kiểm tra tồn kho, nhận email xác nhận, xem lịch sử và chi tiết đơn của tài khoản đang đăng nhập.
- Quản trị: dashboard, tìm kiếm, thêm, sửa và xóa sản phẩm; upload 1–4 ảnh JPEG/PNG/WebP, tối đa 5 MB mỗi ảnh. Cập nhật giữ nguyên ảnh; xóa sản phẩm sử dụng soft delete để giữ lịch sử đơn.
- Hỗ trợ: chat theo phiên giữa khách và nhân viên; gửi `/end` để kết thúc hội thoại.
- Phân quyền: `customer` sử dụng cửa hàng, `consultant` sử dụng chat hỗ trợ trong Admin, `admin` sử dụng toàn bộ trang quản trị.

Backend tính giá từ database và sử dụng MongoDB transaction để lưu đơn, trừ tồn kho. Mật khẩu được hash bằng bcrypt; đăng nhập sử dụng cookie session, các API thay đổi dữ liệu kiểm tra CSRF. Dashboard tổng hợp giá trị đơn đã đặt; ứng dụng chưa tích hợp cổng thanh toán trực tuyến.

## Công nghệ và cấu trúc

Frontend: React, Vite, React Router. Backend: Node.js, Express, Mongoose, Socket.IO, Nodemailer và Multer.

```text
client/          Cửa hàng React và dữ liệu sản phẩm mẫu
admin/           Trang quản trị React
server/src/      API, model, xác thực, chat, email và upload ảnh
server/scripts/  Import sản phẩm, cấp quyền và chạy MongoDB local
server/test/     Kiểm thử backend
.env.example     Mẫu cấu hình môi trường
DEPLOY-FREE.md   Hướng dẫn deploy Render, Atlas, Cloudinary và SendGrid
```

## Chạy với MongoDB Atlas

Yêu cầu Node.js 24, npm và MongoDB hỗ trợ replica set để thực hiện transaction. MongoDB Atlas đáp ứng yêu cầu này.

### 1. Cài dependencies

Chạy tại thư mục gốc, nơi có `package.json`:

```bash
npm ci
```

### 2. Cấu hình môi trường

Nếu chưa có `.env`, sao chép `.env.example` thành `.env`. Nếu đã có, chỉnh file hiện tại và giữ các thông tin đang sử dụng.

Cấu hình tối thiểu cho local:

```dotenv
MONGODB_URI="mongodb+srv://<DB_USER>:<ENCODED_PASSWORD>@<CLUSTER_HOST>/boutique?retryWrites=true&w=majority"
SESSION_SECRET=<RANDOM_SECRET_AT_LEAST_32_CHARACTERS>
NODE_ENV=development
PORT=5000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001
IMAGE_STORAGE=local
```

Thay placeholder bằng thông tin của môi trường đang sử dụng. Database user cần quyền đọc/ghi trên `boutique`; thêm IP máy vào Atlas Network Access. Mật khẩu trong URI cần URL-encode nếu có ký tự đặc biệt. Tạo session secret bằng `openssl rand -hex 32`.

`.env` chứa thông tin riêng và được loại khỏi Git. Không đặt secrets trong frontend hoặc biến `VITE_*`.

### 3. Import dữ liệu và khởi chạy

```bash
npm run seed
npm run dev
```

Seed thêm 8 sản phẩm từ `client/public/data/products.json` vào database trong `MONGODB_URI`, giữ nguyên sản phẩm đã tồn tại. Sản phẩm mới được khởi tạo tồn kho 20.

| Ứng dụng             | Địa chỉ local                    |
| -------------------- | -------------------------------- |
| Client               | http://127.0.0.1:3000            |
| Admin                | http://127.0.0.1:3001            |
| Backend health check | http://127.0.0.1:5000/api/health |

Health check trả `{"ok":true}` khi backend có kết nối MongoDB. Nhấn `Ctrl+C` để dừng và khởi động lại sau khi thay đổi `.env`.

## Tài khoản Admin

Đăng ký tài khoản tại Client, sau đó chạy tại thư mục gốc:

```bash
npm run user:role -- admin@example.com admin
```

Thay email mẫu bằng tài khoản đã đăng ký. Script cập nhật quyền trong database cấu hình bởi `.env`; không cần chạy `npm run dev` trước. Đăng nhập Admin bằng email và mật khẩu của tài khoản đó. Không có tài khoản hoặc mật khẩu Admin mặc định.

Để cấp quyền hỗ trợ chat, dùng `consultant` thay `admin`. Khi cấp quyền cho tài khoản online, URI local phải trỏ đến cùng cluster và database mà backend online sử dụng.

## Email và ảnh sản phẩm

Để gửi email qua SendGrid, thêm vào `.env`:

```dotenv
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=2525
SMTP_USER=apikey
SMTP_PASS=<SENDGRID_API_KEY>
MAIL_FROM=<VERIFIED_SENDER_EMAIL>
```

API key cần quyền Mail Send và email gửi phải được xác minh. Thư được gửi tới email khách nhập tại Checkout. Gửi thất bại vẫn lưu đơn và ghi nhận trạng thái email. Trong development, nếu chưa cấu hình `SMTP_HOST`, email được lưu dạng HTML tại `server/private/mail/` thay vì gửi thật. SendGrid trial có thời hạn; kiểm tra ngày hết hạn khi nộp bài.

Để lưu ảnh trên Cloudinary, đổi `IMAGE_STORAGE` và điền thông tin của cùng product environment:

```dotenv
IMAGE_STORAGE=cloudinary
CLOUDINARY_CLOUD_NAME=<CLOUD_NAME>
CLOUDINARY_API_KEY=<API_KEY>
CLOUDINARY_API_SECRET=<API_SECRET>
```

Admin upload ảnh qua form tạo sản phẩm; backend gửi ảnh lên Cloudinary và lưu URL HTTPS vào MongoDB. Không cần unsigned upload preset. URL Firebase HTTPS trong dữ liệu mẫu tiếp tục được dùng nếu còn truy cập được. Ảnh local `/uploads/...` không tự chuyển lên Cloudinary.

## Chạy với MongoDB local

Để chạy môi trường riêng trên máy thay vì Atlas:

```bash
npm run dev:local
```

Script khởi động MongoDB replica set, import sản phẩm và chạy cả ba ứng dụng. Lần đầu cần mạng để tải MongoDB binary. Dữ liệu giữ tại `server/private/local-mongo/`; email luôn dùng preview. Không chạy đồng thời với `npm run dev`. Chế độ này không dùng Atlas hoặc gửi email SMTP thật.

## Kiểm tra và build

```bash
npm run lint
npm test
npm run build:hosted
```

Tests dùng database tạm riêng, kiểm tra xác thực, phân quyền, đơn hàng, tồn kho, upload, chat và phục vụ frontend production. Tests không gửi email hoặc upload lên tài khoản Cloudinary thật. `npm test` tự build frontend trước khi chạy.

## Deploy trên Render

Tạo một Web Service từ repository, chọn Node và gói Free:

- Branch: `main`; Root Directory để trống.
- Build Command: `npm ci --include=dev && npm run build:hosted`.
- Start Command: `npm start`.
- Health Check Path: `/api/health`.
- Environment: `NODE_ENV=production`, `NODE_VERSION=24`, URI Atlas, session secret riêng, các biến Cloudinary và SendGrid.
- `ALLOWED_ORIGINS`: origin HTTPS thật của service, không có `/` cuối.

Thêm toàn bộ Outbound IP ranges của service Render vào Atlas Network Access. Render tự cấp `PORT`. Dùng Cloudinary để giữ ảnh qua các lần deploy vì filesystem Render Free không bền vững.

Khi online, Client ở `/`, Admin ở `/admin/`, API ở `/api/`. Tài khoản và sản phẩm được dùng chung với local nếu cùng database Atlas. Xem hướng dẫn tại [DEPLOY-FREE.md](DEPLOY-FREE.md).
