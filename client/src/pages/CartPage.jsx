import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import AppImage from "../components/AppImage";
import PageBanner from "../components/PageBanner";
import { DELETE_CART, productId, UPDATE_CART } from "../store";
import { formatPrice } from "../utils/catalog";
export default function CartPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector((state) => state.cart.listCart);
  const total = items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );
  return (
    <>
      <PageBanner title="Cart" />
      <section className="container cart-section">
        <h2>Shopping cart</h2>

        {items.length === 0 ? (
          <div className="empty-state">
            <ShoppingBag size={38} />
            <p>Giỏ hàng của bạn đang trống.</p>
            <button className="dark-button" onClick={() => navigate("/shop")}>
              Continue shopping
            </button>
          </div>
        ) : (
          <div className="cart-layout">
            <div>
              <div className="cart-table">
                <div className="cart-row cart-head">
                  <span>Image</span>
                  <span>Product</span>
                  <span>Price</span>
                  <span>Quantity</span>
                  <span>Total</span>
                  <span>Remove</span>
                </div>

                {items.map(({ product, quantity }) => {
                  const id = productId(product);
                  return (
                    <div className="cart-row" key={id}>
                      <AppImage
                        src={product.img1}
                        alt={product.name}
                        width={90}
                        height={90}
                      />
                      <strong>{product.name}</strong>
                      <span>{formatPrice(product.price)}</span>
                      <div className="qty">
                        <button
                          onClick={() =>
                            dispatch(
                              UPDATE_CART({ id, quantity: quantity - 1 }),
                            )
                          }
                        >
                          <Minus size={15} />
                        </button>
                        <b>{quantity}</b>
                        <button
                          onClick={() =>
                            dispatch(
                              UPDATE_CART({ id, quantity: quantity + 1 }),
                            )
                          }
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                      <span>
                        {formatPrice(Number(product.price) * quantity)}
                      </span>
                      <button
                        className="remove"
                        onClick={() => dispatch(DELETE_CART(id))}
                        aria-label={`Xóa ${product.name}`}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="cart-actions">
                <button onClick={() => navigate("/shop")}>
                  ← Continue shopping
                </button>
                <button onClick={() => navigate("/checkout")}>
                  Proceed to checkout →
                </button>
              </div>
            </div>

            <aside className="cart-total">
              <h2>Cart total</h2>
              <p>
                <span>Subtotal</span>
                <b>{formatPrice(total)}</b>
              </p>
              <p className="grand">
                <span>Total</span>
                <b>{formatPrice(total)}</b>
              </p>
              <input placeholder="Enter your coupon" />
              <button className="dark-button">Apply coupon</button>
            </aside>
          </div>
        )}
      </section>
    </>
  );
}
