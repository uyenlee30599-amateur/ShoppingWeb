import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createImageStore } from "../src/images.js";

const env = {
  IMAGE_STORAGE: "cloudinary",
  CLOUDINARY_CLOUD_NAME: "test-cloud",
  CLOUDINARY_API_KEY: "test-key",
  CLOUDINARY_API_SECRET: "fake-test-secret",
};
test("Cloudinary uploads are signed, return durable URLs and cleanup only the uploaded asset", async () => {
  const calls = [];
  const store = await createImageStore({
    env,
    fetchImpl: async (url, { body }) => {
      const params = Object.fromEntries(body.entries());
      calls.push({ url, params });
      const signed = Object.keys(params)
        .filter((k) => !["file", "api_key", "signature"].includes(k))
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("&");
      assert.equal(
        params.signature,
        createHash("sha1")
          .update(signed + env.CLOUDINARY_API_SECRET)
          .digest("hex"),
      );
      assert.equal(params.api_key, "test-key");
      assert.equal(params.api_secret, undefined);
      assert.ok(Number(params.timestamp) > 0);
      if (url.endsWith("/upload")) {
        assert.equal(params.overwrite, "false");
        assert.equal(params.file.type, "image/png");
        assert.equal(await params.file.text(), "fake-image");
        assert.match(params.public_id, /^boutique-assignment03\/[a-f0-9]{32}$/);
        return {
          ok: true,
          json: async () => ({
            public_id: params.public_id,
            secure_url: `https://res.cloudinary.com/test-cloud/image/upload/${params.public_id}.png`,
          }),
        };
      }
      return { ok: true, json: async () => ({ result: "ok" }) };
    },
  });
  assert.equal(store.directory, undefined);
  const image = await store.save(Buffer.from("fake-image"), "png");
  assert.match(image.url, /^https:\/\/res.cloudinary.com\//);
  await image.remove();
  assert.equal(calls.length, 2);
  assert.equal(
    calls[0].url,
    "https://api.cloudinary.com/v1_1/test-cloud/image/upload",
  );
  assert.equal(
    calls[1].url,
    "https://api.cloudinary.com/v1_1/test-cloud/image/destroy",
  );
  assert.equal(calls[1].params.public_id, calls[0].params.public_id);
});
test("Cloudinary rejects missing config and hides provider errors and credentials", async () => {
  await assert.rejects(
    createImageStore({ env: { IMAGE_STORAGE: "cloudinary" } }),
    /Cần đủ/,
  );
  await assert.rejects(
    createImageStore({ env: { IMAGE_STORAGE: "invalid" } }),
    /không hợp lệ/,
  );
  for (const fetchImpl of [
    async () => ({
      ok: false,
      json: async () => ({ error: { message: env.CLOUDINARY_API_SECRET } }),
    }),
    async () => {
      throw Error(env.CLOUDINARY_API_SECRET);
    },
  ]) {
    const store = await createImageStore({ env, fetchImpl });
    await assert.rejects(store.save(Buffer.from("image"), "jpg"), (error) => {
      assert.equal(error.status, 502);
      assert.ok(!error.message.includes(env.CLOUDINARY_API_SECRET));
      return true;
    });
  }
});
