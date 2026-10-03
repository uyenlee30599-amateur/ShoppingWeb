import { configureStore, createSlice } from "@reduxjs/toolkit";
export const productId = (product) =>
  typeof product._id === "string" ? product._id : product._id.$oid;
const popupSlice = createSlice({
  name: "popup",
  initialState: { isOpen: false, product: null },
  reducers: {
    SHOW_POPUP: (_state, action) => ({
      isOpen: true,
      product: action.payload,
    }),
    HIDE_POPUP: () => ({ isOpen: false, product: null }),
  },
});
const authSlice = createSlice({
  name: "auth",
  initialState: { currentUser: null },
  reducers: {
    ON_LOGIN: (state, action) => {
      state.currentUser = action.payload;
    },
    ON_LOGOUT: (state) => {
      state.currentUser = null;
    },
  },
});
const cartSlice = createSlice({
  name: "cart",
  initialState: { listCart: [] },
  reducers: {
    LOAD_CART: (state, action) => {
      state.listCart = action.payload;
    },
    ADD_CART: (state, action) => {
      const id = productId(action.payload.product);
      const currentItem = state.listCart.find(
        (item) => productId(item.product) === id,
      );
      if (currentItem) {
        currentItem.quantity += action.payload.quantity;
      } else {
        state.listCart.push(action.payload);
      }
    },
    UPDATE_CART: (state, action) => {
      const item = state.listCart.find(
        (entry) => productId(entry.product) === action.payload.id,
      );
      if (item) item.quantity = Math.max(1, action.payload.quantity);
    },
    DELETE_CART: (state, action) => {
      state.listCart = state.listCart.filter(
        (item) => productId(item.product) !== action.payload,
      );
    },
    CLEAR_CART: (state) => {
      state.listCart = [];
    },
  },
});
export const { SHOW_POPUP, HIDE_POPUP } = popupSlice.actions;
export const { ON_LOGIN, ON_LOGOUT } = authSlice.actions;
export const { LOAD_CART, ADD_CART, UPDATE_CART, DELETE_CART, CLEAR_CART } =
  cartSlice.actions;
export const store = configureStore({
  reducer: {
    popup: popupSlice.reducer,
    auth: authSlice.reducer,
    cart: cartSlice.reducer,
  },
});
