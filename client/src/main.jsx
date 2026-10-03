import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import AppProviders from "./providers/AppProviders";
import App from "./App";
import "./styles/index.css";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppProviders>
      <HashRouter>
        <App />
      </HashRouter>
    </AppProviders>
  </React.StrictMode>,
);
