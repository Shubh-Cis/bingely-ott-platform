// Authentication business logic for both customer Viewers and back-office Users.
// Controllers stay thin; all the rules live here.
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const config = require("../config");
const ApiError = require("../utils/ApiError");
const { hashPassword, verifyPassword } = require("../utils/password");
const tokenService = require("./token.service");
const { logger } = require("../utils/logger");

function publicViewer(v) {
  return { id: v.id, email: v.email, name: v.name, emailVerified: v.emailVerified, active: v.active, createdAt: v.createdAt };
}
function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, active: u.active, createdAt: u.createdAt };
}

// ---- Customer (Viewer) ----------------------------------------------------
async function registerViewer({ email, password, name }, meta) {
  const existing = await prisma.viewer.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  const viewer = await prisma.viewer.create({
    data: { email, name: name || "", password: await hashPassword(password) },
  });

  // In production this token is emailed as a verification link.
  const verifyToken = jwt.sign({ sub: viewer.id, purpose: "verify-email" }, config.jwt.accessSecret, { expiresIn: "2d" });
  logger.info(`Email verification token for ${email}: ${verifyToken}`);

  const principal = { id: viewer.id, kind: "viewer", email: viewer.email };
  const tokens = await tokenService.issueTokens(principal, meta);
  return { viewer: publicViewer(viewer), tokens, verifyToken };
}

async function loginViewer({ email, password }, meta) {
  const viewer = await prisma.viewer.findUnique({ where: { email } });
  if (!viewer || !(await verifyPassword(password, viewer.password))) {
    throw ApiError.unauthorized("Invalid email or password");
  }
  if (!viewer.active) throw ApiError.forbidden("Account is disabled");

  const principal = { id: viewer.id, kind: "viewer", email: viewer.email };
  const tokens = await tokenService.issueTokens(principal, meta);
  return { viewer: publicViewer(viewer), tokens };
}

// ---- Back-office (User) ---------------------------------------------------
async function loginAdmin({ email, password }, meta) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.password))) {
    throw ApiError.unauthorized("Invalid email or password");
  }
  if (!user.active) throw ApiError.forbidden("Account is disabled");

  const principal = { id: user.id, kind: "admin", role: user.role, email: user.email };
  const tokens = await tokenService.issueTokens(principal, meta);
  return { user: publicUser(user), tokens };
}

// ---- Shared ---------------------------------------------------------------
async function refresh(rawRefresh, meta) {
  if (!rawRefresh) throw ApiError.unauthorized("Missing refresh token");
  const { tokens } = await tokenService.rotateTokens(rawRefresh, meta);
  return tokens;
}

async function logout(rawRefresh) {
  await tokenService.revokeToken(rawRefresh);
}

async function me(auth) {
  if (auth.kind === "admin") {
    const user = await prisma.user.findUnique({ where: { id: auth.id } });
    if (!user) throw ApiError.notFound("Account not found");
    return { kind: "admin", profile: publicUser(user) };
  }
  const viewer = await prisma.viewer.findUnique({
    where: { id: auth.id },
    include: { subscription: true },
  });
  if (!viewer) throw ApiError.notFound("Account not found");
  return { kind: "viewer", profile: publicViewer(viewer), subscription: viewer.subscription };
}

// ---- Email verification + password reset (token-based scaffolding) --------
async function verifyEmail(token) {
  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.accessSecret);
  } catch {
    throw ApiError.badRequest("Invalid or expired verification token");
  }
  if (decoded.purpose !== "verify-email") throw ApiError.badRequest("Wrong token type");
  await prisma.viewer.update({ where: { id: decoded.sub }, data: { emailVerified: true } });
}

async function requestPasswordReset(email) {
  const viewer = await prisma.viewer.findUnique({ where: { email } });
  // Always succeed (don't leak which emails exist).
  if (!viewer) return null;
  const token = jwt.sign({ sub: viewer.id, purpose: "reset-password" }, config.jwt.accessSecret, { expiresIn: "1h" });
  logger.info(`Password reset token for ${email}: ${token}`);
  return token;
}

async function resetPassword(token, newPassword) {
  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.accessSecret);
  } catch {
    throw ApiError.badRequest("Invalid or expired reset token");
  }
  if (decoded.purpose !== "reset-password") throw ApiError.badRequest("Wrong token type");
  await prisma.viewer.update({ where: { id: decoded.sub }, data: { password: await hashPassword(newPassword) } });
  await tokenService.revokeAllForPrincipal({ id: decoded.sub, kind: "viewer" });
}

module.exports = {
  registerViewer,
  loginViewer,
  loginAdmin,
  refresh,
  logout,
  me,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
};
