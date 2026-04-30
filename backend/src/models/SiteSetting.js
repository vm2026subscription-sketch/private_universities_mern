const mongoose = require('mongoose');

const siteSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  category: {
    type: String,
    enum: ['general', 'seo', 'contact', 'social', 'appearance', 'auth', 'email', 'integration'],
    default: 'general'
  },
  label: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['text', 'number', 'boolean', 'json', 'image', 'color', 'textarea'], default: 'text' }
}, { timestamps: true });

siteSettingSchema.index({ category: 1 });

module.exports = mongoose.model('SiteSetting', siteSettingSchema);
