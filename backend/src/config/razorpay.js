const Razorpay = require('razorpay');

/**
 * Reusable Razorpay client instance.
 *
 * Uses environment variables RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.
 * Throws early if keys are unconfigured when API actions are attempted.
 */
let cachedInstance = null;

const getRazorpayInstance = () => {
  if (cachedInstance) {
    return cachedInstance;
  }

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error(
      '[Razorpay Config Error] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variable is missing.'
    );
  }

  cachedInstance = new Razorpay({
    key_id,
    key_secret,
  });

  return cachedInstance;
};

module.exports = getRazorpayInstance;
