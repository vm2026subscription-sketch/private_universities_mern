/**
 * Course/University filter taxonomy — a CODE-ONLY normalization layer.
 *
 * The `stream` and `category` fields on courses (and `state` on universities)
 * were entered with many different spellings for the same real thing
 * (e.g. "Computer Applications", "Computing", "IT & Software" are one stream;
 * "PhD", "PH.D", "DOCTORAL", "RESEARCH" are one level). The filter buttons were
 * generated from those raw values and matched them exactly, so a single real
 * stream showed up as many buttons — each returning only a slice — and picking a
 * rare one (or a state that no university uses) returned nothing at all.
 *
 * This module folds the raw values into a small canonical set WITHOUT touching
 * the stored data. `canonicalX()` maps any raw value to its display bucket;
 * `xVariants()` expands a chosen bucket back to every raw spelling it should
 * match. Any value not listed here passes through as its own bucket, so nothing
 * regresses — unmapped values simply behave as they do today.
 */

// canonical display name -> every raw DB spelling that belongs to it
const STREAM_GROUPS = {
  Engineering: ['Engineering'],
  Science: ['Science'],
  Management: ['Management'],
  Law: ['Law'],
  Commerce: ['Commerce'],
  Education: ['Education'],
  Agriculture: ['Agriculture', 'Agriculture & Rural Development', 'Agriculture & Allied'],
  'Medical & Health Sciences': [
    'Medical & Health Sciences', 'Medicine', 'Nursing', 'Dental', 'Dentistry',
    'Physiotherapy', 'Public Health', 'Allied Health', 'Allied & Healthcare',
    'Clinical Nutrition & Dietetics', 'Ayurveda', 'Homeopathy', 'Homoeopathy (AYUSH)',
    'Indian Medicine', 'Yoga & Naturopathy', 'Yoga', 'Yoga & Wellness',
    'Yoga & Integrative Medicine',
  ],
  'Computer Applications & IT': [
    'Computer Applications', 'IT & Software', 'Computer Applications & IT',
    'Computer & IT', 'Computing', 'Computer Application', 'IT & Computer Applications',
    'IT & Computer', 'Computer', 'IT', 'Mathematics & Computing',
  ],
  'Arts & Humanities': [
    'Arts & Humanities', 'Humanities', 'Languages', 'Social Work', 'Liberal Studies',
    'Development Studies', 'Economics', 'Psychology', 'Theology', 'Vedic Studies',
    'Indian Spiritual & Cultural Heritage', 'Heritage & Culture',
  ],
  'Design & Architecture': [
    'Design & Architecture', 'Architecture', 'Architecture & Planning',
    'Urban Development', 'Urban Planning', 'Animation',
  ],
  'Media & Communication': [
    'Mass Communication', 'Media & Communication', 'Journalism & Mass Communication',
    'Media & Journalism', 'Media & Film Studies', 'Media', 'Media & Mass Communication',
    'Mass Communication & Media', 'Journalism & Media', 'Film & Media',
    'Communication & Media',
  ],
  'Hospitality & Tourism': [
    'Hospitality & Tourism', 'Hospitality', 'Hospitality & Travel', 'Tourism & Hospitality',
  ],
  'Doctoral & Research': ['Doctoral', 'Research', 'Doctoral Research'],
  'Vocational & Skill': [
    'Vocational', 'Vocational & Skill Development', 'Skill', 'Vocational Studies',
    'Polytechnic', 'Beauty & Wellness',
  ],
  Others: [
    'Others', 'Various', 'Multidisciplinary', 'Interdisciplinary',
    'Interdisciplinary Studies', 'Multiple Streams', 'Professional', 'Sports',
    'Maritime Studies', 'Mining', 'Electronics', 'Health & Fitness',
  ],
};

// canonical level -> every raw DB spelling that belongs to it
const CATEGORY_GROUPS = {
  UG: ['UG', 'B.TECH', 'B.TECH (LATERAL)', 'B.DES', 'FOUNDATION', 'INTEGRATED', 'INTEGRATED (UG + PG)', 'DUAL DEGREE'],
  PG: ['PG', 'M.TECH', 'MBA', 'M.DES', 'EXECUTIVE', 'SUPER SPECIALTY', 'INTEGRATED PG'],
  PhD: ['PhD', 'PH.D', 'DOCTORAL', 'RESEARCH', 'FELLOWSHIP', 'M.PHIL'],
  Diploma: ['Diploma'],
  Certificate: ['Certificate'],
};

// canonical state -> spellings that mean the same place (only ambiguous ones need listing)
const STATE_GROUPS = {
  Delhi: ['Delhi', 'Delhi NCR', 'New Delhi', 'NCT of Delhi'],
};

const buildReverse = (groups) => {
  const reverse = new Map();
  for (const [canonical, variants] of Object.entries(groups)) {
    for (const variant of variants) {
      reverse.set(variant.toLowerCase().trim(), canonical);
    }
  }
  return reverse;
};

const STREAM_REVERSE = buildReverse(STREAM_GROUPS);
const CATEGORY_REVERSE = buildReverse(CATEGORY_GROUPS);
const STATE_REVERSE = buildReverse(STATE_GROUPS);

const makeCanonical = (reverse) => (raw) => {
  if (raw === null || raw === undefined || raw === '') return raw;
  return reverse.get(String(raw).toLowerCase().trim()) || raw;
};

const makeVariants = (groups, canonicalFn) => (raw) => {
  if (raw === null || raw === undefined || raw === '') return [];
  const canonical = canonicalFn(raw);
  return groups[canonical] || [raw];
};

const canonicalStream = makeCanonical(STREAM_REVERSE);
const canonicalCategory = makeCanonical(CATEGORY_REVERSE);
const canonicalState = makeCanonical(STATE_REVERSE);

// ── Course-name canonicalisation ──────────────────────────────────────────────
// The same programme is entered with many spellings across colleges — "Ph.D" /
// "Ph.D." / "PhD", "BPT" / "B.P.T", "BA LLB" / "B.A. LL.B." / "BA + LLB". Reduce
// any label to its alphanumerics (uppercased) so all those collapse to one key.
const canonicalCourseKey = (value) =>
  String(value == null ? '' : value).replace(/[^a-z0-9]/gi, '').toUpperCase();

// The query-side twin of canonicalCourseKey: a RegExp that matches any stored
// label whose alphanumerics are exactly those of `value`, with any punctuation or
// spacing between (and trailing) them. Anchored at the first character so the
// courses index can still be used. Matches "Ph.D" / "Ph.D." / "PhD" for "PhD",
// and "BA LLB" / "BA + LLB" for "BA LLB".
const courseMatchRegex = (value) => {
  const cleaned = String(value == null ? '' : value).replace(/[^a-z0-9]/gi, '');
  const SEP = '[^a-zA-Z0-9]*';
  const body = cleaned.split('').join(SEP);
  return new RegExp(`^${body}${SEP}$`, 'i');
};

const streamVariants = makeVariants(STREAM_GROUPS, canonicalStream);
const categoryVariants = makeVariants(CATEGORY_GROUPS, canonicalCategory);
const stateVariants = makeVariants(STATE_GROUPS, canonicalState);

module.exports = {
  STREAM_GROUPS,
  CATEGORY_GROUPS,
  STATE_GROUPS,
  canonicalStream,
  canonicalCategory,
  canonicalState,
  streamVariants,
  categoryVariants,
  stateVariants,
  canonicalCourseKey,
  courseMatchRegex,
};
