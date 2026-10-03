// Local development only: persistent local replica set, no cloud credentials.
import { MongoMemoryServer } from "mongodb-memory-server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { attachChat } from "../src/chat.js";
import { Product } from "../src/models.js";
if (process.env.NODE_ENV === "production")
  throw Error("Chỉ dùng dev:local để phát triển trên máy cá nhân");
// Quick local mode always previews mail; use npm run dev with .env for SMTP.
process.env.NODE_ENV = "development";
delete process.env.SMTP_HOST;
const dir = path.resolve("server/private/local-mongo");
await mkdir(dir, { recursive: true });
const secretFile = path.resolve("server/private/local-secret");
try {
  process.env.SESSION_SECRET = await readFile(secretFile, "utf8");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  process.env.SESSION_SECRET = randomBytes(48).toString("hex");
  await writeFile(secretFile, process.env.SESSION_SECRET, { mode: 0o600 });
}
// Reuse the same port: the persisted replica-set config contains this address.
let mongoPort = 27019;
try {
  mongoPort = Number(
    new URL(await readFile("server/private/local-uri", "utf8")).port,
  );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const probe = createServer();
await new Promise((resolve, reject) => {
  probe.once("error", () =>
    reject(
      new Error(
        `Cổng MongoDB local ${mongoPort} đang được sử dụng. Hãy dừng phiên dev:local cũ.`,
      ),
    ),
  );
  probe.listen(mongoPort, "127.0.0.1", () => probe.close(resolve));
});
const mongo = await MongoMemoryServer.create({
  binary: { version: "8.0.16" },
  instance: {
    dbPath: dir,
    port: mongoPort,
    portGeneration: false,
    replSet: "testset",
    ip: "127.0.0.1",
  },
});
// Initialize once; never rewrite the persisted replica-set configuration on restart.
const direct = new mongoose.mongo.MongoClient(mongo.getUri("admin"), {
  directConnection: true,
});
await direct.connect();
try {
  await direct.db("admin").command({
    replSetInitiate: {
      _id: "testset",
      members: [{ _id: 0, host: `127.0.0.1:${mongoPort}` }],
    },
  });
} catch (e) {
  if (e.code !== 23) {
    await direct.close();
    await mongo.stop({ doCleanup: false });
    throw e;
  }
}
let primary = false;
for (let i = 0; i < 150; i++) {
  if ((await direct.db("admin").command({ hello: 1 })).isWritablePrimary) {
    primary = true;
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
}
await direct.close();
if (!primary) {
  await mongo.stop({ doCleanup: false });
  throw Error("MongoDB local không chọn được primary");
}
process.env.MONGODB_URI = mongo.getUri("boutique") + "?replicaSet=testset";
await writeFile("server/private/local-uri", process.env.MONGODB_URI, {
  mode: 0o600,
});
await mongoose.connect(process.env.MONGODB_URI);
const data = JSON.parse(
  await readFile(
    new URL("../../client/public/data/products.json", import.meta.url),
    "utf8",
  ),
);
for (const p of data)
  await Product.updateOne(
    { _id: p._id.$oid },
    {
      $setOnInsert: {
        ...p,
        _id: p._id.$oid,
        price: Number(p.price),
        count: 20,
        deleted: false,
      },
    },
    { upsert: true },
  );
const config = await createApp();
const http = createServer(config.app);
const io = attachChat(http, config);
await new Promise((resolve, reject) => {
  http.once("error", reject);
  http.listen(5000, "127.0.0.1", resolve);
});
const children = ["dev:client", "dev:admin"].map((s) =>
  spawn("npm", ["run", s], { stdio: "inherit" }),
);
console.log(
  "Local database ready. Client: http://127.0.0.1:3000; Admin: http://127.0.0.1:3001",
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  children.forEach((c) => c.kill("SIGTERM"));
  io.close();
  http.close();
  await config.app.locals.sessionStore.close();
  await mongoose.disconnect();
  await mongo.stop({ doCleanup: false });
  process.exit(0);
}
children.forEach((c) =>
  c.on("exit", () => {
    if (!stopping) stop();
  }),
);
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
