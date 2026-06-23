const { z } = require("zod");

const id = { params: z.object({ id: z.string().min(1) }) };

module.exports = {
  id,
  createUser: { body: z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(1).max(80), role: z.enum(["ADMIN", "EDITOR"]).optional() }) },
  updateUser: { params: z.object({ id: z.string().min(1) }), body: z.object({ name: z.string().min(1).max(80).optional(), role: z.enum(["ADMIN", "EDITOR"]).optional(), password: z.string().min(8).optional(), active: z.boolean().optional() }) },
};
