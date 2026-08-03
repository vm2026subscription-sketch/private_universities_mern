/**
 * What a university may change about itself, and what an admin must confirm.
 *
 * The split is a product decision before it is a security one. This platform's
 * value to a student is that its numbers can be trusted; a university allowed to
 * publish its own placement percentage will publish the flattering one, and the
 * site becomes a brochure directory. So the fields that carry credibility —
 * packages, placement rate, NAAC grade, NIRF rank, regulatory approvals — are
 * held for review, while the fields that are simply the university describing
 * itself go live immediately.
 *
 * Gating everything would be worse than gating nothing: a tenant who must wait
 * two days to fix a phone number stops using the portal, and the admin queue
 * fills with noise that hides the submissions that actually needed a human.
 *
 * Anything absent from both lists is rejected outright. An allowlist fails
 * closed: a field added to the schema later is unwritable by tenants until
 * someone deliberately classifies it, rather than silently becoming editable.
 */

/** Live immediately — the university describing itself. */
const SELF_SERVE_FIELDS = [
  // Narrative
  'description',
  'vision',
  'mission',
  'history',
  'highlights',

  // Identity assets
  'logoUrl',
  'bannerImageUrl',

  // Contact
  'address',
  'phone',
  'email',
  'website',
  'latitude',
  'longitude',

  // Campus life
  'campus.overview',
  'campus.hostelDetails',
  'campus.libraryDetails',
  'campus.labDetails',
  'campus.sportsDetails',
  'campus.transportDetails',
  'campus.medicalSupport',
  'campus.wifiAvailable',
  'campus.virtualTourLink',
  'campus.galleryImages',

  'facilities',
  'faculty',
  'scholarships',

  // Admissions process (the fee itself is held for review — see below)
  'admissions.overview',
  'admissions.process',
  'admissions.applicationStartDate',
  'admissions.applicationEndDate',
  'admissions.counsellingInfo',
  'admissions.acceptedExams',
  'admissions.documentsRequired',
  'admissions.contactEmail',
  'admissions.contactPhone',

  // Outbound links
  'links.admissionLink',
  'links.brochureLink',
  'links.placementReportLink',
  'links.scholarshipLink',
  'links.hostelLink',
  'links.mapLink',
];

/**
 * Held until an admin approves.
 *
 * Every entry here is a claim a prospective student would act on and cannot
 * independently verify.
 */
const REVIEW_REQUIRED_FIELDS = [
  // Placement claims — the most-inflated numbers in Indian higher education.
  'stats.avgPackageLPA',
  'stats.avgPackageLPALabel',
  'stats.highestPackageLPA',
  'stats.highestPackageLPALabel',
  'stats.placementPercentage',
  'stats.placementPercentageLabel',
  'topRecruiters',

  // Accreditation and regulatory standing.
  'naacGrade',
  'nirfRank',
  'approvals',

  // Scale and cost.
  'stats.totalStudents',
  'stats.totalStudentsLabel',
  'stats.campusSizeAcres',
  'stats.campusSizeLabel',
  'stats.avgFees',
  'admissions.applicationFee',

  // Institutional facts that change the listing's meaning.
  'name',
  'establishedYear',
];

/**
 * Never writable by a tenant, at any tier, with or without review.
 *
 * Two groups: commercial placement the platform sells (sponsorship), and
 * derived or platform-owned values (`slug` breaks every inbound link,
 * `stats.rating` belongs to students, `courses` is managed through the Course
 * collection with its own endpoints).
 */
const TENANT_FORBIDDEN_FIELDS = [
  'isSponsored',
  'sponsorTier',
  'sponsorPriority',
  'sponsorExpiry',
  'slug',
  'universityCode',
  'views',
  'status',
  'stats.rating',
  'stats.totalCoursesCount',
  'courses',
  'type',
  'segment',
  'institutionKind',
  'state',
  'city',
  'seo',
  'pendingChanges',
];

const SELF_SERVE = new Set(SELF_SERVE_FIELDS);
const REVIEW_REQUIRED = new Set(REVIEW_REQUIRED_FIELDS);

/**
 * Flattens a nested payload into dot-paths, treating arrays as leaf values.
 *
 * Arrays must not be flattened into indexed paths: `facilities.0` as a $set
 * would edit one slot in place and leave the rest of the old array behind,
 * which is never what "save my facilities list" means. Replacing the whole
 * array is the only coherent interpretation.
 */
const flattenPaths = (input, prefix = '', out = {}) => {
  Object.entries(input || {}).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    const isPlainObject =
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date);

    if (isPlainObject) {
      flattenPaths(value, path, out);
    } else {
      out[path] = value;
    }
  });

  return out;
};

/**
 * Sorts a submitted payload into what applies now, what waits for review, and
 * what is refused.
 *
 * Refusals are reported rather than silently dropped so the UI can tell the user
 * why a field did not save — a save that quietly discards half its input is
 * indistinguishable from a bug.
 */
const classifyUpdate = (payload) => {
  const flat = flattenPaths(payload);

  const selfServe = {};
  const review = {};
  const rejected = [];

  Object.entries(flat).forEach(([path, value]) => {
    if (SELF_SERVE.has(path)) {
      selfServe[path] = value;
      return;
    }
    if (REVIEW_REQUIRED.has(path)) {
      review[path] = value;
      return;
    }

    // A parent path counts: sending `campus: {...}` flattens to child paths, but
    // sending `approvals: {...}` flattens to `approvals.ugc` etc., and the
    // policy lists the parent. Check ancestors before refusing.
    const parent = Object.keys(flat).length && path.includes('.')
      ? path.split('.').slice(0, -1).join('.')
      : null;

    if (parent && SELF_SERVE.has(parent)) {
      selfServe[path] = value;
      return;
    }
    if (parent && REVIEW_REQUIRED.has(parent)) {
      review[path] = value;
      return;
    }

    rejected.push(path);
  });

  return { selfServe, review, rejected };
};

const isEditable = (path) => SELF_SERVE.has(path) || REVIEW_REQUIRED.has(path);

module.exports = {
  SELF_SERVE_FIELDS,
  REVIEW_REQUIRED_FIELDS,
  TENANT_FORBIDDEN_FIELDS,
  flattenPaths,
  classifyUpdate,
  isEditable,
};
