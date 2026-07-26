const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: { type: String, default: 'general' },
  order: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true }
}, { timestamps: true });

faqSchema.index({ category: 1, order: 1 });
faqSchema.index({ isPublished: 1 });


// The public FAQ endpoint filters isPublished and sorts by order — the existing
// single-field isPublished index left the sort unindexed.
faqSchema.index({ isPublished: 1, order: 1 });

module.exports = mongoose.model('FAQ', faqSchema);
