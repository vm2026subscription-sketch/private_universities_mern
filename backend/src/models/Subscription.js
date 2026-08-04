const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['monthly', 'yearly'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpaySignature: {
      type: String,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    expiringEmailSent: {
      type: Boolean,
      default: false,
    },
    expiredEmailSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual property to dynamically determine subscription active state.
// Active ONLY when expiryDate > currentDate.
subscriptionSchema.virtual('isActive').get(function () {
  return Boolean(this.expiryDate && this.expiryDate > new Date());
});

// Index for efficient sorting and newest subscription retrieval per university.
subscriptionSchema.index({ universityId: 1, expiryDate: -1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
