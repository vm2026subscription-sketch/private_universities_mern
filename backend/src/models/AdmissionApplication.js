const mongoose = require('mongoose');

const selectedUniversitySchema = new mongoose.Schema({
  university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
}, { _id: false });

const admissionApplicationSchema = new mongoose.Schema({
  applicationNumber: { type: String, required: true, unique: true, index: true },
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  currentCity: { type: String, required: true, trim: true },
  currentState: { type: String, required: true, trim: true },
  class12Percentage: { type: Number, min: 0, max: 100 },
  entranceExam: { type: String, trim: true },
  entranceScore: { type: String, trim: true },
  preference: {
    stream: { type: String, required: true, trim: true },
    course: { type: String, required: true, trim: true },
    branch: { type: String, trim: true, default: '' },
    preferredState: { type: String, required: true, trim: true },
  },
  selectedUniversities: {
    type: [selectedUniversitySchema],
    validate: {
      validator: (items) => Array.isArray(items) && items.length >= 1 && items.length <= 5,
      message: 'Select between 1 and 5 universities',
    },
  },
  message: { type: String, trim: true, maxlength: 1000 },
  consent: { type: Boolean, required: true, validate: (value) => value === true },
  status: {
    type: String,
    enum: ['new', 'contacted', 'counselling', 'documents_pending', 'applied', 'admitted', 'closed'],
    default: 'new',
  },
  adminNotes: { type: String, trim: true, maxlength: 3000 },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastContactedAt: Date,
  source: { type: String, default: 'website' },
}, { timestamps: true });

admissionApplicationSchema.index({ status: 1, createdAt: -1 });
admissionApplicationSchema.index({ email: 1, phone: 1, createdAt: -1 });
admissionApplicationSchema.index({ 'preference.preferredState': 1, 'preference.stream': 1 });

module.exports = mongoose.model('AdmissionApplication', admissionApplicationSchema);
