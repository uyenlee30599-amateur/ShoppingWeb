import { useEffect } from "react";
import { Provider } from "react-redux";
import { LOAD_CART, ON_LOGIN, ON_LOGOUT, store } from "../store";
import { api } from "../utils/api";
export default function AppProviders({ children }) {
  useEffect(() => {
    localStorage.removeItem("userArr");
    localStorage.removeItem("currentUser");
    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      if (Array.isArray(cart))
        store.dispatch(
          LOAD_CART(
            cart.filter(
              (i) =>
                i.product && Number.isInteger(i.quantity) && i.quantity > 0,
            ),
          ),
        );
    } catch {
      localStorage.removeItem("cart");
    }
    api("/api/auth/me")
      .then((u) => store.dispatch(ON_LOGIN(u)))
      .catch(() => store.dispatch(ON_LOGOUT()));
    return store.subscribe(() =>
      localStorage.setItem(
        "cart",
        JSON.stringify(store.getState().cart.listCart),
      ),
    );
  }, []);
  return <Provider store={store}>{children}</Provider>;
}
