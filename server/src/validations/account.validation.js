const { z } = require("zod");

module.exports = {
  updateProfile: { body: z.object({ name: z.string().min(1).max(80) }) },
  changePassword: { body: z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) }) },
  favourite: { body: z.object({ titleId: z.string().min(1) }) },
  byTitleId: { params: z.object({ titleId: z.string().min(1) }) },
  byId: { params: z.object({ id: z.string().min(1) }) },
  progress: {
    body: z.object({
      titleId: z.string().min(1),
      episodeId: z.string().optional().nullable(),
      kind: z.enum(["MOVIE", "TRAILER", "EPISODE"]).optional(),
      positionSec: z.number().nonnegative(),
      durationSec: z.number().nonnegative(),
      completed: z.boolean().optional(),
    }),
  },
  device: { body: z.object({ name: z.string().max(80).optional(), type: z.string().max(20).optional() }) },
};
