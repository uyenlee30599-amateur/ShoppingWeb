import "dotenv/config";
import mongoose from "mongoose";
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { attachChat } from "./chat.js";
if (!process.env.MONGODB_URI) throw new Error("Cần MONGODB_URI trong .env");
await mongoose.connect(process.env.MONGODB_URI);
const config = await createApp();
const http = createServer(config.app);
const io = attachChat(http, config);
http.listen(
  Number(process.env.PORT || 5000),
  process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1",
  () => console.log("Boutique server ready"),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, async () => {
    io.close();
    http.close();
    await mongoose.disconnect();
    process.exit(0);
  });
