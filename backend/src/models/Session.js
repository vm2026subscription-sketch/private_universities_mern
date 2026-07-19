const mongoose = require('mongoose');

/**
 * Server-side record of an issued refresh token.
 *
 * This model previously existed but was never imported anywhere — it implied a
 * revocation capability the system did not actually have. It is now the backing
 * store for refresh-token rotation and reuse detection.
 *
 * Only the SHA-256 hash of the token's `jti` is stored, so a database leak does
 * not hand an attacker usable refresh tokens.
 */
const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // SHA-256 of the refresh token jti. Never the raw token.
  tokenHash: { type: String, required: true, index: true },

  // Groups every token descended from one login, so detecting replay of a
  // rotated token lets us revoke the whole lineage rather than one entry.
  familyId: { type: String, required: true, index: true },

  // Set when this token is exchanged. A second exchange attempt on an already
  // rotated token means the token leaked -> revoke the entire family.
  rotatedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
  revokedReason: { type: String, default: null },

  device: String,
  ip: String,
  userAgent: String,
  isActive: { type: Boolean, default: true },
  lastActivity: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }
}, { timestamps: true });

sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ familyId: 1, isActive: 1 });

module.exports = mongoose.model('Session', sessionSchema);
