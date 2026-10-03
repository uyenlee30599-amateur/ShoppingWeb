import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { io as clientIo } from "socket.io-client";
import { createApp } from "../src/app.js";
import { attachChat } from "../src/chat.js";
import { User, Product, Order, Session } from "../src/models.js";
let mongo,
  app,
  http,
  io,
  tmp,
  origin = "http://localhost:3000";
before(async () => {
  process.env.NODE_ENV = "test";
  process.env.IMAGE_STORAGE = "local";
  for (const key of [
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_PASS",
    "MAIL_FROM",
    "COOKIE_CROSS_SITE",
  ])
    delete process.env[key];
  process.env.ALLOWED_ORIGINS = "http://localhost:3000";
  tmp = await mkdtemp(path.join(os.tmpdir(), "boutique-test-"));
  process.env.SESSION_SECRET = "test-secret-".repeat(5);
  process.env.MAIL_PREVIEW_DIR = path.join(tmp, "mail");
  process.env.UPLOAD_DIR = path.join(tmp, "uploads");
  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: "8.0.16" },
  });
  process.env.MONGODB_URI = mongo.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([
    User.init(),
    Product.init(),
    Order.init(),
    Session.init(),
  ]);
  const config = await createApp();
  app = config.app;
  http = createServer(app);
  io = attachChat(http, config);
  await new Promise((r) => http.listen(0, "127.0.0.1", r));
});
after(async () => {
  if (io) await new Promise((r) => io.close(r));
  if (app) await app.locals.sessionStore.close();
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  if (tmp) await rm(tmp, { recursive: true, force: true });
});
async function post(agent, url, body, method = "post") {
  const csrf = await agent.get("/api/auth/csrf");
  return agent[method](url)
    .set("Origin", origin)
    .set("x-csrf-token", csrf.body.token)
    .send(body);
}
async function account(email, role = "customer") {
  const agent = request.agent(app);
  const data = {
    email,
    password: "TestPassword123!",
    fullName: "Test User",
    phone: "0901234567",
  };
  assert.equal((await post(agent, "/api/auth/register", data)).status, 201);
  if (role !== "customer") await User.updateOne({ email }, { $set: { role } });
  const logged = await post(agent, "/api/auth/login", {
    email,
    password: data.password,
  });
  assert.equal(logged.status, 200);
  return {
    agent,
    user: logged.body,
    cookie: logged.headers["set-cookie"][0].split(";")[0],
  };
}
test("Cookie authentication, validation, role escalation and CSRF", async () => {
  assert.equal((await request(app).get("/api/orders")).status, 401);
  assert.equal(
    (await request(app).post("/api/auth/register").send({})).status,
    403,
  );
  const { agent, user } = await account("auth@example.com");
  assert.equal(user.role, "customer");
  assert.equal(user.password, undefined);
  const saved = await User.findOne({ email: user.email }).select("+password");
  assert.notEqual(saved.password, "TestPassword123!");
  assert.match(saved.password, /^\$2/);
  assert.equal((await agent.get("/api/admin/products")).status, 403);
  assert.equal(
    (
      await post(agent, "/api/auth/login", {
        email: user.email,
        password: "bad",
      })
    ).status,
    401,
  );
  const csrf = await agent.get("/api/auth/csrf");
  assert.equal(
    (
      await agent
        .post("/api/auth/logout")
        .set("Origin", "https://evil.example")
        .set("x-csrf-token", csrf.body.token)
    ).status,
    403,
  );
  assert.equal(
    (
      await post(agent, "/api/auth/register", {
        email: "other@example.com",
        password: "TestPassword123!",
        fullName: "Other",
        phone: "0901234567",
        role: "admin",
      })
    ).body.role,
    "customer",
  );
  assert.equal((await post(agent, "/api/auth/logout", {})).status, 200);
  assert.equal((await agent.get("/api/auth/me")).status, 401);
});
test("Orders use database prices, preserve history, reject other users and rollback stock", async () => {
  const { agent, user } = await account("orders@example.com");
  const p = await Product.create({
    name: "Order product",
    category: "iphone",
    price: 100000,
    count: 3,
  });
  const customer = {
    fullName: "Test Buyer",
    email: user.email,
    phone: "0901234567",
    address: "123 Test Street",
  };
  const body = {
    customer,
    items: [{ productId: String(p._id), quantity: 2, price: 1 }],
    requestKey: randomUUID(),
  };
  const placed = await post(agent, "/api/orders", body);
  assert.equal(placed.status, 201);
  assert.equal(placed.body.total, 200000);
  assert.equal(placed.body.emailStatus, "preview");
  assert.equal((await Product.findById(p._id)).count, 1);
  assert.equal((await readdir(process.env.MAIL_PREVIEW_DIR)).length, 1);
  const retry = await post(agent, "/api/orders", body);
  assert.equal(retry.body._id, placed.body._id);
  assert.equal((await Product.findById(p._id)).count, 1);
  const second = await account("other-buyer@example.com");
  assert.equal(
    (await second.agent.get("/api/orders/" + placed.body._id)).status,
    404,
  );
  const failBody = {
    ...body,
    requestKey: randomUUID(),
    items: [{ productId: String(p._id), quantity: 2 }],
  };
  assert.equal((await post(agent, "/api/orders", failBody)).status, 409);
  assert.equal((await Product.findById(p._id)).count, 1);
  const p2 = await Product.create({
    name: "Rollback",
    category: "ipad",
    price: 500,
    count: 10,
  });
  assert.equal(
    (
      await post(agent, "/api/orders", {
        ...failBody,
        requestKey: randomUUID(),
        items: [
          { productId: String(p2._id), quantity: 1 },
          { productId: String(p._id), quantity: 2 },
        ],
      })
    ).status,
    409,
  );
  assert.equal((await Product.findById(p2._id)).count, 10);
  await Product.updateOne(
    { _id: p._id },
    { $set: { name: "Changed", price: 900000 } },
  );
  assert.equal(
    (await agent.get("/api/orders/" + placed.body._id)).body.items[0].name,
    "Order product",
  );
  assert.equal(
    (await agent.get("/api/orders/" + placed.body._id)).body.total,
    200000,
  );
});
test("Concurrent orders cannot oversell and concurrent retries create one order", async () => {
  const { agent, user } = await account("race@example.com");
  const p = await Product.create({
    name: "Race",
    category: "watch",
    price: 100,
    count: 1,
  });
  const csrf = (await agent.get("/api/auth/csrf")).body.token;
  const body = {
    customer: { ...user, address: "123 Street" },
    items: [{ productId: String(p._id), quantity: 1 }],
    requestKey: randomUUID(),
  };
  const send = (b) =>
    agent
      .post("/api/orders")
      .set("Origin", origin)
      .set("x-csrf-token", csrf)
      .send(b);
  const results = await Promise.all([
    send(body),
    send({ ...body, requestKey: randomUUID() }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal((await Product.findById(p._id)).count, 0);
  await Product.updateOne({ _id: p._id }, { $set: { count: 5 } });
  const duplicate = { ...body, requestKey: randomUUID() };
  const same = await Promise.all([send(duplicate), send(duplicate)]);
  assert.equal(same[0].body._id, same[1].body._id);
  assert.equal(
    await Order.countDocuments({
      user: user._id,
      requestKey: duplicate.requestKey,
    }),
    1,
  );
  assert.equal((await Product.findById(p._id)).count, 4);
});
test("Admin image upload, update preserves images, DELETE and consultant access", async () => {
  const { agent } = await account("admin@example.com", "admin");
  const c = await account("consultant@example.com", "consultant");
  assert.equal((await c.agent.get("/api/admin/products")).status, 403);
  assert.equal((await c.agent.get("/api/admin/chat")).status, 200);
  const fields = {
    name: "Uploaded product",
    category: "ipad",
    price: 200000,
    count: 2,
    short_desc: "Short description",
    long_desc: "Long description",
  };
  const token = (await agent.get("/api/auth/csrf")).body.token;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO1sAAAAASUVORK5CYII=",
    "base64",
  );
  let r = agent.post("/api/admin/products").set("x-csrf-token", token);
  for (const [k, v] of Object.entries(fields)) r = r.field(k, String(v));
  const result = await r.attach("images", png, "safe.png");
  assert.equal(result.status, 201);
  assert.match(result.body.img1, /^\/uploads\/[a-f0-9]+\.png$/);
  const updated = await post(
    agent,
    "/api/admin/products/" + result.body._id,
    { ...fields, name: "Edited", img1: "malicious" },
    "put",
  );
  assert.equal(updated.status, 200);
  assert.equal(updated.body.img1, result.body.img1);
  assert.equal(
    (await post(agent, "/api/admin/products/" + result.body._id, {}, "delete"))
      .status,
    200,
  );
  assert.equal(
    (await request(app).get("/api/products/" + result.body._id)).status,
    404,
  );
  assert.equal((await Product.findById(result.body._id)).deleted, true);
  let bad = agent.post("/api/admin/products").set("x-csrf-token", token);
  for (const [k, v] of Object.entries(fields)) bad = bad.field(k, String(v));
  assert.equal(
    (
      await bad.attach(
        "images",
        Buffer.from("<script>alert(1)</script>"),
        "fake.png",
      )
    ).status,
    400,
  );
  assert.equal((await agent.get("/api/admin/dashboard")).status, 200);
});
function connect(cookie, requestOrigin = origin) {
  return new Promise((resolve, reject) => {
    const s = clientIo(`http://127.0.0.1:${http.address().port}`, {
      extraHeaders: {
        ...(requestOrigin ? { Origin: requestOrigin } : {}),
        Cookie: cookie,
      },
      forceNew: true,
      reconnection: false,
    });
    s.once("connect", () => resolve(s));
    s.once("connect_error", (e) => {
      s.disconnect();
      reject(e);
    });
  });
}
const emit = (s, data) =>
  new Promise((resolve, reject) =>
    s
      .timeout(5000)
      .emit("message", data, (e, r) => (e ? reject(e) : resolve(r))),
  );
test("Livechat persists messages, restricts room access, supports replies and /end", async () => {
  const a = await account("chat@example.com"),
    b = await account("intruder@example.com"),
    staff = await account("staff@example.com", "consultant");
  const sockets = [];
  try {
    await assert.rejects(connect(""));
    await assert.rejects(connect(a.cookie, "https://evil.example"));
    const s = await connect(a.cookie, null),
      other = await connect(b.cookie),
      advisor = await connect(staff.cookie);
    sockets.push(s, other, advisor);
    const first = await emit(s, { text: "Hello" });
    assert.ok(first.room._id);
    const id = first.room._id;
    assert.ok((await emit(other, { roomId: id, text: "intrude" })).error);
    const reply = await emit(advisor, { roomId: id, text: "Welcome" });
    assert.equal(reply.room.messages.length, 2);
    assert.equal(
      (await a.agent.get("/api/chat")).body.messages[1].text,
      "Welcome",
    );
    await new Promise((r) => setTimeout(r, 550));
    assert.equal(
      (await emit(s, { roomId: id, text: "/end" })).room.active,
      false,
    );
    assert.equal((await a.agent.get("/api/chat")).body, null);
    await post(staff.agent, "/api/auth/logout", {});
    await new Promise((r) => setTimeout(r, 550));
    assert.ok(
      (await emit(advisor, { roomId: id, text: "after logout" })).error,
    );
  } finally {
    sockets.forEach((s) => s.disconnect());
  }
});

test("Production serves Client and Admin builds and JSON API errors", async () => {
  process.env.NODE_ENV = "production";
  const production = await createApp();
  try {
    const client = await request(production.app).get("/");
    assert.equal(client.status, 200);
    assert.match(client.text, /Boutique \| Apple Store/);
    assert.match(
      client.headers["content-security-policy"],
      /img-src 'self' data: https:/,
    );
    const admin = await request(production.app).get("/admin/");
    assert.equal(admin.status, 200);
    assert.match(admin.text, /\/admin\/assets\//);
    const asset = admin.text.match(/src="([^"]+)"/)[1];
    assert.equal((await request(production.app).get(asset)).status, 200);
    assert.equal(
      (await request(production.app).get("/api/does-not-exist")).status,
      404,
    );
  } finally {
    await production.app.locals.sessionStore.close();
    process.env.NODE_ENV = "test";
  }
});
