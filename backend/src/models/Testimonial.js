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

testimonialSchema.index({ isApproved: 1, isFeatured: -1 });

module.exports = mongoose.model('Testimonial', testimonialSchema);
