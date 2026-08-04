const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const University = require('../models/University');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

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
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #c53030;">Action Required: Subscription Expiring Soon</h2>
            <p>Dear Representative,</p>
            <p>Your subscription for <strong>${university.name}</strong> on Vidyarthi Mitra is set to expire on <strong>${sub.expiryDate.toDateString()}</strong> (in approximately ${daysLeft} days).</p>
            <p>To avoid any interruption to your university portal editing permissions, please log into your dashboard and renew your subscription.</p>
            <div style="margin: 25px 0;">
              <a href="${process.env.CLIENT_URL || 'https://privateuniversity.vidyarthimitra.org'}/dashboard" style="background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Renew Subscription Now</a>
            </div>
            <p style="font-size: 13px; color: #4a5568;">Note: Even after expiry, your public university listing will remain visible to students, but portal editing will be temporarily locked until renewed.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #718096;">Vidyarthi Mitra Platform Services</p>
          </div>
        `;

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
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
              <h2 style="color: #e53e3e;">Subscription Expired</h2>
              <p>Dear Representative,</p>
              <p>Your subscription for <strong>${university.name}</strong> on Vidyarthi Mitra expired on <strong>${sub.expiryDate.toDateString()}</strong>.</p>
              <p>Editing access for your university portal features has been temporarily locked. Your public profile remain visible on the site.</p>
              <p>To restore portal editing capabilities immediately, please renew your subscription.</p>
              <div style="margin: 25px 0;">
                <a href="${process.env.CLIENT_URL || 'https://privateuniversity.vidyarthimitra.org'}/dashboard" style="background-color: #e53e3e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Renew Subscription</a>
              </div>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #718096;">Vidyarthi Mitra Platform Services</p>
            </div>
          `;

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
