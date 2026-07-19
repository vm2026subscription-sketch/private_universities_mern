const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { getAuthConfig } = require('../config/env');

const ROLES = ['user', 'admin', 'superadmin'];

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, select: false },
  googleId: String,
  avatar: String,
  // Role is assigned only by an existing superadmin (or the guarded
  // scripts/grantRole.js bootstrap CLI). It is never derived from the email
  // address — see the removal of ensureAdminRole in authController.
  role: { type: String, enum: ROLES, default: 'user' },

  // Multi-provider auth
  phone: { type: String, unique: true, sparse: true },
  countryCode: { type: String, default: '+91' },
  isPhoneVerified: { type: Boolean, default: false },
  phoneOtp: { type: String, select: false },
  phoneOtpExpiry: { type: Date, select: false },
  authProvider: { type: String, enum: ['local', 'google', 'phone'], default: 'local' },

  // Account status & tracking
  status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
  lastLogin: Date,
  loginCount: { type: Number, default: 0 },

  /**
   * Incremented on password change, password reset, role change, status change
   * and forced logout. Access tokens embed the value they were minted with, so
   * bumping this invalidates every outstanding token for the user immediately.
   * Without it, the previous 30-day tokens were completely unrevocable.
   */
  tokenVersion: { type: Number, default: 0 },
  passwordChangedAt: Date,

  // Online-guessing protection (OWASP ASVS 2.2.1). Absent from the original
  // implementation, which allowed unlimited password attempts per account.
  failedLoginAttempts: { type: Number, default: 0, select: false },
  lockUntil: { type: Date, select: false },

  // Expanded profile
  profile: {
    age: Number,
    gender: String,
    city: String,
    state: String,
    stream: String,
    currentClass: String,
    targetExam: String,
    preferredCourse: String,
    preferredStates: [String],
    budgetMin: Number,
    budgetMax: Number,
    targetYear: Number,
    collegeType: { type: String, enum: ['private', 'deemed', 'both'], default: 'both' },
    dateOfBirth: Date,
    bio: String,
    education: [{
      institution: String,
      degree: String,
      year: Number
    }],
    interests: [String],
    profileImage: String
  },
  profileCompleteness: { type: Number, default: 0 },

  savedUniversities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'University' }],
  savedCourses:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  applications: [{
    universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University' },
    status: { type: String, enum: ['applied', 'pending', 'accepted', 'rejected'], default: 'pending' },
    appliedDate: { type: Date, default: Date.now },
    notes: String
  }],
  notifications: [{
    title: String,
    message: String,
    type: { type: String, enum: ['deadline', 'update', 'system'], default: 'system' },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  // keyed by universityId string → rating 1-5
  ratings: { type: Map, of: Number, default: {} },
  // keyed by universityId string → note text
  notes:   { type: Map, of: String, default: {} },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationCode: { type: String, select: false },
  emailVerificationExpiry: { type: Date, select: false },
  // Per-account guess budget for the 6-digit email code. Without it the only
  // throttle was per-IP, so distributed guessing over a 10^6 space could verify
  // an address the attacker does not control and obtain a full session.
  emailVerificationAttempts: { type: Number, default: 0, select: false },
  resetPasswordToken: String,
  resetPasswordExpiry: Date
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();

  // Cost factor is configurable (default 12) so it can be raised as hardware
  // improves without a code change. bcryptjs is retained rather than switching
  // to argon2 because existing hashes cannot be migrated without the plaintext;
  // see comparePassword below for the transparent upgrade path.
  const { bcryptRounds } = getAuthConfig();
  this.password = await bcrypt.hash(this.password, bcryptRounds);

  // Not set on initial creation — only on a genuine change — so that
  // passwordChangedAt reliably means "credential rotated".
  if (!this.isNew) this.passwordChangedAt = new Date();

  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * True when the stored hash was produced with a weaker cost factor than the
 * one currently configured. Callers rehash on successful login, so raising
 * BCRYPT_ROUNDS silently upgrades every account as users sign in.
 */
userSchema.methods.needsPasswordRehash = function() {
  if (!this.password) return false;
  try {
    return bcrypt.getRounds(this.password) < getAuthConfig().bcryptRounds;
  } catch {
    return false; // Unrecognised hash format — leave it alone.
  }
};

userSchema.methods.isLocked = function() {
  return Boolean(this.lockUntil && this.lockUntil > new Date());
};

userSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('User', userSchema);
