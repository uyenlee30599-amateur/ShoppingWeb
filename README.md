# NodeJS Assignment 03 — Boutique

Đã triển khai website thương mại điện tử từ frontend và JSON sản phẩm trong folder. Gồm Server NodeJS/Express/MongoDB, Client React và Admin React. File đề gốc được giữ lại để tham khảo; bản JSON sản phẩm dùng để seed nằm tại `client/public/data/products.json`.

## Chạy nhanh trên máy

Yêu cầu Node.js 22.12+ hoặc 24+, npm và mạng cho lần tải thư viện/MongoDB đầu tiên.

```bash
npm ci
npm run dev:local
```

Lệnh này khởi động MongoDB replica set chỉ trên loopback, import sản phẩm nếu chưa có và chạy đủ ba ứng dụng:

- Client: http://127.0.0.1:3000
- Admin: http://127.0.0.1:3001
- Server: http://127.0.0.1:5000/api/health

Database local lưu tại `server/private/local-mongo`; secret phiên tại `server/private/local-secret`; email thử tại `server/private/mail`. Các file này bị loại khỏi Git. Nhấn Ctrl+C để dừng cả ba ứng dụng; dữ liệu vẫn giữ lại. Không chạy hai phiên `dev:local` cùng lúc. Không cần tài khoản cloud, Docker hay gửi mật khẩu vào chat. `dev:local` chỉ dùng cho phát triển.

Đăng ký tài khoản tại Client, sau đó mở terminal khác trong folder dự án để cấp quyền cho tài khoản local của bạn:

```bash
npm run user:role -- email-cua-ban@example.com admin
# Hoặc: npm run user:role -- email-tu-van@example.com consultant
```

Đăng nhập lại tại Admin. Không có tài khoản admin/mật khẩu mặc định. Đăng ký qua API luôn tạo `customer`, không cho người đăng ký tự nâng quyền. CLI cấp quyền chỉ dành cho người quản lý database; không dùng với database thật nếu chưa xác nhận người nhận quyền.

## Dùng MongoDB riêng hoặc Atlas

1. Sao chép `.env.example` thành `.env` ở thư mục gốc.
2. Đặt `MONGODB_URI` và secret ngẫu nhiên, tối thiểu 32 ký tự. MongoDB phải hỗ trợ replica set vì đặt hàng sử dụng transaction. Atlas đáp ứng điều kiện này.
3. Có thể dùng `docker compose up -d --wait` nếu đã có Docker; cấu hình đi kèm chỉ mở MongoDB trên 127.0.0.1.
4. Chạy `npm run seed` rồi `npm run dev`.

`seed` dùng dữ liệu `client/public/data/products.json`, giữ nguyên ID và chỉ thêm sản phẩm chưa tồn tại; không xóa database. `count` ban đầu là 20 vì dữ liệu đề không có tồn kho. Giỏ hàng frontend chỉ lưu sản phẩm/số lượng trên localStorage; tài khoản và mật khẩu được xử lý ở backend. Dữ liệu tài khoản mô phỏng cũ trong localStorage được loại bỏ khi chạy Client mới.

## Phân tích cách làm và đối chiếu đề

| Yêu cầu                             | Cách triển khai                                                                                                                            | Vị trí chính                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| 1. Ba ứng dụng, port 5000/3000/3001 | Express và hai Vite React app                                                                                                              | `server`, `client`, `admin`                               |
| 2. Model MongoDB                    | User, Product, Order, Session; tham chiếu User/Product trong đơn và phiên chat; phiên đăng nhập lưu MongoDB riêng                          | `server/src/models.js`                                    |
| 3. Xác thực                         | Bcrypt hash, cookie HttpOnly, session MongoDB, CSRF, giới hạn đăng nhập                                                                    | `server/src/app.js`, `client/src/components/AuthForm.jsx` |
| 4. Trang chủ                        | Client gọi GET /api/products                                                                                                               | `client/src/hooks/useProducts.js`                         |
| 5. Chi tiết và sản phẩm liên quan   | GET /api/products/:id trả product và related                                                                                               | `client/src/pages/DetailPage.jsx`                         |
| 6. Đặt hàng                         | Kiểm tra người dùng, validation, giá từ DB, snapshot sản phẩm, trạng thái, thời gian; transaction trừ kho và lưu đơn; khóa chống gửi trùng | `server/src/app.js`, `client/src/pages/CheckoutPage.jsx`  |
| 7. Email                            | Nodemailer gửi tên, sản phẩm, số lượng, giá và thời gian; lưu trạng thái gửi                                                               | `server/src/mail.js`                                      |
| 8. Lịch sử và chi tiết đơn          | Chỉ chủ đơn được xem; route /orders và /orders/:id                                                                                         | `client/src/pages/OrdersPage.jsx`                         |
| 9. Phân quyền                       | customer chỉ Client; consultant chỉ livechat ở Admin; admin toàn bộ; kiểm tra quyền ở API                                                  | `server/src/app.js`, `admin/src/App.jsx`                  |
| 10. Danh sách và tìm kiếm sản phẩm  | Bảng Admin có tìm theo tên                                                                                                                 | `admin/src/App.jsx`                                       |
| 11. Deploy                          | Có cấu hình Render, build production và hướng dẫn bên dưới; **chưa đưa lên online**                                                        | `render.yaml`                                             |
| 12. Livechat                        | Socket.IO, phiên lưu MongoDB, roomID localStorage, kiểm tra chủ phòng, tư vấn viên trả lời, /end kết thúc                                  | `server/src/chat.js`, hai UI chat                         |
| 13. Dashboard                       | Sidebar, số user, giao dịch, tổng giá trị đơn, doanh thu bình quân tháng, đơn gần đây                                                      | `admin/src/App.jsx`                                       |
| 14. Thêm sản phẩm và upload         | Multipart, 1–4 ảnh JPEG/PNG/WebP, tối đa 5 MB/ảnh, tên ngẫu nhiên và kiểm tra chữ ký file                                                  | `server/src/app.js`                                       |
| 15. Cập nhật và xóa                 | PUT dùng findOneAndUpdate, giữ ảnh; DELETE sau xác nhận, đánh dấu deleted để giữ lịch sử                                                   | `server/src/app.js`, `admin/src/App.jsx`                  |
| 16. Tồn kho                         | count, báo hết hàng, kiểm tra số lượng tại server, trừ kho trong transaction                                                               | `server/src/models.js`, `server/src/app.js`               |

Tổng doanh thu trên Dashboard là tổng giá trị các đơn đã đặt, không phải số tiền thanh toán thực nhận. Bình quân tháng tính theo số tháng lịch từ đơn đầu tiên đến hiện tại. Thanh toán hiện là đặt hàng, chưa tích hợp cổng thanh toán; đề không yêu cầu tích hợp cổng thanh toán. Trạng thái đơn ban đầu là `pending`. Mã nguồn hiện không có màn hình đổi trạng thái đơn.

## Email thật

`dev:local` luôn xem thử email; khi dùng `npm run dev`, không cấu hình SMTP thì hệ thống lưu email HTML trong `server/private/mail/<orderId>.html` và `emailStatus=preview`; đây chưa phải email đã gửi. Có thể mở file bằng trình duyệt để kiểm tra nội dung.

Để gửi thật, bạn tự nhập `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` vào `.env` hoặc secret của hosting. Nếu dùng Gmail, dùng App Password cho tài khoản dự án, không dùng mật khẩu đăng nhập Gmail thông thường. Không commit secret, không gửi secret qua chat. Production không tạo email preview; khi gửi thất bại đơn vẫn được lưu, có `emailStatus=failed` và Client thông báo. Chưa có hàng đợi tự động gửi lại email sau lỗi SMTP hoặc sau khi server bị dừng đột ngột.

## Kiểm thử

```bash
npm run lint
npm test
npm run build
```

`npm test` khởi động database replica set tạm riêng, không đọc `.env`, không kết nối database thật và tự dọn dữ liệu test. Lần đầu sẽ tải MongoDB binary chính thức. Sáu nhóm integration gồm xác thực/CSRF/phân quyền, đơn hàng/giá/quyền sở hữu/rollback, đặt đồng thời/chống trùng, upload/cập nhật/xóa, livechat/khóa quyền phòng/logout và phục vụ hai frontend trong production. Hai nhóm Cloudinary bổ sung kiểm tra chữ ký upload/dọn ảnh và lỗi cấu hình/dịch vụ bằng mock; không upload ảnh lên tài khoản thật trong test. `npm test` tự build hai frontend trước khi chạy. Email dùng preview, không gửi thật trong test.

Demo để đối chiếu đề:

1. Đăng ký và đăng nhập; reload kiểm tra phiên; đăng xuất kiểm tra API yêu cầu đăng nhập.
2. Home → Shop → Detail, thêm vào giỏ → Checkout → Orders, mở chi tiết và file email preview.
3. Tạo thêm tài khoản và kiểm tra không xem được đơn của người khác.
4. Cấp quyền Admin bằng CLI; tìm sản phẩm, thêm ảnh, cập nhật mô tả/tồn kho, xóa sau xác nhận.
5. Đặt `count=0`, kiểm tra Client báo hết hàng và backend từ chối đặt hàng.
6. Dùng hai browser/profile riêng để đăng nhập khách và tư vấn viên (cookie trên localhost dùng chung giữa các port), thử nhắn hai chiều và `/end`.
7. Sau khi cấu hình SMTP/deploy, kiểm tra lại bằng email thử và URL HTTPS thật.

## Deploy Render Free

Cấu hình mặc định phục vụ cả hai frontend và backend trên cùng một origin HTTPS: Client ở `/`, Admin ở `/admin/`, API ở `/api`, Socket.IO ở `/socket.io`. Local vẫn dùng đủ ba port theo đề. Cách cùng origin giúp cookie hoạt động ổn định và không phụ thuộc cookie bên thứ ba.

Trên Render, dùng repository của bài và các thông số:

- Build: `npm ci --include=dev && npm run build:hosted`
- Start: `npm start`
- Health check: `/api/health`
- Biến môi trường: `NODE_ENV=production`, `MONGODB_URI` Atlas, `SESSION_SECRET` ngẫu nhiên, `ALLOWED_ORIGINS=https://ten-dich-vu.onrender.com` và các biến SMTP.
- Phương án mặc định hiện tại: **Render Free + Atlas Free + Cloudinary Free + SendGrid trial**, không dùng disk. Đặt `IMAGE_STORAGE=cloudinary` và ba biến `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` ở backend. `render.yaml` đã chọn `plan: free`, SMTP SendGrid cổng 2525. Xem [hướng dẫn từng bước](DEPLOY-FREE.md). Local mặc định vẫn lưu ảnh trong `server/public/uploads`.
- Sau khi có URL thật, thay `ALLOWED_ORIGINS` bằng origin đó, không thêm dấu `/` cuối.
- Import dữ liệu bằng `npm run seed` với URI production do bạn cấu hình riêng. Đăng ký tài khoản quản trị qua Client, cấp quyền bằng CLI đã trỏ đúng database production và đăng nhập Admin.

Tham khảo chính thức: [Deploy Node Express trên Render](https://render.com/docs/deploy-node-express-app), [MongoDB transaction với Mongoose](https://mongoosejs.com/docs/transactions.html).

Nếu giảng viên yêu cầu ba URL riêng: build Client/Admin với `VITE_API_URL=https://url-server`, deploy hai folder `client/dist` và `admin/dist` lên static hosting (Admin build với base `/`); đặt đủ hai frontend origin vào `ALLOWED_ORIGINS`, HTTPS và `COOKIE_CROSS_SITE=true`. Cookie bên thứ ba có thể bị browser chặn, nên ưu tiên các subdomain cùng site hoặc cùng origin. Static host cần SPA fallback cho URL nếu đổi từ HashRouter sang BrowserRouter.

Workflow GitHub hiện chỉ chạy lint, test và build; không tự publish. Sau khi bạn liên kết repository vào Render, Render có thể tự redeploy khi push tùy thiết lập Auto-Deploy của service. Folder hiện tại không có `.git`; chưa tạo repo, chưa push hay chỉnh dịch vụ đang online. File DOCX, dữ liệu và frontend tham khảo được giữ nguyên.

Các bước cần bạn thực hiện/trao đổi trước: tạo/chọn tài khoản hosting, database Atlas, chọn các gói Free/trial, cấp database user và network access cần thiết, tự nhập secrets, xác nhận URL/public deploy và tài khoản nhận quyền Admin. Không mở database công khai ra Internet khi chưa thống nhất cấu hình truy cập.
