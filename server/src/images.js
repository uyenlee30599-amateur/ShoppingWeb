import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

// Signed server-side requests: credentials never reach the browser.
export async function createImageStore({
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  const mode = env.IMAGE_STORAGE || "local";
  if (mode === "local") {
    const directory = path.resolve(env.UPLOAD_DIR || "server/public/uploads");
    await mkdir(directory, { recursive: true });
    return {
      directory,
      async save(buffer, extension) {
        const name = `${randomBytes(16).toString("hex")}.${extension}`;
        const file = path.join(directory, name);
        await writeFile(file, buffer);
        return { url: `/uploads/${name}`, remove: () => unlink(file) };
      },
    };
  }
  if (mode !== "cloudinary") throw Error("IMAGE_STORAGE không hợp lệ");
  const cloud = env.CLOUDINARY_CLOUD_NAME;
  const key = env.CLOUDINARY_API_KEY;
  const secret = env.CLOUDINARY_API_SECRET;
  if (!cloud || !/^[a-zA-Z0-9_-]+$/.test(cloud) || !key || !secret)
    throw Error(
      "Cần đủ CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET",
    );
  const endpoint = `https://api.cloudinary.com/v1_1/${cloud}/image`;
  async function send(action, parameters, buffer, extension) {
    const signed = {
      ...parameters,
      timestamp: String(Math.floor(Date.now() / 1000)),
    };
    const signature = createHash("sha1")
      .update(
        Object.keys(signed)
          .sort()
          .map((k) => `${k}=${signed[k]}`)
          .join("&") + secret,
      )
      .digest("hex");
    const form = new FormData();
    for (const [k, v] of Object.entries(signed)) form.set(k, v);
    form.set("api_key", key);
    form.set("signature", signature);
    if (buffer) {
      const mime = extension === "jpg" ? "image/jpeg" : `image/${extension}`;
      form.set(
        "file",
        new Blob([buffer], { type: mime }),
        `image.${extension}`,
      );
    }
    try {
      const response = await fetchImpl(`${endpoint}/${action}`, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw Error();
      return await response.json();
    } catch {
      const error = Error(
        "Dịch vụ ảnh chưa sẵn sàng. Kiểm tra cấu hình Cloudinary hoặc thử lại.",
      );
      error.status = 502;
      throw error;
    }
  }
  return {
    async save(buffer, extension) {
      const publicId = `boutique-assignment03/${randomBytes(16).toString("hex")}`;
      const result = await send(
        "upload",
        { public_id: publicId, overwrite: "false" },
        buffer,
        extension,
      );
      if (
        result.public_id !== publicId ||
        !result.secure_url?.startsWith("https://res.cloudinary.com/")
      ) {
        const error = Error("Dịch vụ ảnh trả kết quả không hợp lệ");
        error.status = 502;
        throw error;
      }
      return {
        url: result.secure_url,
        remove: async () => {
          const deleted = await send("destroy", { public_id: publicId });
          if (!["ok", "not found"].includes(deleted.result))
            throw Error("Không thể dọn ảnh upload");
        },
      };
    },
  };
}
