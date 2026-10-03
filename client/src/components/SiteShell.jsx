import LiveChat from "./LiveChat";
import { api } from "../utils/api";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ShoppingBag, UserRound, X } from "lucide-react";
import { Toaster, toast } from "sonner";
import AppImage from "./AppImage";
import { HIDE_POPUP, ON_LOGOUT, productId } from "../store";
import { formatPrice } from "../utils/catalog";
function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <h3>Customer Services</h3>
          <a href="#">Help & Contact Us</a>
          <a href="#">Returns & Refunds</a>
          <a href="#">Online Stores</a>
          <a href="#">Terms & Conditions</a>
        </div>
        <div>
          <h3>Company</h3>
          <a href="#">What We Do</a>
          <a href="#">Available Services</a>
          <a href="#">Latest Posts</a>
          <a href="#">FAQs</a>
        </div>
        <div>
          <h3>Social Media</h3>
          <a href="#">Twitter</a>
          <a href="#">Instagram</a>
          <a href="#">Facebook</a>
          <a href="#">Pinterest</a>
        </div>
      </div>
    </footer>
  );
}

function ProductPopup() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isOpen, product } = useSelector((state) => state.popup);
  if (!isOpen || !product) return null;
  const viewProductDetail = () => {
    dispatch(HIDE_POPUP());
    navigate(`/detail/${productId(product)}`);
  };
  return (
    <div
      className="dialog-overlay"
      role="presentation"
      onMouseDown={() => dispatch(HIDE_POPUP())}
    >
      <section
        className="product-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="dialog-close"
          onClick={() => dispatch(HIDE_POPUP())}
          aria-label="Đóng popup"
        >
          <X size={19} />
        </button>

        <div className="popup-grid">
          <AppImage
            src={product.img1}
            alt={product.name}
            width={540}
            height={540}
          />
          <div>
            <h2 id="popup-title">{product.name}</h2>
            <p className="price">{formatPrice(product.price)}</p>
            <p className="popup-description">{product.short_desc}</p>
            <button className="dark-button" onClick={viewProductDetail}>
              View detail <span>→</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
export default function SiteShell({ children }) {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useSelector((state) => state.auth.currentUser);
  const cartCount = useSelector((state) =>
    state.cart.listCart.reduce((sum, item) => sum + item.quantity, 0),
  );
  const navClass = (href) =>
    pathname === href ? "nav-link active" : "nav-link";
  return (
    <div className="site-shell">
      <header className="navbar">
        <div className="container nav-inner">
          <button
            className="mobile-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Mở menu"
          >
            ☰
          </button>

          <nav
            className={menuOpen ? "main-nav open" : "main-nav"}
            aria-label="Điều hướng chính"
          >
            <Link className={navClass("/")} to="/">
              Home
            </Link>
            <Link className={navClass("/shop")} to="/shop">
              Shop
            </Link>
          </nav>

          <Link className="brand" to="/">
            BOUTIQUE
          </Link>

          <nav className="account-nav" aria-label="Tài khoản">
            <Link to="/cart">
              <ShoppingBag size={17} /> Cart
              <span className="cart-count">{cartCount}</span>
            </Link>

            {user ? (
              <>
                <span className="user-name">
                  <UserRound size={16} />
                  {user.fullName}
                </span>
                <Link to="/orders">Orders</Link>
                <button
                  onClick={async () => {
                    try {
                      await api("/api/auth/logout", { method: "POST" });
                      dispatch(ON_LOGOUT());
                    } catch (e) {
                      toast.error(e.message);
                    }
                  }}
                >
                  (Logout)
                </button>
              </>
            ) : (
              <Link to="/login">
                <UserRound size={16} /> Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>{children}</main>
      <LiveChat />
      <Footer />
      <ProductPopup />
      <Toaster position="top-right" richColors />
    </div>
  );
}
