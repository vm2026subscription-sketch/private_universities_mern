const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  isSubscribed: { type: Boolean, default: true },
  subscribedAt: { type: Date, default: Date.now },
  unsubscribedAt: Date,
  source: { type: String, enum: ['website', 'signup', 'admin', 'import'], default: 'website' }
}, { timestamps: true });

newsletterSchema.index({ isSubscribed: 1 });

module.exports = mongoose.model('Newsletter', newsletterSchema);
