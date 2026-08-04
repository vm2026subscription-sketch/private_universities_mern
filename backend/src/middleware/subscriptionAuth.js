const Subscription = require('../models/Subscription');

const deny = (res, status, message, code) =>
  res.status(status).json({ success: false, ...(code ? { code } : {}), message });

/**
 * Ensures the authenticated university account has an active subscription (expiryDate > now).
 *
 * Must be executed after `requireUniversityAccess` (which populates `req.user` and `req.university`).
 *
 * Rules:
 * - Applied ONLY to tenant write/mutation routes (updating profile, adding/deleting courses, gallery, etc.).
 * - Does NOT apply to tenant read routes or public university endpoints.
 * - Returns HTTP 403 with code 'SUBSCRIPTION_EXPIRED' if expired or inactive.
 */
exports.requireActiveSubscription = async (req, res, next) => {
  try {
    const universityId = req.university?._id || req.user?.universityId;

    if (!universityId) {
      return deny(res, 403, 'No university linked to session.', 'NO_UNIVERSITY_LINKED');
    }

    // Find the latest subscription record ordered by expiry date
    const latestSubscription = await Subscription.findOne({ universityId }).sort({ expiryDate: -1 });

    const now = new Date();

    if (!latestSubscription || !latestSubscription.expiryDate || latestSubscription.expiryDate <= now) {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Subscription expired. Please purchase or renew your subscription to perform editing actions.',
        expiryDate: latestSubscription?.expiryDate || null,
      });
    }

    req.subscription = latestSubscription;
    return next();
  } catch (error) {
    console.error('[subscriptionAuth] requireActiveSubscription error:', error);
    return deny(res, 500, 'Could not verify subscription status.');
  }
};
