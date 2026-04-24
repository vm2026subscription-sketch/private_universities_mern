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
    targetYear: Number
  },
  savedUniversities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'University' }],
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
