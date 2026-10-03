import { useRef, useState } from "react";
import { api } from "../utils/api";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import PageBanner from "../components/PageBanner";
import { CLEAR_CART, productId } from "../store";
import { formatPrice } from "../utils/catalog";
const billingFields = [
  { label: "Full name", type: "text", name: "fullName" },
  { label: "Email", type: "email", name: "email" },
  { label: "Phone number", type: "tel", name: "phone" },
  { label: "Address", type: "text", name: "address" },
];
export default function CheckoutPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector((state) => state.cart.listCart);
  const total = items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );
  const user = useSelector((state) => state.auth.currentUser);
  const [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());
  const placeOrder = async (event) => {
    event.preventDefault();
    if (!user) {
      toast.error("Vui lòng đăng nhập để đặt hàng");
      navigate("/login");
      return;
    }
    if (!items.length) return toast.error("Giỏ hàng đang trống");
    const customer = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    try {
      const order = await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customer,
          items: items.map((i) => ({
            productId: productId(i.product),
            quantity: i.quantity,
          })),
          requestKey: key.current,
        }),
      });
      dispatch(CLEAR_CART());
      toast.success("Đặt hàng thành công");
      if (order.emailStatus === "failed")
        toast.warning("Đơn đã lưu nhưng email chưa gửi được");
      navigate("/orders/" + order._id);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageBanner title="Checkout" />
      <section className="container checkout">
        <h2>Billing details</h2>
        <div className="checkout-grid">
          <form onSubmit={placeOrder}>
            {billingFields.map(({ label, type, name }) => (
              <label key={label}>
                {label}
                <input
                  required
                  name={name}
                  type={type}
                  placeholder={label}
                  defaultValue={user?.[name] || ""}
                />
              </label>
            ))}
            <button className="dark-button" disabled={busy}>
              {busy ? "Đang đặt hàng…" : "Place order"}
            </button>
          </form>

          <aside className="order-summary">
            <h2>Your order</h2>
            {items.length > 0 ? (
              items.map(({ product, quantity }) => (
                <p key={productId(product)}>
                  <strong>{product.name}</strong>
                  <span>
                    {formatPrice(product.price)} × {quantity}
                  </span>
                </p>
              ))
            ) : (
              <p>Chưa có sản phẩm.</p>
            )}
            <div className="order-total">
              <span>Total</span>
              <b>{formatPrice(total)}</b>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
