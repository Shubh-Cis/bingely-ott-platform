// Thin, typed-ish wrappers around the Bingely API. Components/slices call these
// instead of using axios directly, so endpoints live in one place.
import api from "../lib/axios";

const data = (p) => p.then((r) => r.data.data);
const full = (p) => p.then((r) => r.data); // when you also need meta

export const authApi = {
  login: (body) => data(api.post("/auth/login", body)),
  register: (body) => data(api.post("/auth/register", body)),
  adminLogin: (body) => data(api.post("/auth/admin/login", body)),
  me: () => data(api.get("/auth/me")),
  logout: () => api.post("/auth/logout"),
};

export const catalogApi = {
  home: () => data(api.get("/catalog/home")),
  search: (params) => full(api.get("/catalog/search", { params })),
  title: (slug) => data(api.get(`/catalog/titles/${slug}`)),
  related: (id) => data(api.get(`/catalog/titles/${id}/related`)),
  categories: () => data(api.get("/catalog/categories")),
  byCategory: (slug, params) => full(api.get(`/catalog/categories/${slug}/titles`, { params })),
};

export const mediaApi = {
  playUrl: (videoId) => data(api.get(`/media/play/${videoId}`)),
  // admin
  uploadUrl: (body) => data(api.post("/media/upload-url", body)),
  uploadImage: (formData) => data(api.post("/media/image", formData)), // server-side image upload (poster/backdrop/banner)
  complete: (id) => data(api.post(`/media/${id}/complete`)),
  status: (id) => data(api.get(`/media/${id}/status`)),
  list: (params) => data(api.get("/media", { params })),
  remove: (id) => data(api.delete(`/media/${id}`)),
};

export const accountApi = {
  favourites: () => data(api.get("/account/favourites")),
  addFavourite: (titleId) => data(api.post("/account/favourites", { titleId })),
  removeFavourite: (titleId) => data(api.delete(`/account/favourites/${titleId}`)),
  continueWatching: () => data(api.get("/account/continue-watching")),
  history: () => data(api.get("/account/history")),
  saveProgress: (body) => data(api.post("/account/progress", body)),
  getProgress: (params) => data(api.get("/account/progress", { params })),
  updateProfile: (body) => data(api.patch("/account/profile", body)),
  changePassword: (body) => data(api.post("/account/change-password", body)),
};

export const subscriptionApi = {
  plans: () => data(api.get("/subscriptions/plans")),
  mine: () => data(api.get("/subscriptions/me")),
  payments: () => data(api.get("/subscriptions/payments")),
  checkout: (plan) => data(api.post("/subscriptions/checkout", { plan })),
  confirm: (plan, paymentMethodId) =>
    data(api.post("/subscriptions/confirm", { plan, paymentMethodId })),
  cancel: () => data(api.post("/subscriptions/cancel")),
  portal: () => data(api.post("/subscriptions/portal")),
};

export const analyticsApi = {
  event: (body) => api.post("/analytics/events", body),
  dashboard: (days = 7) => data(api.get("/analytics/dashboard", { params: { days } })),
  mostWatched: () => data(api.get("/analytics/most-watched")),
  watchTime: (days = 30) => data(api.get("/analytics/watch-time", { params: { days } })),
  userGrowth: (days = 30) => data(api.get("/analytics/user-growth", { params: { days } })),
  revenue: () => data(api.get("/analytics/revenue")),
  subscriptions: () => data(api.get("/analytics/subscriptions")),
};

export const adminApi = {
  // generic helpers for the catalog resources
  list: (resource, params) => full(api.get(`/admin/${resource}`, { params })),
  get: (resource, id) => data(api.get(`/admin/${resource}/${id}`)),
  create: (resource, body) => data(api.post(`/admin/${resource}`, body)),
  update: (resource, id, body) => data(api.patch(`/admin/${resource}/${id}`, body)),
  remove: (resource, id) => api.delete(`/admin/${resource}/${id}`),
  // rails
  railAddTitle: (railId, titleId) => data(api.post(`/admin/rails/${railId}/items`, { titleId })),
  // users
  suspendUser: (id) => data(api.post(`/admin/users/${id}/suspend`)),
  activateUser: (id) => data(api.post(`/admin/users/${id}/activate`)),
  auditLogs: () => full(api.get("/admin/audit-logs")),
};
