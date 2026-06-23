const { ZodError } = require("zod");
const ApiError = require("../utils/ApiError");
const { logger } = require("../utils/logger");
const config = require("../config");

// 404 handler — reached when no route matched.
function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Central error handler. Must have 4 args for Express to recognise it.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Zod validation errors → 400 with field details.
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
    });
  }

  // Prisma known errors (unique constraint, not found, etc.).
  if (err.code && typeof err.code === "string" && err.code.startsWith("P")) {
    if (err.code === "P2002") {
      const field = err.meta?.target?.join?.(", ") || "field";
      return res.status(409).json({ success: false, message: `Already exists (${field})` });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
  }

  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} → ${err.message}`, config.isProd ? "" : err.stack);
  }

  const body = { success: false, message: err.message || "Internal server error" };
  if (err.details) body.details = err.details;
  if (!config.isProd && statusCode >= 500) body.stack = err.stack;

  return res.status(statusCode).json(body);
}

module.exports = { notFound, errorHandler };
