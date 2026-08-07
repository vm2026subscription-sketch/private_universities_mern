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
    /**
     * How this subscription came to exist.
     *
     * A trial granted by an admin has no payment behind it, so the Razorpay
     * fields below cannot be required outright — that would make a sales trial
     * impossible to record without inventing a fake payment id, which would then
     * be indistinguishable from a real one in the revenue reports.
     */
    source: {
      type: String,
      enum: ['payment', 'trial'],
      default: 'payment',
      index: true,
    },

    /**
     * Required for a payment, absent for a trial. `sparse` on the unique index
     * so many trials can coexist — without it, the second trial would collide on
     * a null payment id.
     */
    razorpayOrderId: {
      type: String,
      required() {
        return this.source !== 'trial';
      },
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      required() {
        return this.source !== 'trial';
      },
      unique: true,
      sparse: true,
      index: true,
    },
    razorpaySignature: {
      type: String,
    },

    /** Who granted a trial, and why. Empty for paid subscriptions. */
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    grantNote: {
      type: String,
      trim: true,
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
