import { z } from "zod";
export const customerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9 ()-]{8,20}$/),
  address: z.string().trim().min(5).max(500),
});
export const registerSchema = customerSchema
  .omit({ address: true })
  .extend({ password: z.string().min(9).max(128) });
export const loginSchema = z.object({
  email: z.email().transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(128),
  admin: z.boolean().optional(),
});
export const productSchema = z.object({
  name: z.string().trim().min(2).max(200),
  category: z.enum(["iphone", "ipad", "watch", "airpod", "other"]),
  price: z.coerce.number().int().min(0).max(1000000000),
  count: z.coerce.number().int().min(0).max(100000),
  short_desc: z.string().trim().min(1).max(5000),
  long_desc: z.string().trim().min(1).max(20000),
});
export const orderSchema = z
  .object({
    customer: customerSchema,
    items: z
      .array(
        z.object({
          productId: z.string().regex(/^[a-f0-9]{24}$/i),
          quantity: z.number().int().min(1).max(100),
        }),
      )
      .min(1)
      .max(100),
    requestKey: z.string().uuid(),
  })
  .superRefine((v, c) => {
    if (new Set(v.items.map((i) => i.productId)).size !== v.items.length)
      c.addIssue({
        code: "custom",
        message: "Sản phẩm bị trùng trong đơn hàng",
      });
  });
export function fail(status, message) {
  const e = new Error(message);
  e.status = status;
  throw e;
}
