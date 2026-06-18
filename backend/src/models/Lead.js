const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  preferredCourse: { type: String, trim: true },
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
  leadType: { type: String, enum: ['apply', 'brochure'], required: true },
  notes: { type: String, trim: true }
}, { timestamps: true });

leadSchema.index({ universityId: 1, createdAt: -1 });
leadSchema.index({ email: 1, phone: 1 });

module.exports = mongoose.model('Lead', leadSchema);
