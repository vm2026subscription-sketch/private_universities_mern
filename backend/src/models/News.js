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

module.exports = mongoose.model('News', newsSchema);
