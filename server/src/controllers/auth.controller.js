const authService = require("../services/auth.service");
const asyncHandler = require("../utils/asyncHandler");
const { ok, created } = require("../utils/ApiResponse");
const config = require("../config");

// Send the refresh token as an httpOnly cookie AND in the JSON body, so both
// cookie-based web clients and token-based mobile/clients work.
function setRefreshCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? "none" : "lax",
    path: "/api/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function reqMeta(req) {
  return { userAgent: req.headers["user-agent"], ip: req.ip };
}

const register = asyncHandler(async (req, res) => {
  const { viewer, tokens } = await authService.registerViewer(req.body, reqMeta(req));
  setRefreshCookie(res, tokens.refreshToken);
  return created(res, { viewer, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, "Account created");
});

const login = asyncHandler(async (req, res) => {
  const { viewer, tokens } = await authService.loginViewer(req.body, reqMeta(req));
  setRefreshCookie(res, tokens.refreshToken);
  return ok(res, { viewer, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, "Logged in");
});

const adminLogin = asyncHandler(async (req, res) => {
  const { user, tokens } = await authService.loginAdmin(req.body, reqMeta(req));
  setRefreshCookie(res, tokens.refreshToken);
  return ok(res, { user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, "Logged in");
});

const refresh = asyncHandler(async (req, res) => {
  const raw = req.cookies?.refreshToken || req.body?.refreshToken;
  const tokens = await authService.refresh(raw, reqMeta(req));
  setRefreshCookie(res, tokens.refreshToken);
  return ok(res, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, "Token refreshed");
});

const logout = asyncHandler(async (req, res) => {
  const raw = req.cookies?.refreshToken || req.body?.refreshToken;
  await authService.logout(raw);
  res.clearCookie("refreshToken", { path: "/api/auth" });
  return ok(res, null, "Logged out");
});

const me = asyncHandler(async (req, res) => {
  return ok(res, await authService.me(req.auth));
});

const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body.token);
  return ok(res, null, "Email verified");
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  return ok(res, null, "If that email exists, a reset link has been sent");
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  return ok(res, null, "Password updated");
});

module.exports = {
  register,
  login,
  adminLogin,
  refresh,
  logout,
  me,
  verifyEmail,
  forgotPassword,
  resetPassword,
};
