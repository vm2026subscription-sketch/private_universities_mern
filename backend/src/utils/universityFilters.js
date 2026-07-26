/**
 * The "is this university publicly visible?" predicate, in one place.
 *
 * Four separate copies of this filter had grown up independently —
 * universityController (PUBLISHED_UNIVERSITY_FILTER), courseController
 * (PUBLISHED_UNIVERSITY_MATCH, prefixed for a $lookup), sitemapController
 * (PUBLIC_UNIVERSITY_FILTER) and getGroupedCourses (inline). sitemapController's
 * own comment noted that it "mirrors PUBLISHED_UNIVERSITY_FILTER in
 * universityController so the sitemap never advertises a URL that the detail
 * endpoint would 404" — a correctness requirement that copy-paste cannot enforce.
 * They now derive from these builders instead.
 *
 * `status` is absent on records created before the draft/published workflow
 * existed, so a missing status must count as published.
 */

/**
 * @param {string} [prefix] - document path prefix, e.g. 'universityId' or
 *   'university' when the university has been joined in via $lookup. Empty for
 *   queries against the universities collection itself.
 */
const publishedUniversityFilter = (prefix = '') => {
  const field = (name) => (prefix ? `${prefix}.${name}` : name);
  return {
    $or: [
      { [field('status')]: 'published' },
      { [field('status')]: { $exists: false } },
    ],
  };
};

/**
 * Published AND crawlable. Only for the sitemap: `seo.indexStatus: 'noindex'`
 * lets an admin pull a page out of search results without unpublishing it, so
 * the page must stay reachable while disappearing from the sitemap.
 */
const indexableUniversityFilter = (prefix = '') => {
  const field = (name) => (prefix ? `${prefix}.${name}` : name);
  return {
    $and: [
      publishedUniversityFilter(prefix),
      { [field('seo.indexStatus')]: { $ne: 'noindex' } },
    ],
  };
};

/**
 * Segment predicate for the "normal" (Indian private/deemed) catalogue, which
 * excludes foreign and twinning institutions. Also repeated in four places.
 */
const normalSegmentFilter = (prefix = '') => {
  const field = (name) => (prefix ? `${prefix}.${name}` : name);
  return {
    $or: [
      { [field('segment')]: 'normal' },
      { [field('segment')]: { $exists: false }, [field('type')]: { $nin: ['foreign', 'twinning'] } },
    ],
  };
};

/** Segment predicate for a specific segment ('foreign' | 'twinning'). */
const segmentFilter = (segment, prefix = '') => {
  if (segment !== 'foreign' && segment !== 'twinning') return normalSegmentFilter(prefix);
  const field = (name) => (prefix ? `${prefix}.${name}` : name);
  return {
    $or: [
      { [field('segment')]: segment },
      { [field('segment')]: { $exists: false }, [field('type')]: segment },
    ],
  };
};

module.exports = {
  publishedUniversityFilter,
  indexableUniversityFilter,
  normalSegmentFilter,
  segmentFilter,
};
