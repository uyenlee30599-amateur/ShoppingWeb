import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import { MessageCircle, X } from "lucide-react";
import { api, serverUrl } from "../utils/api";
export default function LiveChat() {
  const user = useSelector((s) => s.auth.currentUser);
  const [open, setOpen] = useState(false),
    [room, setRoom] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const socket = useRef(null),
    roomId = useRef(null);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const s = io(serverUrl || undefined, { withCredentials: true });
    socket.current = s;
    const receive = (r) => {
      if (!active) return;
      setRoom(r.active ? r : null);
      roomId.current = r.active ? r._id : null;
      if (r.active) localStorage.setItem("roomID", r._id);
      else localStorage.removeItem("roomID");
    };
    api("/api/chat")
      .then((r) => {
        if (r) receive(r);
        else localStorage.removeItem("roomID");
      })
      .catch((e) => setError(e.message));
    s.on("chat", receive);
    s.on("connect_error", (e) => setError(e.message));
    return () => {
      active = false;
      s.disconnect();
      socket.current = null;
      roomId.current = null;
      localStorage.removeItem("roomID");
    };
  }, [user]);
  const send = (e) => {
    e.preventDefault();
    if (!socket.current?.connected) {
      setError("Chat chưa kết nối");
      return;
    }
    const form = e.currentTarget,
      text = new FormData(form).get("text");
    setBusy(true);
    socket.current
      .timeout(10000)
      .emit("message", { text, roomId: roomId.current }, (err, result) => {
        setBusy(false);
        if (err || result.error) {
          setError(result?.error || "Không nhận được phản hồi");
          return;
        }
        setError("");
        form.reset();
      });
  };
  return (
    <div className="chat-wrap">
      {open && (
        <section className="chat-panel">
          <div className="chat-head">
            <strong>Customer Support</strong>
            <button onClick={() => setOpen(false)} aria-label="Đóng chat">
              <X size={18} />
            </button>
          </div>
          <div className="chat-body">
            {!user ? (
              <p>Vui lòng đăng nhập để chat.</p>
            ) : (
              <>
                {room?.messages.map((m) => (
                  <p key={m._id}>
                    <b>{m.name}: </b>
                    {m.text}
                  </p>
                ))}
                <small>Gửi /end để kết thúc phiên.</small>
              </>
            )}
            {error && <p role="alert">{error}</p>}
          </div>
          {user && (
            <form className="chat-form" onSubmit={send}>
              <input
                required
                name="text"
                maxLength={2000}
                aria-label="Tin nhắn"
              />
              <button disabled={busy}>Gửi</button>
            </form>
          )}
        </section>
      )}
      <button
        className="chat-button"
        onClick={() => setOpen(!open)}
        aria-label="Live chat"
      >
        <MessageCircle size={24} />
      </button>
    </div>
  );
}
