const mongoose = require('mongoose');

const otpLogSchema = new mongoose.Schema({
  identifier: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ['sms', 'whatsapp', 'email'], required: true },
  status: { type: String, enum: ['sent', 'verified', 'expired', 'failed'], default: 'sent' },
  provider: { type: String, enum: ['twilio', 'msg91', 'nodemailer'], default: 'twilio' },
  purpose: { type: String, enum: ['login', 'register', 'verify', 'reset'], default: 'verify' },
  ipAddress: String,
  userAgent: String,
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  verifiedAt: Date
}, { timestamps: true });

otpLogSchema.index({ identifier: 1, createdAt: -1 });
otpLogSchema.index({ identifier: 1, status: 1 });

module.exports = mongoose.model('OtpLog', otpLogSchema);
