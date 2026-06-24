const { z } = require("zod");

const id = z.object({ id: z.string().min(1) });
const optionalSlug = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, "Slug must be kebab-case").optional();

// ---- Category --------------------------------------------------------------
const category = {
  create: { body: z.object({ name: z.string().min(1).max(80), slug: optionalSlug, image: z.string().max(2048).optional().nullable(), order: z.number().int().optional(), active: z.boolean().optional() }) },
  update: { params: id, body: z.object({ name: z.string().min(1).max(80).optional(), slug: optionalSlug, image: z.string().max(2048).optional().nullable(), order: z.number().int().optional(), active: z.boolean().optional() }) },
  byId: { params: id },
};

// ---- Language --------------------------------------------------------------
const language = {
  create: { body: z.object({ name: z.string().min(1).max(60), native: z.string().max(60).optional(), image: z.string().max(2048).optional().nullable(), gradient: z.string().max(120).optional(), order: z.number().int().optional(), active: z.boolean().optional() }) },
  update: { params: id, body: z.object({ name: z.string().min(1).max(60).optional(), native: z.string().max(60).optional(), image: z.string().max(2048).optional().nullable(), gradient: z.string().max(120).optional(), order: z.number().int().optional(), active: z.boolean().optional() }) },
  byId: { params: id },
};

// ---- Title -----------------------------------------------------------------
const titleType = z.enum(["MOVIE", "SERIES", "DOCUMENTARY"]);
const titleBase = {
  title: z.string().min(1).max(200),
  slug: optionalSlug,
  synopsis: z.string().max(5000).optional(),
  year: z.number().int().min(1900).max(2100),
  rating: z.number().min(0).max(10).optional(),
  duration: z.string().max(40).optional(),
  type: titleType.optional(),
  language: z.string().max(60).optional(),
  country: z.string().max(60).optional(),
  // Accept any URL or path (absolute http(s), CloudFront, S3, or a relative
  // /uploads/... path). Strict URL validation was too restrictive for the admin
  // form. posterUrl is optional here and defaults to "" in the service.
  posterUrl: z.string().max(2048).optional(),
  backdropUrl: z.string().max(2048).optional().nullable(),
  videoUrl: z.string().max(2048).optional().nullable(),
  trailerUrl: z.string().max(2048).optional().nullable(),
  badge: z.string().max(40).optional().nullable(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  categoryIds: z.array(z.string()).optional(),
};
const title = {
  create: { body: z.object(titleBase) },
  update: { params: id, body: z.object(titleBase).partial() },
  byId: { params: id },
};

// ---- Rail ------------------------------------------------------------------
const rail = {
  create: { body: z.object({ name: z.string().min(1).max(120), slug: optionalSlug, showProgress: z.boolean().optional(), order: z.number().int().optional(), active: z.boolean().optional() }) },
  update: { params: id, body: z.object({ name: z.string().min(1).max(120).optional(), slug: optionalSlug, showProgress: z.boolean().optional(), order: z.number().int().optional(), active: z.boolean().optional() }) },
  byId: { params: id },
  addTitle: { params: id, body: z.object({ titleId: z.string().min(1), order: z.number().int().optional() }) },
  removeTitle: { params: z.object({ id: z.string(), titleId: z.string() }) },
  reorder: { params: id, body: z.object({ titleIds: z.array(z.string()) }) },
};

// ---- Season / Episode ------------------------------------------------------
const season = {
  create: { params: z.object({ titleId: z.string() }), body: z.object({ number: z.number().int().min(0), name: z.string().max(120).optional(), order: z.number().int().optional() }) },
  update: { params: id, body: z.object({ number: z.number().int().min(0).optional(), name: z.string().max(120).optional(), order: z.number().int().optional() }) },
  byId: { params: id },
};
const episode = {
  create: {
    params: z.object({ seasonId: z.string() }),
    body: z.object({
      number: z.number().int().min(0),
      title: z.string().min(1).max(200),
      synopsis: z.string().max(5000).optional(),
      thumbnailUrl: z.string().max(2048).optional().nullable(),
      durationSec: z.number().int().optional().nullable(),
      videoUrl: z.string().max(2048).optional().nullable(),
      trailerUrl: z.string().max(2048).optional().nullable(),
      order: z.number().int().optional(),
      active: z.boolean().optional(),
    }),
  },
  update: { params: id, body: z.object({
    number: z.number().int().min(0).optional(),
    title: z.string().min(1).max(200).optional(),
    synopsis: z.string().max(5000).optional(),
    thumbnailUrl: z.string().max(2048).optional().nullable(),
    durationSec: z.number().int().optional().nullable(),
    videoUrl: z.string().max(2048).optional().nullable(),
    trailerUrl: z.string().max(2048).optional().nullable(),
    order: z.number().int().optional(),
    active: z.boolean().optional(),
  }) },
  byId: { params: id },
};

// ---- Collection ------------------------------------------------------------
const collection = {
  create: { body: z.object({ title: z.string().min(1).max(200), slug: optionalSlug, description: z.string().max(2000).optional(), imageUrl: z.string().max(2048).optional().nullable(), gradient: z.string().max(120).optional(), count: z.number().int().optional(), order: z.number().int().optional(), active: z.boolean().optional() }) },
  update: { params: id, body: z.object({ title: z.string().min(1).max(200).optional(), slug: optionalSlug, description: z.string().max(2000).optional(), imageUrl: z.string().max(2048).optional().nullable(), gradient: z.string().max(120).optional(), count: z.number().int().optional(), order: z.number().int().optional(), active: z.boolean().optional() }) },
  byId: { params: id },
};

// ---- Hero ------------------------------------------------------------------
const hero = {
  create: { body: z.object({ title: z.string().min(1).max(200), tagline: z.string().min(1).max(300), badge: z.string().max(40).optional().nullable(), imageUrl: z.string().min(1).max(2048), videoUrl: z.string().max(2048).optional().nullable(), meta: z.array(z.string()).optional(), ctaLabel: z.string().max(40).optional(), ctaUrl: z.string().optional().nullable(), order: z.number().int().optional(), active: z.boolean().optional() }) },
  update: { params: id, body: z.object({ title: z.string().min(1).max(200).optional(), tagline: z.string().min(1).max(300).optional(), badge: z.string().max(40).optional().nullable(), imageUrl: z.string().min(1).max(2048).optional(), videoUrl: z.string().max(2048).optional().nullable(), meta: z.array(z.string()).optional(), ctaLabel: z.string().max(40).optional(), ctaUrl: z.string().optional().nullable(), order: z.number().int().optional(), active: z.boolean().optional() }) },
  byId: { params: id },
};

// ---- Settings --------------------------------------------------------------
const settings = {
  update: { body: z.object({
    siteName: z.string().max(120).optional(),
    tagline: z.string().max(300).optional(),
    logoUrl: z.string().max(2048).optional().nullable(),
    primaryColor: z.string().max(20).optional(),
    contactEmail: z.string().email().optional(),
    footerText: z.string().max(300).optional(),
    socialTwitter: z.string().optional().nullable(),
    socialInstagram: z.string().optional().nullable(),
    socialYoutube: z.string().optional().nullable(),
  }) },
};

module.exports = { category, language, title, rail, season, episode, collection, hero, settings };
