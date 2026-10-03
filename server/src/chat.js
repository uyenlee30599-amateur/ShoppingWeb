import { Server } from "socket.io";
import { User, Session } from "./models.js";
import mongoose from "mongoose";
export function attachChat(http, { sessionMiddleware, origins }) {
  const io = new Server(http, {
    cors: { origin: origins, credentials: true },
    allowRequest: (req, cb) =>
      cb(null, !req.headers.origin || origins.includes(req.headers.origin)),
  });
  io.engine.use(sessionMiddleware);
  io.use(async (socket, next) => {
    try {
      const user = await User.findById(socket.request.session?.userId);
      if (!user) return next(new Error("Vui lòng đăng nhập"));
      socket.user = user;
      next();
    } catch {
      next(new Error("Không thể xác thực"));
    }
  });
  io.on("connection", (socket) => {
    socket.join(`user:${socket.user._id}`);
    if (socket.user.role !== "customer") socket.join("staff");
    let last = 0;
    socket.on("message", async (data, ack = () => {}) => {
      try {
        await new Promise((ok, no) =>
          socket.request.session.reload((e) => (e ? no(e) : ok())),
        );
        if (socket.request.session.userId !== String(socket.user._id))
          throw Error("Phiên đăng nhập đã hết hạn");
        const user = await User.findById(socket.user._id);
        if (!user) throw Error("Không thể xác thực");
        const staff = ["admin", "consultant"].includes(user.role);
        if (Date.now() - last < 500) throw Error("Vui lòng gửi chậm hơn");
        last = Date.now();
        const text = typeof data?.text === "string" ? data.text.trim() : "";
        if (!text || text.length > 2000)
          throw Error("Tin nhắn cần 1–2000 ký tự");
        let room;
        if (data.roomId) {
          if (!mongoose.isObjectIdOrHexString(data.roomId))
            throw Error("Room không hợp lệ");
          room = await Session.findOne({
            _id: data.roomId,
            active: true,
            ...(!staff ? { user: user._id } : {}),
          });
          if (!room) throw Error("Không có quyền truy cập phòng chat");
        } else {
          room = await Session.findOneAndUpdate(
            { user: user._id, active: true },
            { $setOnInsert: { user: user._id, active: true, messages: [] } },
            { upsert: true, returnDocument: "after" },
          );
        }
        if (text === "/end") room.active = false;
        else
          room.messages.push({ sender: user._id, name: user.fullName, text });
        await room.save();
        const payload = room.toObject();
        await Promise.all(
          [...io.sockets.sockets.values()].map(async (peer) => {
            try {
              await new Promise((ok, no) =>
                peer.request.session.reload((e) => (e ? no(e) : ok())),
              );
              const recipient = await User.findById(
                peer.request.session.userId,
              );
              if (!recipient) {
                peer.disconnect(true);
                return;
              }
              if (
                String(recipient._id) === String(room.user) ||
                ["admin", "consultant"].includes(recipient.role)
              )
                peer.emit("chat", payload);
            } catch {
              peer.disconnect(true);
            }
          }),
        );
        ack({ room: payload });
      } catch (e) {
        ack({ error: e.message });
      }
    });
  });
  return io;
}
