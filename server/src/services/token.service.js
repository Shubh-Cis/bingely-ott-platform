// Issues and rotates JWT access + refresh tokens. Access tokens are stateless;
// refresh tokens are ALSO persisted (as a sha256 hash) in the RefreshToken table
// so they can be revoked and rotated. On each refresh we revoke the old token
// and issue a new one (rotation) — a stolen refresh token is then single-use.
const crypto = require("crypto");
const prisma = require("../config/prisma");
const config = require("../config");
const ApiError = require("../utils/ApiError");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

// Refresh TTL in ms (best-effort parse of "30d"/"15m"/seconds) for DB expiry.
function refreshTtlMs() {
  const v = config.jwt.refreshTtl;
  const m = /^(\d+)([smhd])$/.exec(String(v));
  if (!m) return 30 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  return n * { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[m[2]];
}

// principal: { id, kind: "admin"|"viewer", role?, email }
async function issueTokens(principal, meta = {}) {
  const payload = { sub: principal.id, kind: principal.kind, role: principal.role, email: principal.email };
  const accessToken = signAccessToken(payload);
  // jti makes every refresh token unique — otherwise two tokens issued in the
  // same second (same sub/kind/iat) would hash identically and collide on the
  // unique tokenHash constraint.
  const refreshToken = signRefreshToken({ sub: principal.id, kind: principal.kind, jti: crypto.randomUUID() });

  await prisma.refreshToken.create({
    data: {
      tokenHash: sha256(refreshToken),
      userId: principal.kind === "admin" ? principal.id : null,
      viewerId: principal.kind === "viewer" ? principal.id : null,
      userAgent: meta.userAgent,
      ip: meta.ip,
      expiresAt: new Date(Date.now() + refreshTtlMs()),
    },
  });

  return { accessToken, refreshToken };
}

// Verify + rotate. Returns { tokens, principal }.
async function rotateTokens(rawRefresh, meta = {}) {
  let decoded;
  try {
    decoded = verifyRefreshToken(rawRefresh);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(rawRefresh) } });
  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    throw ApiError.unauthorized("Refresh token is no longer valid");
  }

  // Load the principal fresh so role/active changes take effect.
  let principal;
  if (decoded.kind === "admin") {
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user || !user.active) throw ApiError.unauthorized("Account disabled");
    principal = { id: user.id, kind: "admin", role: user.role, email: user.email };
  } else {
    const viewer = await prisma.viewer.findUnique({ where: { id: decoded.sub } });
    if (!viewer || !viewer.active) throw ApiError.unauthorized("Account disabled");
    principal = { id: viewer.id, kind: "viewer", email: viewer.email };
  }

  // Rotate: revoke the used token, then issue a fresh pair.
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
  const tokens = await issueTokens(principal, meta);
  return { tokens, principal };
}

async function revokeToken(rawRefresh) {
  if (!rawRefresh) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(rawRefresh), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

async function revokeAllForPrincipal({ id, kind }) {
  await prisma.refreshToken.updateMany({
    where: kind === "admin" ? { userId: id, revokedAt: null } : { viewerId: id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

module.exports = { issueTokens, rotateTokens, revokeToken, revokeAllForPrincipal };
