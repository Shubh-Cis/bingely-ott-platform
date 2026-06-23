import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { store } from "./app/store";
import { loadMe } from "./features/auth/authSlice";
import { router } from "./routes/router";
import "./index.css";

// Restore the session (if a token is present) before the guards evaluate.
store.dispatch(loadMe());

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>
);
