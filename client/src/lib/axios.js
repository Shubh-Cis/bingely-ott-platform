// Axios instance for the Bingely API.
//  • Attaches the in-memory access token to every request.
//  • On a 401, transparently calls /auth/refresh once, stores the new token,
//    and replays the original request. If refresh fails, it clears auth and
//    lets the 401 surface so the UI can redirect to login.
import axios from "axios";

// Absolute API origin so the browser calls the backend directly (e.g.
// http://localhost:4001) instead of the Vite dev origin (:5173). Override via
// client/.env → VITE_API_BASE_URL. The backend's CORS allow-list already
// includes the dev origins (see CORS_ORIGINS in the server .env).
const API_ORIGIN = import.meta.env.VITE_API_BASE_URL || "http://localhost:4001";
export const API_BASE = `${API_ORIGIN.replace(/\/$/, "")}/api`;

// Tokens are namespaced per "scope" so the admin portal and the customer site
// keep SEPARATE sessions in the same browser (otherwise a viewer login would
// overwrite the admin token → admin API calls get "Admin access required").
// Scope is derived from the route: /admin/* → admin, everything else → viewer.
const KEYS = {
  admin: { access: "bingely.admin.accessToken", refresh: "bingely.admin.refreshToken" },
  viewer: { access: "bingely.viewer.accessToken", refresh: "bingely.viewer.refreshToken" },
};

export function currentScope() {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/admin") ? "admin" : "viewer";
}

export const tokenStore = {
  get access() {
    return localStorage.getItem(KEYS[currentScope()].access) || "";
  },
  get refresh() {
    return localStorage.getItem(KEYS[currentScope()].refresh) || "";
  },
  set({ accessToken, refreshToken }, scope = currentScope()) {
    if (accessToken !== undefined) localStorage.setItem(KEYS[scope].access, accessToken || "");
    if (refreshToken !== undefined) localStorage.setItem(KEYS[scope].refresh, refreshToken || "");
  },
  clear(scope = currentScope()) {
    localStorage.removeItem(KEYS[scope].access);
    localStorage.removeItem(KEYS[scope].refresh);
  },
};

const api = axios.create({ baseURL: API_BASE, withCredentials: true });

api.interceptors.request.use((config) => {
  const t = tokenStore.access;
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthCall = original?.url?.includes("/auth/");

    if (status === 401 && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        refreshing =
          refreshing ||
          axios.post(`${API_BASE}/auth/refresh`, { refreshToken: tokenStore.refresh }, { withCredentials: true });
        const { data } = await refreshing;
        refreshing = null;
        tokenStore.set({ accessToken: data.data.accessToken, refreshToken: data.data.refreshToken });
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch (e) {
        // Refresh failed → the session is dead. Clear it and bounce to the right
        // login page so the user isn't stuck on a screen where every action 401s.
        refreshing = null;
        tokenStore.clear();
        if (typeof window !== "undefined") {
          const p = window.location.pathname;
          const target = p.startsWith("/admin") ? "/admin/login" : "/login";
          if (p !== target) window.location.assign(target);
        }
        throw e;
      }
    }
    throw error;
  }
);

// Normalise any API error into a human-readable message (never a status code).
// Prefers field-level validation messages, then the API's `message`, then a
// network-friendly fallback — so the UI shows e.g. "Invalid email or password"
// or "Password must be at least 8 characters" instead of "Request failed with
// status code 401".
export function apiError(err) {
  const data = err?.response?.data;
  if (data?.errors?.length) {
    // zod validation errors: [{ path, message }]
    return data.errors.map((e) => e.message).join(" · ");
  }
  if (data?.message) return data.message;
  if (err?.response) return `Request failed (${err.response.status})`;
  if (err?.code === "ERR_NETWORK") return "Cannot reach the server. Is the API running?";
  return err?.message || "Something went wrong";
}

export default api;
