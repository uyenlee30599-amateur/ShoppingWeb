import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import session from "express-session";
import MongoStore from "connect-mongo";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import multer from "multer";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { User, Product, Order, Session } from "./models.js";
import {
  registerSchema,
  loginSchema,
  orderSchema,
  productSchema,
  fail,
} from "./validation.js";
import { sendConfirmation } from "./mail.js";
import { createImageStore } from "./images.js";
export async function createApp() {
  const app = express();
  const production = process.env.NODE_ENV === "production";
  const origins = (
    process.env.ALLOWED_ORIGINS ||
    "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"
  ).split(",");
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
    throw new Error("SESSION_SECRET cần tối thiểu 32 ký tự");
  if (production) app.set("trust proxy", 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: { "img-src": ["'self'", "data:", "https:"] },
      },
    }),
  );
  app.use(
    cors({
      origin: (o, cb) => cb(null, !o || origins.includes(o)),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  const store = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: "auth_sessions",
    ttl: 86400,
  });
  app.locals.sessionStore = store;
  const sessionMiddleware = session({
    name: "boutique.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      httpOnly: true,
      secure: production,
      sameSite: process.env.COOKIE_CROSS_SITE === "true" ? "none" : "lax",
      maxAge: 86400000,
    },
  });
  app.use(sessionMiddleware);
  app.use("/api", rateLimit({ windowMs: 60000, limit: 150 }));
  app.use("/api", async (req, res, next) => {
    try {
      if (req.session.userId)
        req.user = await User.findById(req.session.userId);
      next();
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/auth/csrf", (req, res) => {
    req.session.csrf ||= randomBytes(32).toString("hex");
    res.json({ token: req.session.csrf });
  });
  app.use("/api", (req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (req.headers.origin && !origins.includes(req.headers.origin))
        return res.status(403).json({ message: "Origin không hợp lệ" });
      if (!req.session.csrf || req.headers["x-csrf-token"] !== req.session.csrf)
        return res.status(403).json({ message: "CSRF token không hợp lệ" });
    }
    next();
  });
  const auth = (req, res, next) =>
    req.user ? next() : res.status(401).json({ message: "Vui lòng đăng nhập" });
  const role =
    (...roles) =>
    (req, res, next) =>
      req.user && roles.includes(req.user.role)
        ? next()
        : res.status(403).json({ message: "Không có quyền truy cập" });
  const safeUser = (u) => ({
    _id: u._id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    role: u.role,
  });
  const authLimit = rateLimit({ windowMs: 900000, limit: 30 });
  app.post("/api/auth/register", authLimit, async (req, res) => {
    const data = registerSchema.parse(req.body);
    if (await User.exists({ email: data.email }))
      fail(409, "Email đã được đăng ký");
    const user = await User.create({
      ...data,
      password: await bcrypt.hash(data.password, 12),
    });
    res.status(201).json(safeUser(user));
  });
  app.post("/api/auth/login", authLimit, async (req, res) => {
    const data = loginSchema.parse(req.body);
    const u = await User.findOne({ email: data.email }).select("+password");
    if (!u || !(await bcrypt.compare(data.password, u.password)))
      fail(401, "Email hoặc mật khẩu không chính xác");
    if (data.admin && !["admin", "consultant"].includes(u.role))
      fail(403, "Tài khoản không có quyền Admin");
    await new Promise((ok, no) =>
      req.session.regenerate((e) => (e ? no(e) : ok())),
    );
    req.session.userId = u._id.toString();
    await new Promise((ok, no) => req.session.save((e) => (e ? no(e) : ok())));
    res.json(safeUser(u));
  });
  app.get("/api/auth/me", auth, (req, res) => res.json(safeUser(req.user)));
  app.post("/api/auth/logout", auth, async (req, res) => {
    await new Promise((ok, no) =>
      req.session.destroy((e) => (e ? no(e) : ok())),
    );
    res
      .clearCookie("boutique.sid", {
        httpOnly: true,
        secure: production,
        sameSite: process.env.COOKIE_CROSS_SITE === "true" ? "none" : "lax",
      })
      .json({ ok: true });
  });
  app.get("/api/health", (req, res) =>
    res.json({ ok: mongoose.connection.readyState === 1 }),
  );
  app.get("/api/products", async (req, res) => {
    const filter = { deleted: false };
    if (typeof req.query.q === "string")
      filter.name = {
        $regex: req.query.q
          .slice(0, 100)
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    if (typeof req.query.category === "string")
      filter.category = req.query.category;
    res.json(await Product.find(filter).sort({ createdAt: -1 }).limit(1000));
  });
  const idCheck = (req, res, next) =>
    mongoose.isObjectIdOrHexString(req.params.id)
      ? next()
      : res.status(400).json({ message: "ID không hợp lệ" });
  app.get("/api/products/:id", idCheck, async (req, res) => {
    const product = await Product.findOne({
      _id: req.params.id,
      deleted: false,
    });
    if (!product) fail(404, "Không tìm thấy sản phẩm");
    res.json({
      product,
      related: await Product.find({
        deleted: false,
        category: product.category,
        _id: { $ne: product._id },
      }).limit(8),
    });
  });
  app.post("/api/orders", auth, async (req, res) => {
    const data = orderSchema.parse(req.body);
    let order = await Order.findOne({
      user: req.user._id,
      requestKey: data.requestKey,
    });
    if (order) return res.json(order);
    try {
      await mongoose.connection.transaction(async (dbSession) => {
        const items = [];
        let total = 0;
        for (const i of data.items) {
          const p = await Product.findOneAndUpdate(
            { _id: i.productId, deleted: false, count: { $gte: i.quantity } },
            { $inc: { count: -i.quantity } },
            { returnDocument: "after", session: dbSession },
          );
          if (!p) fail(409, "Sản phẩm không tồn tại hoặc không đủ tồn kho");
          items.push({
            product: p._id,
            name: p.name,
            image: p.img1,
            price: p.price,
            quantity: i.quantity,
          });
          total += p.price * i.quantity;
        }
        [order] = await Order.create(
          [
            {
              user: req.user._id,
              customer: data.customer,
              items,
              total,
              requestKey: data.requestKey,
            },
          ],
          { session: dbSession },
        );
      });
    } catch (e) {
      if (e.code === 11000) {
        const existing = await Order.findOne({
          user: req.user._id,
          requestKey: data.requestKey,
        });
        if (existing) return res.json(existing);
      }
      throw e;
    }
    try {
      order.emailStatus = await sendConfirmation(order);
    } catch {
      order.emailStatus = "failed";
    }
    await order.save();
    res.status(201).json(order);
  });
  app.get("/api/orders", auth, async (req, res) =>
    res.json(await Order.find({ user: req.user._id }).sort({ createdAt: -1 })),
  );
  app.get("/api/orders/:id", auth, idCheck, async (req, res) => {
    const o = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!o) fail(404, "Không tìm thấy đơn hàng");
    res.json(o);
  });
  app.use("/api/admin", auth);
  app.get("/api/admin/dashboard", role("admin"), async (req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 });
    const revenue = orders.reduce((s, o) => s + o.total, 0);
    const first = orders.at(-1)?.createdAt || new Date();
    const months = Math.max(
      1,
      (new Date().getFullYear() - first.getFullYear()) * 12 +
        new Date().getMonth() -
        first.getMonth() +
        1,
    );
    res.json({
      users: await User.countDocuments(),
      transactions: orders.length,
      revenue,
      monthlyAverage: revenue / months,
      orders: orders.slice(0, 20),
    });
  });
  app.get("/api/admin/products", role("admin"), async (req, res) =>
    res.json(await Product.find({ deleted: false }).sort({ createdAt: -1 })),
  );
  const imageStore = await createImageStore();
  if (imageStore.directory)
    app.use(
      "/uploads",
      express.static(imageStore.directory, {
        dotfiles: "deny",
        setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
      }),
    );
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 4, fields: 6 },
  });
  app.post(
    "/api/admin/products",
    role("admin"),
    upload.array("images", 4),
    async (req, res) => {
      const data = productSchema.parse(req.body);
      if (!req.files?.length) fail(400, "Cần ít nhất một ảnh");
      const images = {};
      const written = [];
      try {
        for (const [i, f] of req.files.entries()) {
          const b = f.buffer;
          let ext;
          if (
            b
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          )
            ext = "png";
          else if (b[0] === 255 && b[1] === 216 && b[2] === 255) ext = "jpg";
          else if (
            b.toString("ascii", 0, 4) === "RIFF" &&
            b.toString("ascii", 8, 12) === "WEBP"
          )
            ext = "webp";
          else fail(400, "Chỉ hỗ trợ ảnh PNG, JPEG hoặc WebP");
          const saved = await imageStore.save(b, ext);
          written.push(saved);
          images[`img${i + 1}`] = saved.url;
        }
        res.status(201).json(await Product.create({ ...data, ...images }));
      } catch (e) {
        await Promise.all(
          written.map((f) =>
            f.remove().catch(() => {
              console.error("Không thể dọn ảnh của lần tạo sản phẩm thất bại");
            }),
          ),
        );
        throw e;
      }
    },
  );
  app.put(
    "/api/admin/products/:id",
    role("admin"),
    idCheck,
    async (req, res) => {
      const data = productSchema.parse(req.body);
      const p = await Product.findOneAndUpdate(
        { _id: req.params.id, deleted: false },
        { $set: data },
        { returnDocument: "after", runValidators: true },
      );
      if (!p) fail(404, "Không tìm thấy sản phẩm");
      res.json(p);
    },
  );
  app.delete(
    "/api/admin/products/:id",
    role("admin"),
    idCheck,
    async (req, res) => {
      const p = await Product.findOneAndUpdate(
        { _id: req.params.id, deleted: false },
        { $set: { deleted: true } },
        { returnDocument: "after" },
      );
      if (!p) fail(404, "Không tìm thấy sản phẩm");
      res.json({ ok: true });
    },
  );
  app.get("/api/chat", auth, async (req, res) =>
    res.json(await Session.findOne({ user: req.user._id, active: true })),
  );
  app.get("/api/admin/chat", role("admin", "consultant"), async (req, res) =>
    res.json(await Session.find({ active: true }).sort({ updatedAt: -1 })),
  );
  app.use("/api", (req, res) =>
    res.status(404).json({ message: "API không tồn tại" }),
  );
  if (production) {
    const adminDist = path.resolve("admin/dist"),
      clientDist = path.resolve("client/dist");
    app.use("/admin", express.static(adminDist));
    app.get(["/admin", "/admin/{*rest}"], (req, res) =>
      res.sendFile(path.join(adminDist, "index.html")),
    );
    app.use(express.static(clientDist));
    app.get("/{*rest}", (req, res) =>
      res.sendFile(path.join(clientDist, "index.html")),
    );
  }
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status =
      err.name === "ZodError"
        ? 400
        : err.code === 11000
          ? 409
          : err instanceof multer.MulterError
            ? 400
            : err.status || 500;
    res.status(status).json({
      message:
        status === 500
          ? "Lỗi máy chủ. Vui lòng thử lại."
          : err.name === "ZodError"
            ? "Dữ liệu không hợp lệ: " +
              err.issues
                .map((i) => i.path.join(".") + ": " + i.message)
                .join("; ")
            : err.message,
    });
    if (status === 500)
      console.error("Request failed:", err.name, err.code || "");
  });
  return { app, sessionMiddleware, origins };
}
