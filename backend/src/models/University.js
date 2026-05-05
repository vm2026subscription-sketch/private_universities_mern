const mongoose = require('mongoose');
const slugify = require('slugify');

const universitySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  universityCode: { type: String, unique: true, sparse: true, trim: true, uppercase: true },
  slug: { type: String, unique: true },
  state: { type: String, required: true },
  city: { type: String, required: true },
  type: { type: String, enum: ['private', 'deemed', 'foreign'], required: true },
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
    campusSizeAcres: Number,
    avgPackageLPA: Number,
    highestPackageLPA: Number,
    placementPercentage: Number,
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
  email: String
}, { timestamps: true });

universitySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

universitySchema.index({ name: 'text', state: 'text', city: 'text' });
universitySchema.index({ state: 1, type: 1, naacGrade: 1 });

module.exports = mongoose.model('University', universitySchema);
