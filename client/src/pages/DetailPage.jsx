import { api } from "../utils/api";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import AppImage from "../components/AppImage";
import ProductGrid from "../components/ProductGrid";

import { ADD_CART } from "../store";
import { categoryLabels, formatPrice } from "../utils/catalog";
export default function DetailPage({ id }) {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api("/api/products/" + id)
      .then((v) => {
        if (active) setData(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id]);
  const loading = !data && !error;
  const dispatch = useDispatch();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState("");
  const product = data?.product;
  if (loading) {
    return <div className="container detail-loading">Đang tải sản phẩm...</div>;
  }
  if (!product) {
    return (
      <div className="container empty-state">
        Không tìm thấy sản phẩm. <Link to="/shop">Quay lại cửa hàng</Link>
      </div>
    );
  }
  const images = [product.img1, product.img2, product.img3, product.img4];
  const relatedProducts = data.related;
  const addToCart = () => {
    if (!product.count || quantity > product.count)
      return toast.error("Không đủ tồn kho");
    dispatch(ADD_CART({ product, quantity }));
    toast.success("Đã thêm sản phẩm vào giỏ hàng");
  };
  return (
    <section className="container detail-page">
      <div className="detail-main">
        <div className="gallery">
          <div className="thumbs">
            {images.map((source, index) => (
              <button
                key={`${source}-${index}`}
                className={activeImage === source ? "active" : ""}
                onClick={() => setActiveImage(source)}
              >
                <AppImage
                  src={source}
                  alt={`${product.name} ${index + 1}`}
                  width={110}
                  height={110}
                />
              </button>
            ))}
          </div>

          <div className="main-image">
            <AppImage
              src={activeImage || product.img1}
              alt={product.name}
              width={700}
              height={700}
            />
          </div>
        </div>

        <div className="detail-info">
          <p className="eyebrow">{categoryLabels[product.category]}</p>
          <h1>{product.name}</h1>
          <p className="detail-price">{formatPrice(product.price)}</p>
          <p className="short-desc">{product.short_desc}</p>
          <p className="category">
            <strong>Category:</strong> {categoryLabels[product.category]}
          </p>

          <p>
            {product.count > 0 ? `Còn ${product.count} sản phẩm` : "Hết hàng"}
          </p>
          <div className="add-cart">
            <span>Quantity</span>
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>
              <Minus size={16} />
            </button>
            <b>{quantity}</b>
            <button
              onClick={() => setQuantity(Math.min(product.count, quantity + 1))}
            >
              <Plus size={16} />
            </button>
            <button
              className="dark-button"
              disabled={!product.count}
              onClick={addToCart}
            >
              Add to cart
            </button>
          </div>
        </div>
      </div>

      <div className="description">
        <span>Description</span>
        <h2>Product description</h2>
        <p>{product.long_desc}</p>
      </div>

      <div className="related">
        <h2>Related products</h2>
        {relatedProducts.length > 0 ? (
          <ProductGrid products={relatedProducts} />
        ) : (
          <p>Chưa có sản phẩm liên quan.</p>
        )}
      </div>
    </section>
  );
}
