const { z } = require("zod");

module.exports = {
  event: {
    body: z.object({
      titleId: z.string().optional().nullable(),
      episodeId: z.string().optional().nullable(),
      type: z.enum(["START", "PROGRESS", "COMPLETE"]),
      kind: z.enum(["movie", "trailer", "episode"]).optional(),
      sessionId: z.string().min(1).max(120),
      seconds: z.number().int().nonnegative().optional(),
      position: z.number().int().nonnegative().optional(),
    }),
  },
};
