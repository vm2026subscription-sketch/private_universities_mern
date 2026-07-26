const mongoose = require('mongoose');
const slugify = require('slugify');
const { normalizeUniversityClassification } = require('../utils/universityClassification');

const universitySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  universityCode: { type: String, unique: true, sparse: true, trim: true, uppercase: true },
  slug: { type: String, unique: true },
  status: { type: String, enum: ['draft', 'published', 'needs_review'], default: 'published' },
  state: {
    type: String,
    required() {
      return this.status !== 'draft';
    },
  },
  city: {
    type: String,
    required() {
      return this.status !== 'draft';
    },
  },
  segment: { type: String, enum: ['normal', 'foreign', 'twinning'], default: 'normal' },
  institutionKind: { type: String, enum: ['private', 'deemed'] },
  type: { type: String, enum: ['private', 'deemed', 'foreign', 'twinning'], required: true },
  establishedYear: Number,
  naacGrade: String,
  nirfRank: Number,
  description: String,
  logoUrl: String,
  website: String,
  latitude: Number,
  longitude: Number,
  views: { type: Number, default: 0 },
  bannerImageUrl: String,
  approvals: {
    ugc: { type: Boolean, default: false },
    aicte: { type: Boolean, default: false },
    nmc: { type: Boolean, default: false },
    bci: { type: Boolean, default: false },
    coa: { type: Boolean, default: false },
    pci: { type: Boolean, default: false }
  },
  stats: {
    totalStudents: Number,
    totalStudentsLabel: String,
    campusSizeAcres: Number,
    campusSizeLabel: String,
    avgPackageLPA: Number,
    avgPackageLPALabel: String,
    highestPackageLPA: Number,
    highestPackageLPALabel: String,
    placementPercentage: Number,
    placementPercentageLabel: String,
    totalCoursesCount: Number,
    avgFees: String,
    rating: { type: Number, default: 0 }
  },
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  highlights: [String],
  topRecruiters: [String],
  facilities: [String],
  links: {
    admissionLink: String,
    brochureLink: String,
    placementReportLink: String,
    scholarshipLink: String,
    hostelLink: String,
    mapLink: String
  },
  admissions: {
    overview: String,
    process: [String],
    applicationStartDate: Date,
    applicationEndDate: Date,
    counsellingInfo: String,
    acceptedExams: [String],
    documentsRequired: [String],
    applicationFee: Number,
    contactEmail: String,
    contactPhone: String
  },
  campus: {
    overview: String,
    hostelDetails: String,
    libraryDetails: String,
    labDetails: String,
    sportsDetails: String,
    transportDetails: String,
    medicalSupport: String,
    wifiAvailable: { type: Boolean, default: false },
    virtualTourLink: String,
    galleryImages: [String]
  },
  scholarships: [{
    name: String,
    eligibility: String,
    amount: String,
    deadline: Date,
    link: String,
    description: String
  }],
  newsLinks: [{
    title: String,
    url: String
  }],
  address: String,
  phone: String,
  email: String,
  isSponsored: { type: Boolean, default: false },
  sponsorTier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum', 'none'], default: 'none' },
  sponsorPriority: { type: Number, default: 0 },
  sponsorExpiry: Date,
  // SEO overrides. All optional — when a field is blank the site generates a
  // sensible default (see utils/seo.js). indexStatus lets admins pull a page
  // out of Google without unpublishing it.
  seo: {
    seoTitle: String,
    metaDescription: String,
    canonicalUrl: String,
    ogTitle: String,
    ogDescription: String,
    ogImage: String,
    indexStatus: { type: String, enum: ['index', 'noindex'], default: 'index' }
  }
}, { timestamps: true });

universitySchema.pre('validate', function(next) {
  const classification = normalizeUniversityClassification(this);
  this.segment = classification.segment;
  this.institutionKind = classification.institutionKind;
  this.type = classification.type;

  next();
});

/**
 * Whether the pre-save hook should derive the slug from the name.
 *
 * Auto-generate when the name changed — but NEVER overwrite a slug the caller set
 * deliberately in the same operation.
 *
 * Without the isModified('slug') guard this hook clobbered the collision-free slug
 * that utils/slug.buildUniqueSlug had just computed, so creating a second
 * university whose name slugifies identically (the same institution name in a
 * different state — precisely what the name+state import matching now does)
 * failed on the unique index with E11000. routes/uploadExcel documents having to
 * use insertMany specifically to dodge this hook.
 *
 * Exposed as a static so the decision can be unit tested without a database.
 */
const shouldRegenerateSlug = (doc) => doc.isModified('name') && !doc.isModified('slug');

universitySchema.statics.shouldRegenerateSlug = shouldRegenerateSlug;

universitySchema.pre('save', function(next) {
  if (shouldRegenerateSlug(this)) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

universitySchema.index({ name: 'text', state: 'text', city: 'text' });
universitySchema.index({ state: 1, type: 1, naacGrade: 1 });
universitySchema.index({ segment: 1, institutionKind: 1 });
universitySchema.index({ status: 1, segment: 1, institutionKind: 1 });
universitySchema.index({ type: 1, nirfRank: 1 });
universitySchema.index({ state: 1, nirfRank: 1 });
universitySchema.index({ isSponsored: -1, sponsorPriority: -1 });
universitySchema.index({ state: 1, 'stats.avgPackageLPA': -1 });


/**
 * Added indexes, each backing a query that previously did a collection scan:
 *  - { name, state }: the import matcher's key (utils/universityMatching) and
 *    adminController's bulk-import lookup. The existing `name` TEXT index cannot
 *    serve an equality match, so every imported row scanned all universities —
 *    O(rows x universities) on a 400-university, 2000-row import.
 *  - { status, isSponsored, sponsorPriority, nirfRank }: the default university
 *    listing (published + sponsored-first + by rank). Previously the match used
 *    an index but the sort did not, forcing an in-memory sort of the result set.
 *  - { views }: getTrends and the SaaS "top viewed" report both sort on it.
 *  - { updatedAt }: every admin getContentData listing sorts newest-updated first.
 *  - { admissions.acceptedExams }: the ?entranceExam filter.
 *  - { status, seo.indexStatus }: the sitemap's filter.
 */
universitySchema.index({ name: 1, state: 1 });
universitySchema.index({ status: 1, isSponsored: -1, sponsorPriority: -1, nirfRank: 1 });
universitySchema.index({ views: -1 });
universitySchema.index({ updatedAt: -1 });
universitySchema.index({ 'admissions.acceptedExams': 1 });
universitySchema.index({ status: 1, 'seo.indexStatus': 1 });

module.exports = mongoose.model('University', universitySchema);
