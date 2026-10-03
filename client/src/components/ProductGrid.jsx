import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import AppImage from "./AppImage";
import { productId, SHOW_POPUP } from "../store";
import { formatPrice } from "../utils/catalog";
function ProductCard({ product, popup = false }) {
  const dispatch = useDispatch();
  const id = productId(product);
  const content = (
    <>
      <div className="product-image">
        <AppImage
          src={product.img1}
          alt={product.name}
          width={430}
          height={430}
        />
        <span className="image-action">
          {popup ? "Quick view" : "View product"}
        </span>
      </div>
      <h3>{product.name}</h3>
      <p>{formatPrice(product.price)}</p>
    </>
  );
  if (popup) {
    return (
      <button
        className="product-card"
        onClick={() => dispatch(SHOW_POPUP(product))}
      >
        {content}
      </button>
    );
  }
  return (
    <Link className="product-card" to={`/detail/${id}`}>
      {content}
    </Link>
  );
}
export default function ProductGrid({ products, popup = false }) {
  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={productId(product)} product={product} popup={popup} />
      ))}
    </div>
  );
}
export function LoadingGrid() {
  return (
    <div className="product-grid">
      {Array.from({ length: 8 }).map((_, index) => (
        <div className="product-skeleton" key={index} />
      ))}
    </div>
  );
}
