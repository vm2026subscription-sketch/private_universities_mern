const crypto = require('crypto');
const getRazorpayInstance = require('../config/razorpay');
const Subscription = require('../models/Subscription');
const University = require('../models/University');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// Plan pricing defined securely on backend in INR Rupees.
const PLAN_PRICES_INR = {
  monthly: Number(process.env.PLAN_PRICE_MONTHLY_INR) || 4999,
  yearly: Number(process.env.PLAN_PRICE_YEARLY_INR) || 49999,
};

/**
 * Calculates plan price in paise.
 *
 * @param {string} plan - 'monthly' or 'yearly'
 * @returns {{ plan: string, amountInRupees: number, amountInPaise: number }}
 */
const getPlanPricing = (plan) => {
  const normalizedPlan = String(plan || '').toLowerCase();
  if (!PLAN_PRICES_INR[normalizedPlan]) {
    throw new Error(`Invalid subscription plan: "${plan}". Valid plans are 'monthly' or 'yearly'.`);
  }

  const amountInRupees = PLAN_PRICES_INR[normalizedPlan];
  const amountInPaise = Math.round(amountInRupees * 100);

  return {
    plan: normalizedPlan,
    amountInRupees,
    amountInPaise,
  };
};

/**
 * Creates a Razorpay Order for subscription purchase.
 *
 * @param {Object} params
 * @param {string} params.plan - 'monthly' | 'yearly'
 * @param {string} params.universityId - ObjectId of the university
 * @returns {Promise<Object>} Created order payload
 */
exports.createOrder = async ({ plan, universityId }) => {
  const { plan: validPlan, amountInRupees, amountInPaise } = getPlanPricing(plan);
  const razorpay = getRazorpayInstance();

  const receipt = `rcpt_${String(universityId).slice(-8)}_${Date.now()}`;

  const options = {
    amount: amountInPaise,
    currency: 'INR',
    receipt,
    notes: {
      universityId: String(universityId),
      plan: validPlan,
      amountInRupees: String(amountInRupees),
    },
  };

  const order = await razorpay.orders.create(options);

  return {
    orderId: order.id,
    amount: order.amount,
    amountInRupees,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    plan: validPlan,
    receipt: order.receipt,
  };
};

/**
 * Verifies Razorpay checkout signature.
 *
 * @param {Object} params
 * @param {string} params.razorpay_order_id
 * @param {string} params.razorpay_payment_id
 * @param {string} params.razorpay_signature
 * @returns {boolean} True if signature is valid
 */
exports.verifyCheckoutSignature = ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new Error('RAZORPAY_KEY_SECRET is not configured on server.');
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return false;
  }

  const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const expectedBuffer = Buffer.from(generatedSignature, 'utf-8');
  const receivedBuffer = Buffer.from(razorpay_signature, 'utf-8');

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

/**
 * Verifies Razorpay webhook signature using the unparsed raw request body.
 *
 * @param {Buffer|string} rawBody - Raw request body
 * @param {string} signature - Value of 'x-razorpay-signature' header
 * @returns {boolean} True if webhook signature matches
 */
exports.verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured on server.');
  }

  if (!rawBody || !signature) {
    return false;
  }

  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(generatedSignature, 'utf-8');
  const receivedBuffer = Buffer.from(signature, 'utf-8');

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

/**
 * Activates or extends a subscription from a verified Razorpay webhook payload.
 *
 * Activation process:
 * 1. Checks event type (payment.captured).
 * 2. Checks and ignores duplicate payment IDs.
 * 3. Finds university.
 * 4. Determines start date and renewal expiry date:
 *    - If subscription is active (expiryDate > now): new expiry = existing expiryDate + plan duration.
 *    - If subscription is expired (expiryDate <= now): new expiry = currentDate + plan duration.
 * 5. Saves new Subscription record.
 * 6. Sends payment success email.
 *
 * @param {Object} eventPayload - Verified Razorpay event object
 * @returns {Promise<Object>} Processed result summary
 */
exports.activateSubscriptionFromWebhook = async (eventPayload) => {
  const eventName = eventPayload?.event;

  if (eventName !== 'payment.captured') {
    console.log(`[webhook] Event '${eventName}' ignored. Only 'payment.captured' triggers subscription activation.`);
    return { processed: false, reason: `Ignored event: ${eventName}` };
  }

  const paymentEntity = eventPayload?.payload?.payment?.entity;
  if (!paymentEntity) {
    throw new Error('Invalid webhook payload: Missing payload.payment.entity');
  }

  const razorpayPaymentId = paymentEntity.id;
  const razorpayOrderId = paymentEntity.order_id;
  const notes = paymentEntity.notes || {};
  const universityId = notes.universityId;

  if (!razorpayPaymentId) {
    throw new Error('Invalid webhook payload: Missing payment id');
  }

  // Idempotency check: Ignore duplicate webhook events
  const existingSubscription = await Subscription.findOne({ razorpayPaymentId });
  if (existingSubscription) {
    console.warn(`[webhook] Duplicate webhook event ignored. Payment ID ${razorpayPaymentId} already processed.`);
    return { processed: true, duplicate: true, subscriptionId: existingSubscription._id };
  }

  if (!universityId) {
    console.error(`[webhook failure] Payment ${razorpayPaymentId} has no universityId in notes.`);
    throw new Error(`Webhook payment notes missing universityId for payment ${razorpayPaymentId}`);
  }

  const university = await University.findById(universityId);
  if (!university) {
    console.error(`[webhook failure] University ${universityId} not found for payment ${razorpayPaymentId}.`);
    throw new Error(`University with ID ${universityId} not found.`);
  }

  const plan = ['monthly', 'yearly'].includes(String(notes.plan).toLowerCase())
    ? String(notes.plan).toLowerCase()
    : 'monthly';

  const amountInRupees = paymentEntity.amount
    ? paymentEntity.amount / 100
    : getPlanPricing(plan).amountInRupees;

  const durationDays = plan === 'yearly' ? 365 : 30;
  const durationMs = durationDays * 24 * 60 * 60 * 1000;

  const now = new Date();

  // Find latest subscription for university to check if currently active
  const latestSubscription = await Subscription.findOne({ universityId: university._id }).sort({ expiryDate: -1 });

  let startDate = now;
  let expiryDate;

  if (latestSubscription && latestSubscription.expiryDate > now) {
    // Subscription is currently active! Cumulative renewal: extend from existing expiry date
    startDate = latestSubscription.expiryDate;
    expiryDate = new Date(latestSubscription.expiryDate.getTime() + durationMs);
  } else {
    // Subscription expired or brand new: start from current date
    expiryDate = new Date(now.getTime() + durationMs);
  }

  const subscription = await Subscription.create({
    universityId: university._id,
    plan,
    amount: amountInRupees,
    razorpayOrderId: razorpayOrderId || 'N/A',
    razorpayPaymentId,
    razorpaySignature: 'webhook_verified',
    startDate,
    expiryDate,
  });

  console.log(
    `[webhook] Subscription created successfully for University '${university.name}' (${university._id}). ` +
      `Plan: ${plan}, Amount: ₹${amountInRupees}, Expiry: ${expiryDate.toISOString()}`
  );

  // Send Payment Success Email
  try {
    const ownerUser = await User.findOne({ universityId: university._id, universityRole: 'owner' });
    const recipientEmail = university.email || ownerUser?.email;

    if (recipientEmail) {
      const emailSubject = `Subscription Payment Successful - ${university.name}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #1a365d;">Subscription Activated Successfully</h2>
          <p>Dear Representative,</p>
          <p>Thank you for subscribing to <strong>Vidyarthi Mitra University Portal</strong>. Your payment has been received and processed successfully.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f7fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>University Name</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${university.name}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Plan</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${plan.toUpperCase()}</td></tr>
            <tr style="background-color: #f7fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Amount Paid</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">₹${amountInRupees.toLocaleString('en-IN')}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Payment ID</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${razorpayPaymentId}</td></tr>
            <tr style="background-color: #f7fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Subscription Start Date</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${startDate.toDateString()}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Subscription Expiry Date</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${expiryDate.toDateString()}</td></tr>
          </table>
          <p>Your university portal editing features are now fully enabled.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #718096;">This is an automated notification from Vidyarthi Mitra platform.</p>
        </div>
      `;

      await sendEmail({
        to: recipientEmail,
        subject: emailSubject,
        html: emailHtml,
      });

      console.log(`[webhook] Payment success email sent to ${recipientEmail}`);
    }
  } catch (emailError) {
    console.error('[webhook] Failed to send payment confirmation email:', emailError.message);
  }

  return {
    processed: true,
    subscriptionId: subscription._id,
    universityId: university._id,
    plan,
    expiryDate,
  };
};

exports.PLAN_PRICES_INR = PLAN_PRICES_INR;
exports.getPlanPricing = getPlanPricing;
