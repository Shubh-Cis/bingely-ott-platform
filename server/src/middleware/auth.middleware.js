// Authentication / authorization middleware.
//
//   kind === "admin"  → a back-office User (Role ADMIN | EDITOR)
//   kind === "viewer" → a customer Viewer
//
// req.auth is populated as { id, kind, role, email }.
const ApiError = require("../utils/ApiError");
const { verifyAccessToken } = require("../utils/jwt");

function extractToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  return null;
}

// Require a valid access token of any kind.
function requireAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next(ApiError.unauthorized("Missing access token"));
  try {
    const payload = verifyAccessToken(token);
    req.auth = { id: payload.sub, kind: payload.kind, role: payload.role, email: payload.email };
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired access token"));
  }
}

// Attach auth if present, but never reject. Useful for endpoints that behave
// differently for logged-in viewers (e.g. continue-watching rails).
function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.auth = { id: payload.sub, kind: payload.kind, role: payload.role, email: payload.email };
  } catch {
    /* ignore — treat as anonymous */
  }
  next();
}

// Require an admin/editor back-office user, optionally with specific roles.
function requireAdmin(...roles) {
  return (req, _res, next) => {
    requireAuth(req, _res, (err) => {
      if (err) return next(err);
      if (req.auth.kind !== "admin") return next(ApiError.forbidden("Admin access required"));
      if (roles.length && !roles.includes(req.auth.role)) {
        return next(ApiError.forbidden(`Requires role: ${roles.join(" or ")}`));
      }
      next();
    });
  };
}

// Require a customer viewer.
function requireViewer(req, _res, next) {
  requireAuth(req, _res, (err) => {
    if (err) return next(err);
    if (req.auth.kind !== "viewer") return next(ApiError.forbidden("Viewer account required"));
    next();
  });
}

module.exports = { requireAuth, optionalAuth, requireAdmin, requireViewer };
