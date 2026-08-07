const router = require('express').Router();
const paymentController = require('../controllers/paymentController');
const { protect, requireRole } = require('../middleware/auth');
const { requireUniversityAccess } = require('../middleware/universityTenancy');

const universityOnly = requireRole('university', { exact: true });

/**
 * GET /payment/plans
 *
 * The prices the server will actually charge. The plan cards used to hardcode
 * their own figures, which is how the dashboard came to advertise ₹4,999 while
 * PLAN_PRICE_MONTHLY_INR said 1000 — two numbers for one price, and the
 * customer-facing one was wrong. Reading them from here means the card and the
 * charge cannot disagree.
 *
 * Unauthenticated: it is a price list, and a university looks at it before
 * anything else.
 */
router.get('/plans', paymentController.getPlans);

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
