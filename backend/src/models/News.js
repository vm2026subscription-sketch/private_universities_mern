const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  summary: String,
  content: String,
  category: { type: String, default: 'general' },
  source: String,
  publishedAt: { type: Date, default: Date.now },
  imageUrl: String,
  isFeatured: { type: Boolean, default: false },
  tags: [String]
}, { timestamps: true });


// The News collection had NO indexes: the public news feed (sort publishedAt
// desc, optionally filtered by category) and the featured strip both scanned it.
newsSchema.index({ publishedAt: -1 });
newsSchema.index({ category: 1, publishedAt: -1 });
newsSchema.index({ isFeatured: 1, publishedAt: -1 });
newsSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('News', newsSchema);
