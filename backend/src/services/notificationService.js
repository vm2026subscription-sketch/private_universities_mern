const Notification = require('../models/Notification');
const User = require('../models/User');
const emailService = require('./emailService');

/**
 * 1. Low-level: Create DB In-App Notification (Permanently stored in MongoDB)
 */
async function createNotification({
  userId,
  targetRole,
  title,
  message,
  type = 'info',
  category = 'general',
  link,
  isBroadcast = false,
}) {
  try {
    if (userId) {
      return await Notification.create({
        userId,
        title,
        message,
        type,
        category,
        link,
        isBroadcast: false,
      });
    }

    if (targetRole) {
      const queryRole = targetRole === 'admin' ? { role: { $in: ['admin', 'superadmin'] } } : { role: targetRole };
      const users = await User.find({ ...queryRole, status: 'active' }).select('_id');

      if (users.length > 0) {
        // Create per-user document without targetRole field to prevent cross-user matching in OR queries
        const docs = users.map((u) => ({
          userId: u._id,
          title,
          message,
          type,
          category,
          link,
          isBroadcast: false,
        }));
        await Notification.insertMany(docs);
        return true;
      }

      return await Notification.create({
        targetRole,
        title,
        message,
        type,
        category,
        link,
        isBroadcast: true,
      });
    }

    if (isBroadcast) {
      return await Notification.create({
        title,
        message,
        type,
        category,
        link,
        isBroadcast: true,
      });
    }
  } catch (error) {
    console.error('[notificationService] Error in createNotification:', error.message);
  }
  return null;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Flow Event Handlers                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Event: University Signup / Registration Request Submitted
 * - Admin In-App: "New University Approval Request"
 * - Admin Email: NO (Admins use in-app notifications)
 * - University In-App: "Registration Request Submitted"
 * - University Email: "Registration Request Submitted" (emailService)
 */
async function notifyApprovalRequest({ applicantId, applicantName, applicantEmail, universityName }) {
  // Prevent duplicate notification dispatch if triggered repeatedly within 5 minutes
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
  const existingNotif = await Notification.findOne({
    category: 'approval',
    title: 'New University Approval Request',
    message: new RegExp(applicantEmail, 'i'),
    createdAt: { $gt: fiveMinsAgo },
  });

  if (existingNotif) {
    console.log(`[notificationService] Deduplicated notifyApprovalRequest for ${applicantEmail}`);
    return;
  }

  // 1. Admin Dashboard In-App Notification
  await createNotification({
    targetRole: 'admin',
    title: 'New University Approval Request',
    message: `New approval request received from ${applicantName} (${applicantEmail}) for ${universityName}.`,
    type: 'info',
    category: 'approval',
    link: '/admin/pending-requests',
  });

  // 2. University In-App Notification
  if (applicantId) {
    await createNotification({
      userId: applicantId,
      title: 'Registration Request Submitted',
      message: `Your request to register and manage ${universityName} has been submitted successfully and is pending admin approval.`,
      type: 'info',
      category: 'approval',
      link: '/university/dashboard',
    });
  }

  // 3. University Email Notification (using emailService template)
  if (applicantEmail) {
    await emailService.sendRequestSubmittedEmail({
      to: applicantEmail,
      applicantName,
      universityName,
    });
  }
}

/**
 * Event: Admin Approves Request
 * - University In-App: "Request Approved"
 * - University Email: "Request Approved" (emailService)
 */
async function notifyClaimApproved({ applicantId, applicantEmail, universityName }) {
  // 1. University In-App Notification
  await createNotification({
    userId: applicantId,
    title: 'Request Approved',
    message: `Your request to manage ${universityName} has been approved by the admin team. You can now access your portal.`,
    type: 'success',
    category: 'approval',
    link: '/university/dashboard',
  });

  // 2. University Email Notification
  if (applicantEmail) {
    await emailService.sendRequestApprovedEmail({
      to: applicantEmail,
      universityName,
    });
  }
}

/**
 * Event: Admin Rejects Request (with reason)
 * - University In-App: "Request Rejected"
 * - University Email: "Request Rejected" (with reason, emailService)
 */
async function notifyClaimRejected({ applicantId, applicantEmail, universityName, reason }) {
  // 1. University In-App Notification
  await createNotification({
    userId: applicantId,
    title: 'Request Rejected',
    message: `Your request to manage ${universityName} was rejected. Reason: ${reason}`,
    type: 'error',
    category: 'approval',
    link: '/university/dashboard',
  });

  // 2. University Email Notification with Reason
  if (applicantEmail) {
    await emailService.sendRequestRejectedEmail({
      to: applicantEmail,
      universityName,
      reason,
    });
  }
}

/**
 * Event: Payment Successful
 * - Admin In-App: "Payment Successful"
 * - University In-App: "Payment Successful"
 * - University Email: "Payment Successful" (emailService)
 */
async function notifyPaymentSuccess({ ownerId, ownerEmail, universityName, planName }) {
  const formattedPlan = (planName || 'sponsorship').toUpperCase();

  // 1. Admin In-App Notification
  await createNotification({
    targetRole: 'admin',
    title: 'Payment Successful',
    message: `Payment successful for ${universityName} (${formattedPlan} Plan).`,
    type: 'success',
    category: 'payment',
    link: '/admin/subscriptions',
  });

  // 2. University In-App Notification
  if (ownerId) {
    await createNotification({
      userId: ownerId,
      title: 'Payment Successful',
      message: `Your payment for ${universityName} was successful. Your ${formattedPlan} plan features are now active.`,
      type: 'success',
      category: 'payment',
      link: '/university/dashboard/subscription',
    });
  }

  // 3. University Email Notification
  if (ownerEmail) {
    await emailService.sendPaymentSuccessEmail({
      to: ownerEmail,
      universityName,
      planName: formattedPlan,
    });
  }
}

/**
 * Event: Payment Failed / Cancelled
 * - University Email ONLY: "Payment Failed / Cancelled" (emailService)
 */
async function notifyPaymentFailed({ ownerEmail, universityName, reason }) {
  if (ownerEmail) {
    await emailService.sendPaymentFailedEmail({
      to: ownerEmail,
      universityName,
      reason,
    });
  }
}

/**
 * Event: Subscription Expiring (7 Days Before)
 * - University In-App: "Subscription Expiring"
 * - University Email: "Subscription Expiring" (emailService)
 */
async function notifySubscriptionExpiring({ ownerId, ownerEmail, universityName, planName, expiryDateStr }) {
  const formattedPlan = (planName || 'sponsorship').toUpperCase();

  // 1. University In-App Notification
  await createNotification({
    userId: ownerId,
    title: 'Subscription Expiring',
    message: `Your ${formattedPlan} plan for ${universityName} will expire in 7 days on ${expiryDateStr}.`,
    type: 'warning',
    category: 'subscription',
    link: '/university/dashboard/subscription',
  });

  // 2. University Email Notification
  if (ownerEmail) {
    await emailService.sendSubscriptionExpiringEmail({
      to: ownerEmail,
      universityName,
      planName: formattedPlan,
      expiryDateStr,
    });
  }
}

/**
 * Event: Subscription Expired
 * - Admin In-App: "Subscription Expire"
 * - University In-App: "Subscription Expired"
 * - University Email: "Subscription Expired" (emailService)
 */
async function notifySubscriptionExpired({ ownerId, ownerEmail, universityName, planName }) {
  const formattedPlan = (planName || 'sponsorship').toUpperCase();

  // 1. Admin In-App Notification
  await createNotification({
    targetRole: 'admin',
    title: 'Subscription Expire',
    message: `Subscription for ${universityName} (${formattedPlan} Plan) has expired.`,
    type: 'warning',
    category: 'subscription',
    link: '/admin/subscriptions',
  });

  // 2. University In-App Notification
  if (ownerId) {
    await createNotification({
      userId: ownerId,
      title: 'Subscription Expired',
      message: `Your ${formattedPlan} plan for ${universityName} has expired. Please renew your plan.`,
      type: 'error',
      category: 'subscription',
      link: '/university/dashboard/subscription',
    });
  }

  // 3. University Email Notification
  if (ownerEmail) {
    await emailService.sendSubscriptionExpiredEmail({
      to: ownerEmail,
      universityName,
      planName: formattedPlan,
    });
  }
}

module.exports = {
  createNotification,
  notifyApprovalRequest,
  notifyClaimApproved,
  notifyClaimRejected,
  notifyPaymentSuccess,
  notifyPaymentFailed,
  notifySubscriptionExpiring,
  notifySubscriptionExpired,
};
