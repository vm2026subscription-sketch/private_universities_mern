const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  duration: Number,
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

module.exports = mongoose.model('Course', courseSchema);
