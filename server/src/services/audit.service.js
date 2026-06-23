// Best-effort admin audit logging. Never throws — a logging failure must not
// break the actual operation. Powers admin "Recent Activity" / "User Activity Logs".
const prisma = require("../config/prisma");
const { logger } = require("../utils/logger");

async function record(auth, action, entity = "", entityId = "", meta = undefined) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: auth?.kind === "admin" ? auth.id : null,
        action,
        entity,
        entityId,
        meta,
      },
    });
  } catch (err) {
    logger.warn(`audit log failed for ${action}: ${err.message}`);
  }
}

module.exports = { record };
