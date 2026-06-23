// Thin wrappers around jsonwebtoken so signing/verifying lives in one place.
// Access tokens are short-lived and carry { sub, kind, role }. Refresh tokens
// are opaque-ish (also JWTs) and are additionally tracked in the DB by hash so
// they can be revoked.
const jwt = require("jsonwebtoken");
const config = require("../config");

function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.accessSecret, { expiresIn: config.jwt.accessTtl });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshTtl });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
