import nodemailer from "nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const escape = (v) =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export async function sendConfirmation(order) {
  const html = `<h1>Xác nhận đơn hàng ${order._id}</h1><p>Xin chào ${escape(order.customer.fullName)}</p><p>Thời gian: ${new Date(order.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p><table><tr><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th></tr>${order.items.map((i) => `<tr><td>${escape(i.name)}</td><td>${i.quantity}</td><td>${i.price.toLocaleString("vi-VN")} VND</td></tr>`).join("")}</table><p>Tổng: ${order.total.toLocaleString("vi-VN")} VND</p><p>Địa chỉ: ${escape(order.customer.address)}</p>`;
  if (!process.env.SMTP_HOST) {
    if (process.env.NODE_ENV === "production")
      throw new Error("SMTP chưa cấu hình");
    const dir =
      process.env.MAIL_PREVIEW_DIR || path.resolve("server/private/mail");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${order._id}.html`), html, { mode: 0o600 });
    return "preview";
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === "465",
    requireTLS: process.env.SMTP_PORT !== "465",
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: order.customer.email,
    subject: `Boutique xác nhận đơn ${order._id}`,
    html,
  });
  return "sent";
}
