const mongoose = require('mongoose');
const { normalizeSlug } = require('../utils/slug');

const courseSchema = new mongoose.Schema({
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
  name: { type: String, required: true },
  slug: { type: String, unique: true, sparse: true },
  category: { type: String, required: true },
  stream: { type: String, default: 'Others' },
  baseCourse: { type: String },
  specializationName: { type: String },
  duration: String,
  specializations: [{
    name: String,
    seats: Number,
    feesPerYear: Number
  }],
  totalSeats: Number,
  totalSeatsLabel: String,
  feesPerYear: Number,
  feesPerYearLabel: String,
  entranceExams: [String],
  eligibility: String
}, { timestamps: true });

courseSchema.pre('validate', function(next) {
  if (!this.slug && this.name) {
    this.slug = normalizeSlug(this.name, 'course');
  }
  next();
});

courseSchema.index({ universityId: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ stream: 1 });
courseSchema.index({ baseCourse: 1 });
courseSchema.index({ specializationName: 1 });
courseSchema.index({ name: 1 });



/**
 * Added indexes:
 *  - { universityId, baseCourse, specializationName }: the exact lookup
 *    persistCourse() runs for EVERY row of an Excel import. The single-field
 *    universityId index left it scanning all courses of that university per row.
 *  - { universityId, name }: adminController.bulkImportCourses' dedup lookup.
 *  - { feesPerYear } and { category, feesPerYear }: the fee-range distinct() in
 *    the university filter, and the fee-sorting aggregation's $lookup.
 *  - { updatedAt }: the admin content listing's sort.
 */
courseSchema.index({ universityId: 1, baseCourse: 1, specializationName: 1 });
courseSchema.index({ universityId: 1, name: 1 });
courseSchema.index({ feesPerYear: 1 });
courseSchema.index({ category: 1, feesPerYear: 1 });
courseSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Course', courseSchema);
