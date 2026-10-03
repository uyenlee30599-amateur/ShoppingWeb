import OrdersPage from "./pages/OrdersPage";
import { Route, Routes, useParams } from "react-router-dom";
import SiteShell from "./components/SiteShell";
import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import DetailPage from "./pages/DetailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
function ProductDetailRoute() {
  const { productId = "" } = useParams();
  return <DetailPage key={productId} id={productId} />;
}
export default function App() {
  return (
    <SiteShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/detail/:productId" element={<ProductDetailRoute />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrdersPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </SiteShell>
  );
}
