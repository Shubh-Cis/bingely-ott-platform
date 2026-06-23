import { createBrowserRouter } from "react-router-dom";
import CustomerLayout from "../layouts/CustomerLayout";
import AdminLayout from "../layouts/AdminLayout";
import { RequireViewer, RequireAdmin } from "../components/RouteGuards";

import Home from "../pages/customer/Home";
import TitleDetail from "../pages/customer/TitleDetail";
import Watch from "../pages/customer/Watch";
import Search from "../pages/customer/Search";
import Login from "../pages/customer/Login";
import Register from "../pages/customer/Register";
import Account from "../pages/customer/Account";
import Plans from "../pages/customer/Plans";
import Contact from "../pages/customer/Contact";
import NewPopular from "../pages/customer/NewPopular";
import MyList from "../pages/customer/MyList";

import AdminLogin from "../pages/admin/AdminLogin";
import Dashboard from "../pages/admin/Dashboard";
import Titles from "../pages/admin/Titles";
import TitleForm from "../pages/admin/TitleForm";
import Categories from "../pages/admin/Categories";
import Rails from "../pages/admin/Rails";
import Heroes from "../pages/admin/Heroes";
import Media from "../pages/admin/Media";
import Users from "../pages/admin/Users";
import Checkout from "../pages/customer/Checkout";

export const router = createBrowserRouter([
  {
    element: <CustomerLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/title/:slug", element: <TitleDetail /> },
      { path: "/watch/:slug", element: <Watch /> },
      { path: "/search", element: <Search /> },
      { path: "/new", element: <NewPopular /> },
      { path: "/my-list", element: <RequireViewer><MyList /></RequireViewer> },
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "/plans", element: <Plans /> },
      { path: "/contact", element: <Contact /> },
      { path: "/account", element: <RequireViewer><Account /></RequireViewer> },
      { path: "/checkout/:plan", element: <RequireViewer><Checkout /></RequireViewer> },
    ],
  },
  { path: "/admin/login", element: <AdminLogin /> },
  {
    path: "/admin",
    element: <RequireAdmin><AdminLayout /></RequireAdmin>,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "titles", element: <Titles /> },
      { path: "titles/:id", element: <TitleForm /> },
      { path: "categories", element: <Categories /> },
      { path: "rails", element: <Rails /> },
      { path: "heroes", element: <Heroes /> },
      { path: "media", element: <Media /> },
      { path: "users", element: <Users /> },
    ],
  },
], {
  // Opt into v7 behaviour early (silences the dev console future-flag warnings).
  future: { v7_startTransition: true, v7_relativeSplatPath: true },
});
