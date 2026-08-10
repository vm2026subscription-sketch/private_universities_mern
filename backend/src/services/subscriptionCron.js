const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const University = require('../models/University');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { wrapInLayout } = require('./emailService');

/**
 * Checks for subscriptions expiring in 7 days and dispatches notification emails.
 */
const checkExpiringSubscriptions = async () => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expiringSubscriptions = await Subscription.find({
      expiryDate: { $gt: now, $lte: sevenDaysFromNow },
      expiringEmailSent: { $ne: true },
    }).populate('universityId');

    console.log(`[subscriptionCron] Found ${expiringSubscriptions.length} subscriptions expiring in 7 days.`);

    for (const sub of expiringSubscriptions) {
      const university = sub.universityId;
      if (!university) continue;

      const ownerUser = await User.findOne({ universityId: university._id, universityRole: 'owner' });
      const recipientEmail = university.email || ownerUser?.email;

      if (recipientEmail) {
        const daysLeft = Math.ceil((sub.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const emailSubject = `Subscription Expiring in ${daysLeft} Days - ${university.name}`;
        const bodyHtml = `
          <h2 style="color: #d97706; margin: 0 0 16px 0; font-size: 20px; font-weight: 700;">Action Required: Subscription Expiring Soon</h2>
          <p style="margin: 0 0 12px 0;">Dear Representative,</p>
          <p style="margin: 0 0 12px 0;">Your subscription for <strong>${university.name}</strong> on Vidyarthi Mitra is set to expire on <strong>${sub.expiryDate.toDateString()}</strong> (in approximately ${daysLeft} days).</p>
          <p style="margin: 0 0 12px 0;">To avoid any interruption to your university portal editing permissions, please log into your dashboard and renew your subscription.</p>
          <p style="margin: 0; font-size: 13px; color: #64748b;">Note: Even after expiry, your public university listing will remain visible to students, but portal editing will be temporarily locked until renewed.</p>
        `;
        const emailHtml = wrapInLayout(bodyHtml, {
          title: 'Subscription Expiring Soon',
          ctaLabel: 'Renew Subscription Now',
          ctaUrl: `${process.env.CLIENT_URL || 'https://privateuniversity.vidyarthimitra.org'}/university/dashboard/subscription`,
        });

        try {
          await sendEmail({ to: recipientEmail, subject: emailSubject, html: emailHtml });
          console.log(`[subscriptionCron] 7-day expiration warning email sent to ${recipientEmail}`);
        } catch (mailErr) {
          console.error(`[subscriptionCron] Failed to send expiring email to ${recipientEmail}:`, mailErr.message);
        }
      }

      // Mark email as sent to prevent duplicates
      sub.expiringEmailSent = true;
      await sub.save();
    }
  } catch (error) {
    console.error('[subscriptionCron] Error checking expiring subscriptions:', error);
  }
};

/**
 * Checks for expired subscriptions and dispatches expired notification emails.
 */
const checkExpiredSubscriptions = async () => {
  try {
    const now = new Date();

    const expiredSubscriptions = await Subscription.find({
      expiryDate: { $lte: now },
      expiredEmailSent: { $ne: true },
    }).populate('universityId');

    console.log(`[subscriptionCron] Found ${expiredSubscriptions.length} newly expired subscriptions.`);

    for (const sub of expiredSubscriptions) {
      const university = sub.universityId;
      if (!university) continue;

      // Check if a newer active subscription exists for this university (e.g. renewed already)
      const activeSub = await Subscription.findOne({
        universityId: university._id,
        expiryDate: { $gt: now },
      });

      if (!activeSub) {
        const ownerUser = await User.findOne({ universityId: university._id, universityRole: 'owner' });
        const recipientEmail = university.email || ownerUser?.email;

        if (recipientEmail) {
          const emailSubject = `Subscription Expired - ${university.name}`;
          const bodyHtml = `
            <h2 style="color: #dc2626; margin: 0 0 16px 0; font-size: 20px; font-weight: 700;">Subscription Expired</h2>
            <p style="margin: 0 0 12px 0;">Dear Representative,</p>
            <p style="margin: 0 0 12px 0;">Your subscription for <strong>${university.name}</strong> on Vidyarthi Mitra expired on <strong>${sub.expiryDate.toDateString()}</strong>.</p>
            <p style="margin: 0 0 12px 0;">Editing access for your university portal features has been temporarily locked. Your public profile remains visible on the site.</p>
            <p style="margin: 0;">To restore portal editing capabilities immediately, please renew your subscription.</p>
          `;
          const emailHtml = wrapInLayout(bodyHtml, {
            title: 'Subscription Expired',
            ctaLabel: 'Renew Subscription',
            ctaUrl: `${process.env.CLIENT_URL || 'https://privateuniversity.vidyarthimitra.org'}/university/dashboard/subscription`,
          });

          try {
            await sendEmail({ to: recipientEmail, subject: emailSubject, html: emailHtml });
            console.log(`[subscriptionCron] Expiration email sent to ${recipientEmail}`);
          } catch (mailErr) {
            console.error(`[subscriptionCron] Failed to send expired email to ${recipientEmail}:`, mailErr.message);
          }
        }
      }

      // Mark email as sent to prevent duplicates
      sub.expiredEmailSent = true;
      await sub.save();
    }
  } catch (error) {
    console.error('[subscriptionCron] Error checking expired subscriptions:', error);
  }
};

/**
 * Initializes daily subscription cron job.
 * Runs every day at 00:00 (midnight).
 */
const initSubscriptionCron = () => {
  console.log('[subscriptionCron] Initializing daily subscription cron scheduler (0 0 * * *)...');

  // Schedule daily run at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[subscriptionCron] Running daily subscription checks...');
    await checkExpiringSubscriptions();
    await checkExpiredSubscriptions();
  });

  // Run once asynchronously at startup to process any pending notifications immediately
  setTimeout(async () => {
    console.log('[subscriptionCron] Running initial startup check for expiring/expired subscriptions...');
    await checkExpiringSubscriptions();
    await checkExpiredSubscriptions();
  }, 10000);
};

module.exports = {
  initSubscriptionCron,
  checkExpiringSubscriptions,
  checkExpiredSubscriptions,
};
