const University = require('../models/University');
const User = require('../models/User');
const Notification = require('../models/Notification');
const notificationService = require('./notificationService');

/**
 * Checks active university subscriptions for upcoming expirations (7 days) and expired states.
 * Sends in-app and email notifications via notificationService.
 */
async function checkSubscriptionExpirations() {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 1. Find universities expiring within the next 7 days (and not already expired)
    const expiringUnis = await University.find({
      sponsorExpiry: { $gt: now, $lte: sevenDaysFromNow },
      sponsorTier: { $ne: 'none' },
    }).select('_id name sponsorTier sponsorExpiry');

    for (const uni of expiringUnis) {
      const owners = await User.find({ universityId: uni._id, role: 'university' }).select('_id email name');
      
      for (const owner of owners) {
        // Check if 7-day warning notification already sent in the last 24h to avoid duplicate spam
        const existingNotif = await Notification.findOne({
          userId: owner._id,
          category: 'subscription',
          title: /Subscription Expiring Soon/i,
          createdAt: { $gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        });

        if (!existingNotif) {
          const expiryDateStr = new Date(uni.sponsorExpiry).toLocaleDateString();
          await notificationService.notifySubscriptionExpiring({
            ownerId: owner._id,
            ownerEmail: owner.email,
            universityName: uni.name,
            planName: uni.sponsorTier,
            expiryDateStr,
          });
        }
      }
    }

    // 2. Find universities that have expired (sponsorExpiry <= now) but are still marked with tier != 'none'
    const expiredUnis = await University.find({
      sponsorExpiry: { $lte: now },
      sponsorTier: { $ne: 'none' },
    }).select('_id name sponsorTier sponsorExpiry');

    for (const uni of expiredUnis) {
      const owners = await User.find({ universityId: uni._id, role: 'university' }).select('_id email name');

      for (const owner of owners) {
        const existingNotif = await Notification.findOne({
          userId: owner._id,
          category: 'subscription',
          title: /Subscription Expired/i,
          createdAt: { $gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        });

        if (!existingNotif) {
          await notificationService.notifySubscriptionExpired({
            ownerId: owner._id,
            ownerEmail: owner.email,
            universityName: uni.name,
            planName: uni.sponsorTier,
          });
        }
      }
    }
  } catch (error) {
    console.error('[subscriptionChecker] Error running subscription expiration check:', error);
  }
}

module.exports = {
  checkSubscriptionExpirations,
};
