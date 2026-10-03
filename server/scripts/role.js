import { readFile } from "node:fs/promises";
import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../src/models.js";
const [email, role] = process.argv.slice(2);
if (!email || !["customer", "consultant", "admin"].includes(role))
  throw Error("Usage: npm run user:role -- email role");
if (!process.env.MONGODB_URI)
  process.env.MONGODB_URI = await readFile("server/private/local-uri", "utf8");
await mongoose.connect(process.env.MONGODB_URI);
const u = await User.findOneAndUpdate(
  { email: email.toLowerCase() },
  { $set: { role } },
  { returnDocument: "after" },
);
console.log(u ? "Đã cập nhật quyền" : "Không tìm thấy tài khoản");
await mongoose.disconnect();
