const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
  name: { type: String, required: true },
  slug: { type: String, unique: true },
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
  feesPerYear: Number,
  entranceExams: [String],
  eligibility: String
}, { timestamps: true });

courseSchema.index({ universityId: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ stream: 1 });
courseSchema.index({ baseCourse: 1 });
courseSchema.index({ specializationName: 1 });
courseSchema.index({ name: 1 });
courseSchema.index({ slug: 1 });

module.exports = mongoose.model('Course', courseSchema);
