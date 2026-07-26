const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: String,
  university: String,
  content: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, default: 5 },
  imageUrl: String,
  isApproved: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false }
}, { timestamps: true });

// createdAt appended: getApproved sorts { isFeatured: -1, createdAt: -1 }, and
// without the third key MongoDB still had to sort the matched documents.
// The old { isApproved: 1, isFeatured: -1 } index is a prefix of this one and is
// therefore redundant — scripts/ensureIndexes.js reports it so it can be dropped.
testimonialSchema.index({ isApproved: 1, isFeatured: -1, createdAt: -1 });

module.exports = mongoose.model('Testimonial', testimonialSchema);
