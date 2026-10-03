import "dotenv/config";
import mongoose from "mongoose";
import { readFile } from "node:fs/promises";
import { Product } from "../src/models.js";
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
console.log(
  `Đã import ${data.length} sản phẩm; giữ nguyên sản phẩm đã tồn tại.`,
);
await mongoose.disconnect();
