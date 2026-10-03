import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { api, imageUrl, serverUrl } from "./api";
const money = (v) => Number(v).toLocaleString("vi-VN") + " VND";
export default function App() {
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [page, setPage] = useState("dashboard"),
    [products, setProducts] = useState([]),
    [stats, setStats] = useState(null),
    [query, setQuery] = useState(""),
    [editing, setEditing] = useState(null),
    [rooms, setRooms] = useState([]),
    [selected, setSelected] = useState(null),
    [busy, setBusy] = useState(false);
  const socket = useRef(null);
  const refresh = async () => {
    try {
      if (user?.role === "admin") {
        setProducts(await api("/api/admin/products"));
        setStats(await api("/api/admin/dashboard"));
      }
      setRooms(await api("/api/admin/chat"));
    } catch (e) {
      setError(e.message);
    }
  };
  useEffect(() => {
    api("/api/auth/me")
      .then((u) => {
        if (u.role === "customer")
          throw Error("Tài khoản không có quyền Admin");
        setUser(u);
        setPage(u.role === "consultant" ? "chat" : "dashboard");
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    async function load() {
      try {
        if (user.role === "admin") {
          const [p, d] = await Promise.all([
            api("/api/admin/products"),
            api("/api/admin/dashboard"),
          ]);
          if (active) {
            setProducts(p);
            setStats(d);
          }
        }
        const r = await api("/api/admin/chat");
        if (active) setRooms(r);
      } catch (e) {
        if (active) setError(e.message);
      }
    }
    load();
    const s = io(serverUrl || undefined, { withCredentials: true });
    socket.current = s;
    s.on("chat", (r) =>
      setRooms((old) =>
        r.active
          ? [r, ...old.filter((x) => x._id !== r._id)]
          : old.filter((x) => x._id !== r._id),
      ),
    );
    s.on("connect_error", (e) => setError(e.message));
    return () => {
      active = false;
      s.disconnect();
    };
  }, [user]);
  const login = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const u = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          ...Object.fromEntries(new FormData(e.currentTarget)),
          admin: true,
        }),
      });
      setUser(u);
      setPage(u.role === "consultant" ? "chat" : "dashboard");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = new FormData(e.currentTarget);
      await api(
        editing._id
          ? "/api/admin/products/" + editing._id
          : "/api/admin/products",
        {
          method: editing._id ? "PUT" : "POST",
          body: editing._id ? JSON.stringify(Object.fromEntries(data)) : data,
        },
      );
      setEditing(null);
      setPage("products");
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (p) => {
    if (!window.confirm("Xóa sản phẩm " + p.name + "?")) return;
    try {
      await api("/api/admin/products/" + p._id, { method: "DELETE" });
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  };
  const send = (e) => {
    e.preventDefault();
    if (!socket.current?.connected) return setError("Chat chưa kết nối");
    const form = e.currentTarget;
    setBusy(true);
    socket.current
      .timeout(10000)
      .emit(
        "message",
        { roomId: selected, text: new FormData(form).get("text") },
        (err, result) => {
          setBusy(false);
          if (err || result.error)
            setError(result?.error || "Không nhận được phản hồi");
          else {
            setError("");
            form.reset();
          }
        },
      );
  };
  if (!ready) return <p>Đang tải…</p>;
  if (!user)
    return (
      <main className="login">
        <form onSubmit={login}>
          <h1>Boutique Admin</h1>
          <p>Admin và tư vấn viên</p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Mật khẩu
            <input name="password" type="password" required />
          </label>
          <button disabled={busy}>Đăng nhập</button>
        </form>
      </main>
    );
  const room = rooms.find((r) => r._id === selected);
  return (
    <div className="layout">
      <aside>
        <h2>BOUTIQUE</h2>
        <p>
          {user.fullName} · {user.role}
        </p>
        {user.role === "admin" && (
          <>
            <button
              onClick={() => {
                setPage("dashboard");
                setEditing(null);
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setPage("products");
                setEditing(null);
              }}
            >
              Sản phẩm
            </button>
          </>
        )}
        <button
          onClick={() => {
            setPage("chat");
            setEditing(null);
          }}
        >
          Livechat
        </button>
        <button
          onClick={async () => {
            try {
              await api("/api/auth/logout", { method: "POST" });
              setUser(null);
              setRooms([]);
              setSelected(null);
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          Đăng xuất
        </button>
      </aside>
      <main>
        <h1>
          {page === "dashboard"
            ? "Dashboard"
            : page === "chat"
              ? "Livechat"
              : "Sản phẩm"}
        </h1>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {page === "dashboard" && stats && (
          <>
            <div className="stats">
              {[
                ["Người dùng", stats.users],
                ["Giao dịch", stats.transactions],
                ["Tổng doanh thu đặt hàng", money(stats.revenue)],
                ["Trung bình tháng", money(stats.monthlyAverage)],
              ].map(([k, v]) => (
                <article key={k}>
                  <small>{k}</small>
                  <h2>{v}</h2>
                </article>
              ))}
            </div>
            <h2>Đơn hàng gần đây</h2>
            <table>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Khách hàng</th>
                  <th>Ngày</th>
                  <th>Tổng</th>
                  <th>Trạng thái</th>
                  <th>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {stats.orders.map((o) => (
                  <tr key={o._id}>
                    <td>{o._id}</td>
                    <td>{o.customer.fullName}</td>
                    <td>{new Date(o.createdAt).toLocaleString("vi-VN")}</td>
                    <td>{money(o.total)}</td>
                    <td>{o.status}</td>
                    <td>
                      <details>
                        <summary>Xem</summary>
                        <p>
                          {o.customer.address} · {o.customer.phone}
                        </p>
                        {o.items.map((i) => (
                          <p key={i._id}>
                            {i.name} × {i.quantity}
                          </p>
                        ))}
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {page === "products" &&
          (editing ? (
            <form
              className="product-form"
              key={editing._id || "new"}
              onSubmit={save}
            >
              <h2>{editing._id ? "Cập nhật" : "Thêm sản phẩm"}</h2>
              {[
                ["name", "Tên"],
                ["price", "Giá"],
                ["count", "Tồn kho"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    name={key}
                    defaultValue={editing[key] ?? ""}
                    required
                    type={key === "name" ? "text" : "number"}
                    min="0"
                    step="1"
                  />
                </label>
              ))}
              <label>
                Danh mục
                <select
                  name="category"
                  defaultValue={editing.category || "iphone"}
                >
                  {["iphone", "ipad", "watch", "airpod", "other"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              {[
                ["short_desc", "Mô tả ngắn"],
                ["long_desc", "Mô tả dài"],
              ].map(([k, l]) => (
                <label key={k}>
                  {l}
                  <textarea required name={k} defaultValue={editing[k] || ""} />
                </label>
              ))}
              {!editing._id && (
                <label>
                  Ảnh (1–4 ảnh, tối đa 5 MB/ảnh)
                  <input
                    required
                    name="images"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                  />
                </label>
              )}
              <button disabled={busy}>Lưu</button>
              <button type="button" onClick={() => setEditing(null)}>
                Hủy
              </button>
            </form>
          ) : (
            <>
              <div className="toolbar">
                <input
                  placeholder="Tìm theo tên"
                  aria-label="Tìm sản phẩm"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button onClick={() => setEditing({})}>Add new</button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Ảnh</th>
                    <th>Tên</th>
                    <th>Danh mục</th>
                    <th>Giá</th>
                    <th>Tồn kho</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {products
                    .filter((p) =>
                      p.name.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((p) => (
                      <tr key={p._id}>
                        <td>
                          <img src={imageUrl(p.img1)} alt={p.name} />
                        </td>
                        <td>{p.name}</td>
                        <td>{p.category}</td>
                        <td>{money(p.price)}</td>
                        <td>{p.count}</td>
                        <td>
                          <button onClick={() => setEditing(p)}>Update</button>
                          <button className="danger" onClick={() => remove(p)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          ))}
        {page === "chat" && (
          <div className="chat">
            <section>
              <h2>Phòng đang hoạt động</h2>
              {!rooms.length && <p>Chưa có phiên chat.</p>}
              {rooms.map((r) => (
                <button key={r._id} onClick={() => setSelected(r._id)}>
                  {r._id}
                  <br />
                  {r.messages.at(-1)?.text}
                </button>
              ))}
            </section>
            <section>
              {room ? (
                <>
                  <h2>{room._id}</h2>
                  <div className="messages">
                    {room.messages.map((m) => (
                      <p key={m._id}>
                        <b>{m.name}: </b>
                        {m.text}
                      </p>
                    ))}
                  </div>
                  <form onSubmit={send}>
                    <input
                      required
                      name="text"
                      maxLength={2000}
                      aria-label="Tin nhắn"
                      placeholder="Nhập tin nhắn hoặc /end"
                    />
                    <button disabled={busy}>Gửi</button>
                  </form>
                </>
              ) : (
                <p>Chọn phòng để trả lời.</p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
