import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import PageBanner from "../components/PageBanner";
import ProductGrid, { LoadingGrid } from "../components/ProductGrid";
import useProducts from "../hooks/useProducts";
import { categoryLabels } from "../utils/catalog";
export default function ShopPage() {
  const { products, loading, error } = useProducts();
  const { search: queryString } = useLocation();
  const categoryFromUrl =
    new URLSearchParams(queryString).get("category") || "all";
  const validCategory = categoryLabels[categoryFromUrl]
    ? categoryFromUrl
    : "all";
  const [category, setCategory] = useState(validCategory);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("default");
  const filteredProducts = useMemo(() => {
    const keyword = search.toLowerCase();
    const result = products.filter((product) => {
      const matchesCategory =
        category === "all" || product.category === category;
      const matchesSearch = product.name.toLowerCase().includes(keyword);
      return matchesCategory && matchesSearch;
    });
    if (sort === "low") {
      return [...result].sort((a, b) => Number(a.price) - Number(b.price));
    }
    if (sort === "high") {
      return [...result].sort((a, b) => Number(b.price) - Number(a.price));
    }
    return result;
  }, [products, category, search, sort]);
  return (
    <>
      <PageBanner title="Shop" />
      <section className="container shop-layout">
        <aside className="filters">
          <h2>Categories</h2>
          {Object.entries(categoryLabels).map(([key, label]) => (
            <button
              className={category === key ? "selected" : ""}
              key={key}
              onClick={() => setCategory(key)}
            >
              {label}
            </button>
          ))}
        </aside>

        <div className="shop-content">
          <div className="shop-tools">
            <label>
              <Search size={17} />
              <input
                placeholder="What are you looking for?"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <select
              aria-label="Sắp xếp"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="default">Default sorting</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </div>

          {loading && <LoadingGrid />}
          {!loading && error && <p className="status-message">{error}</p>}
          {!loading && !error && filteredProducts.length > 0 && (
            <ProductGrid products={filteredProducts} />
          )}
          {!loading && !error && filteredProducts.length === 0 && (
            <p className="empty-state">Không tìm thấy sản phẩm phù hợp.</p>
          )}
        </div>
      </section>
    </>
  );
}
