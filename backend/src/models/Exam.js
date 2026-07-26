const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  name: { type: String, required: true },
  shortName: String,
  conductingBody: String,
  examDate: Date,
  registrationDeadline: Date,
  eligibility: String,
  pattern: String,
  officialUrl: String,
  logoUrl: String,
  participatingUniversities: Number,
  category: { type: String, enum: ['engineering', 'medical', 'management', 'law', 'others'], default: 'others' },
  scope: { type: String, enum: ['national', 'state', 'university'], default: 'national' },
  state: { type: String },
  highlights: [String],
  courses: [String],
}, { timestamps: true });


// The Exam collection had NO indexes. getExams sorts by examDate and filters on
// category/scope/state; getUpcoming filters examDate >= now and sorts by it.
examSchema.index({ examDate: 1 });
examSchema.index({ category: 1, examDate: 1 });
examSchema.index({ scope: 1, state: 1, examDate: 1 });
examSchema.index({ registrationDeadline: 1 });
examSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Exam', examSchema);
