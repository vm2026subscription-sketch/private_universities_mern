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
  category: { type: String, enum: ['engineering', 'medical', 'management', 'law', 'others'], default: 'others' }
}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);
