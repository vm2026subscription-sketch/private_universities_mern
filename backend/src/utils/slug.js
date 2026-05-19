const slugify = require('slugify');

const normalizeSlug = (value, fallback = 'item') => {
  const base = slugify(String(value || fallback), { lower: true, strict: true });
  return base || `${fallback}-${Date.now()}`;
};

const buildUniqueSlug = async ({ model, value, currentId, fallback = 'item' }) => {
  const baseSlug = normalizeSlug(value, fallback);
  let slug = baseSlug;
  let counter = 1;

  while (
    await model.exists({
      slug,
      ...(currentId ? { _id: { $ne: currentId } } : {}),
    })
  ) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
};

module.exports = {
  normalizeSlug,
  buildUniqueSlug,
};
