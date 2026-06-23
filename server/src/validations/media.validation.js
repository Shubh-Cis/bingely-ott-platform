const { z } = require("zod");

const createUpload = {
  body: z.object({
    filename: z.string().min(1).max(255),
    kind: z.enum(["VIDEO", "IMAGE"]),
    mimeType: z.string().max(120).optional(),
    size: z.number().int().nonnegative().optional(),
    alt: z.string().max(255).optional(),
  }),
};

const byId = { params: z.object({ id: z.string().min(1) }) };
const byVideoId = { params: z.object({ videoId: z.string().min(1) }) };

module.exports = { createUpload, byId, byVideoId };
