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
  sponsorTier: { type: String, enum: ['bronze', 'silver', 'gold', 'none'], default: 'none' },
  sponsorPriority: { type: Number, default: 0 },
  sponsorExpiry: Date
}, { timestamps: true });

universitySchema.pre('validate', function(next) {
  const classification = normalizeUniversityClassification(this);
  this.segment = classification.segment;
  this.institutionKind = classification.institutionKind;
  this.type = classification.type;

  next();
});

universitySchema.pre('save', function(next) {
  if (this.isModified('name')) {
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

module.exports = mongoose.model('University', universitySchema);
