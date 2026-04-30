const mongoose = require('mongoose');
const slugify = require('slugify');

const pageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true },
  content: { type: String, default: '' },
  metaTitle: String,
  metaDescription: String,
  isPublished: { type: Boolean, default: false },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  template: { type: String, enum: ['default', 'full-width', 'sidebar'], default: 'default' },
  featuredImage: String,
  order: { type: Number, default: 0 }
}, { timestamps: true });

pageSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

pageSchema.index({ slug: 1 });
pageSchema.index({ isPublished: 1 });

module.exports = mongoose.model('Page', pageSchema);
