const mongoose = require('mongoose');

const otpLogSchema = new mongoose.Schema({
  identifier: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ['sms', 'whatsapp', 'email'], required: true },
  status: { type: String, enum: ['sent', 'verified', 'expired', 'failed'], default: 'sent' },
  provider: { type: String, enum: ['twilio', 'twilio_verify', 'msg91', 'nodemailer'], default: 'twilio' },
  purpose: { type: String, enum: ['login', 'register', 'verify', 'reset'], default: 'verify' },
  ipAddress: String,
  userAgent: String,
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  verifiedAt: Date,

  /**
   * Per-code guess counter. Previously absent: a 6-digit code (10^6 space) with
   * a 10-minute lifetime could be attacked by distributed guessing because only
   * OTP *sending* was rate limited, never verification. The code is burned once
   * this reaches MAX_VERIFY_ATTEMPTS.
   */
  attempts: { type: Number, default: 0 }
}, { timestamps: true });

otpLogSchema.index({ identifier: 1, createdAt: -1 });
otpLogSchema.index({ identifier: 1, status: 1 });

module.exports = mongoose.model('OtpLog', otpLogSchema);
