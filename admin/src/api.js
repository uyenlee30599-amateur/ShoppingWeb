const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export const serverUrl = base;
export async function api(url, options = {}) {
  const method = options.method || "GET";
  const headers = { ...options.headers };
  if (!["GET", "HEAD"].includes(method)) {
    const r = await fetch(base + "/api/auth/csrf", { credentials: "include" });
    if (!r.ok) throw Error("Không thể lấy CSRF token");
    headers["x-csrf-token"] = (await r.json()).token;
  }
  if (options.body && !(options.body instanceof FormData))
    headers["Content-Type"] = "application/json";
  const response = await fetch(base + url, {
    ...options,
    headers,
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.message || "Yêu cầu thất bại");
  return data;
}
export const imageUrl = (url) =>
  url?.startsWith("/uploads/") ? base + url : url;
