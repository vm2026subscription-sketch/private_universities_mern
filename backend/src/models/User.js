const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, select: false },
  googleId: String,
  avatar: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
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
    collegeType: { type: String, enum: ['private', 'deemed', 'both'], default: 'both' }
  },
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
  emailVerificationCode: String,
  emailVerificationExpiry: Date,
  resetPasswordToken: String,
  resetPasswordExpiry: Date
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
