import { useEffect, useState } from "react";
import { api } from "../utils/api";
export default function useProducts() {
  const [products, setProducts] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api("/api/products")
      .then((data) => {
        if (active) setProducts(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return { products, loading, error };
}
