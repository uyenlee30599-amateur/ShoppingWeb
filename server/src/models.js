import mongoose from "mongoose";
const { Schema, model } = mongoose;
const userSchema = new Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["customer", "consultant", "admin"],
      default: "customer",
    },
  },
  { timestamps: true },
);
export const User = model("User", userSchema);
export const Product = model(
  "Product",
  new Schema(
    {
      name: { type: String, required: true },
      category: { type: String, required: true },
      price: { type: Number, required: true, min: 0 },
      short_desc: String,
      long_desc: String,
      img1: String,
      img2: String,
      img3: String,
      img4: String,
      count: { type: Number, default: 20, min: 0 },
      deleted: { type: Boolean, default: false },
    },
    { timestamps: true },
  ),
);
export const Order = model(
  "Order",
  new Schema(
    {
      user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      customer: {
        fullName: String,
        email: String,
        phone: String,
        address: String,
      },
      items: [
        {
          product: { type: Schema.Types.ObjectId, ref: "Product" },
          name: String,
          image: String,
          price: Number,
          quantity: Number,
        },
      ],
      total: Number,
      status: {
        type: String,
        enum: ["pending", "processing", "shipped", "completed"],
        default: "pending",
      },
      emailStatus: {
        type: String,
        enum: ["pending", "sent", "preview", "failed"],
        default: "pending",
      },
      requestKey: { type: String, required: true },
    },
    { timestamps: true },
  ),
);
Order.schema.index({ user: 1, requestKey: 1 }, { unique: true });
export const Session = model(
  "Session",
  new Schema(
    {
      user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      active: { type: Boolean, default: true },
      messages: [
        {
          sender: { type: Schema.Types.ObjectId, ref: "User" },
          name: String,
          text: String,
          at: { type: Date, default: Date.now },
        },
      ],
    },
    { timestamps: true },
  ),
);
Session.schema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { active: true } },
);
