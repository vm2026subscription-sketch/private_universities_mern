const router = require('express').Router();
const paymentController = require('../controllers/paymentController');
const { protect, requireRole } = require('../middleware/auth');
const { requireUniversityAccess } = require('../middleware/universityTenancy');

const universityOnly = requireRole('university', { exact: true });

/* ── Tenant Protected Payment Endpoints ───────────────────────────────────── */

/**
 * POST /payment/create-order
 * Creates a Razorpay order for subscription purchase.
 */
router.post(
  '/create-order',
  protect,
  universityOnly,
  requireUniversityAccess,
  paymentController.createOrder
);

/**
 * POST /payment/verify
 * Verifies Razorpay checkout signature. Does NOT activate subscription.
 */
router.post(
  '/verify',
  protect,
  universityOnly,
  requireUniversityAccess,
  paymentController.verifyPayment
);

/* ── Unauthenticated Webhook Endpoint ─────────────────────────────────────── */

/**
 * POST /payment/webhook
 * Handled in Phase 4. Signature verified via raw body and RAZORPAY_WEBHOOK_SECRET.
 */
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;
