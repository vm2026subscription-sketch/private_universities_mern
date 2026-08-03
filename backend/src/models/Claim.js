const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  contactPerson: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  requestedTier: { type: String, default: 'Gold Partner' },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  accreditation: String,
  website: String,
  documentsUrl: { type: String, default: '#' },
  rejectionReason: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University' }
}, { timestamps: true });

module.exports = mongoose.model('Claim', claimSchema);
