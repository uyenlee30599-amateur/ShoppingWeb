import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../utils/api";
import { formatPrice } from "../utils/catalog";
import PageBanner from "../components/PageBanner";
export default function OrdersPage() {
  const { id } = useParams();
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api(id ? "/api/orders/" + id : "/api/orders")
      .then((v) => {
        if (active) {
          setData(v);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <>
      <PageBanner title="Orders" />
      <section className="container orders-page">
        {error ? (
          <p role="alert">
            {error} <Link to="/login">Đăng nhập</Link>
          </p>
        ) : !data ? (
          <p>Đang tải…</p>
        ) : Array.isArray(data) ? (
          <>
            <h2>Đơn hàng của tôi</h2>
            {!data.length && <p>Chưa có đơn hàng.</p>}
            <table>
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Ngày đặt</th>
                  <th>Tổng</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {data.map((o) => (
                  <tr key={o._id}>
                    <td>
                      <Link to={"/orders/" + o._id}>{o._id}</Link>
                    </td>
                    <td>{new Date(o.createdAt).toLocaleString("vi-VN")}</td>
                    <td>{formatPrice(o.total)}</td>
                    <td>{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <>
            <Link to="/orders">← Tất cả đơn hàng</Link>
            <h2>Đơn {data._id}</h2>
            <p>
              {data.customer.fullName} · {data.customer.email} ·{" "}
              {data.customer.phone}
            </p>
            <p>{data.customer.address}</p>
            <p>
              Thời gian: {new Date(data.createdAt).toLocaleString("vi-VN")} ·
              Trạng thái: {data.status}
            </p>
            {data.items.map((i) => (
              <p key={i._id}>
                {i.name} × {i.quantity} — {formatPrice(i.price * i.quantity)}
              </p>
            ))}
            <h3>Tổng: {formatPrice(data.total)}</h3>
            <p>Email: {data.emailStatus}</p>
          </>
        )}
      </section>
    </>
  );
}
