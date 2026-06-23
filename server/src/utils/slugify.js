// Turn "The Last Voyage!" → "the-last-voyage". Used to derive slugs for titles,
// categories, rails and collections when the admin doesn't supply one.
function slugify(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Ensure uniqueness against an async existence check, appending -2, -3, ...
async function uniqueSlug(base, exists) {
  let slug = slugify(base) || "item";
  let n = 1;
  while (await exists(slug)) {
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
  return slug;
}

module.exports = { slugify, uniqueSlug };
