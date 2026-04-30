const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: String,
  imageUrl: String,
  link: String,
  linkText: String,
  position: { type: String, enum: ['hero', 'sidebar', 'popup', 'ticker', 'footer'], default: 'hero' },
  page: { type: String, default: 'home' },
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  startDate: Date,
  endDate: Date,
  backgroundColor: String,
  textColor: String
}, { timestamps: true });

bannerSchema.index({ position: 1, isActive: 1, priority: -1 });
bannerSchema.index({ page: 1, isActive: 1 });

module.exports = mongoose.model('Banner', bannerSchema);
