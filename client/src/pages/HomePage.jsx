import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AppImage from "../components/AppImage";
import ProductGrid, { LoadingGrid } from "../components/ProductGrid";
import useProducts from "../hooks/useProducts";
const categories = [
  { image: "product_1.png", label: "iPhone", category: "iphone" },
  { image: "product_2.png", label: "Mac", category: "all" },
  { image: "product_3.png", label: "iPad", category: "ipad" },
  { image: "product_4.png", label: "Watch", category: "watch" },
  { image: "product_5.png", label: "AirPods", category: "airpod" },
];
function SectionHeading({ eyebrow, title }) {
  return (
    <header className="section-heading">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
    </header>
  );
}
function ServiceStrip() {
  return (
    <section className="container service-strip">
      <div>
        <strong>Free shipping</strong>
        <span>Free shipping worldwide</span>
      </div>
      <div>
        <strong>24 × 7 service</strong>
        <span>Support whenever you need</span>
      </div>
      <div>
        <strong>Festival offer</strong>
        <span>Exclusive seasonal deals</span>
      </div>
    </section>
  );
}
function Newsletter() {
  const subscribe = (event) => {
    event.preventDefault();
    toast.success("Đăng ký nhận tin thành công!");
  };
  return (
    <section className="container newsletter">
      <div>
        <h2>Let&apos;s be friends!</h2>
        <p>Nhận thông tin sản phẩm và ưu đãi mới.</p>
      </div>
      <form onSubmit={subscribe}>
        <input
          type="email"
          required
          placeholder="Enter your email address"
          aria-label="Email nhận tin"
        />
        <button>Subscribe</button>
      </form>
    </section>
  );
}
export default function HomePage() {
  const navigate = useNavigate();
  const { products, loading, error } = useProducts();
  const assetsUrl = `${import.meta.env.BASE_URL}assets`;
  return (
    <>
      <section className="container hero">
        <div className="hero-copy">
          <p>New inspiration 2026</p>
          <h1>20% off on new season</h1>
          <button onClick={() => navigate("/shop")}>Browse collections</button>
        </div>
      </section>

      <section className="container section">
        <SectionHeading
          eyebrow="Carefully created collections"
          title="Browse our categories"
        />
        <div className="category-grid">
          {categories.map(({ image, label, category }) => (
            <button
              key={label}
              onClick={() => navigate(`/shop?category=${category}`)}
            >
              <AppImage
                src={`${assetsUrl}/${image}`}
                alt={label}
                width={560}
                height={330}
              />
            </button>
          ))}
        </div>
      </section>

      <section className="container section">
        <SectionHeading
          eyebrow="Made the hard way"
          title="Top trending products"
        />
        {loading && <LoadingGrid />}
        {!loading && error && <p className="status-message">{error}</p>}
        {!loading && !error && (
          <ProductGrid products={products.slice(0, 8)} popup />
        )}
      </section>

      <ServiceStrip />
      <Newsletter />
    </>
  );
}
