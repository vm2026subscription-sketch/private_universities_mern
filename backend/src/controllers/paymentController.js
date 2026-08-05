const paymentService = require('../services/paymentService');

/**
 * Creates a Razorpay Order.
 *
 * Requirements:
 * - Accepts only `plan` from frontend.
 * - Ignores any `amount` sent from frontend to prevent tampering.
 * - Validates plan ('monthly' | 'yearly').
 * - Calculates amount on backend in paise.
 * - Returns order details.
 */
exports.createOrder = async (req, res, next) => {
  try {
    const { plan } = req.body || {};

    if (!plan || !['monthly', 'yearly'].includes(String(plan).toLowerCase())) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PLAN',
        message: "Invalid plan. Plan must be either 'monthly' or 'yearly'.",
      });
    }

    const universityId = req.university?._id || req.user?.universityId;
    if (!universityId) {
      return res.status(403).json({
        success: false,
        code: 'NO_UNIVERSITY_LINKED',
        message: 'No university linked to this account.',
      });
    }

    const orderDetails = await paymentService.createOrder({
      plan: String(plan).toLowerCase(),
      universityId,
    });

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: orderDetails,
    });
  } catch (error) {
    console.error('[paymentController] createOrder error:', error);

    // Razorpay SDK errors carry { statusCode, error: { description, code } }.
    // CRITICAL: Never forward a Razorpay 401 as HTTP 401 — the axios
    // interceptor treats 401 as "user session expired" and redirects to /login.
    // A Razorpay 401 means our server's API keys are wrong, which is a gateway
    // configuration problem (502), not a user authentication problem.
    const isRazorpayError = error?.error?.code === 'BAD_REQUEST_ERROR' || error?.statusCode;
    const errorMessage =
      error?.error?.description ||
      error?.description ||
      error?.message ||
      'Failed to create payment order';

    let statusCode;
    if (isRazorpayError) {
      // All Razorpay-side failures are upstream gateway errors from the
      // client's perspective.  Map them to 502 so the frontend can show
      // "payment gateway error" instead of triggering a session refresh loop.
      statusCode = 502;
    } else {
      statusCode = 500;
    }

    return res.status(statusCode).json({
      success: false,
      code: 'ORDER_CREATION_FAILED',
      message: isRazorpayError
        ? 'Payment gateway configuration error. Please contact support.'
        : errorMessage,
    });
  }
};

/**
 * Verifies Razorpay checkout signature.
 *
 * Requirements:
 * - Validates razorpay_order_id, razorpay_payment_id, razorpay_signature.
 * - Verifies cryptographic HMAC signature using RAZORPAY_KEY_SECRET.
 * - Returns success only if signature is valid.
 * - DOES NOT activate subscription here (activation occurs exclusively via Webhook).
 */
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message:
          'Missing required verification fields: razorpay_order_id, razorpay_payment_id, razorpay_signature.',
      });
    }

    const isValid = paymentService.verifyCheckoutSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Verification failed.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully. Awaiting webhook confirmation to activate subscription.',
    });
  } catch (error) {
    console.error('[paymentController] verifyPayment error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment',
    });
  }
};

/**
 * Webhook handler for Razorpay payment notifications.
 *
 * Requirements:
 * - No JWT authentication or authorization.
 * - Uses raw request body Buffer for HMAC verification.
 * - Verifies webhook signature using RAZORPAY_WEBHOOK_SECRET.
 * - Handles payment.captured event and activates subscription.
 * - Ignores duplicate webhook events safely.
 * - Logs all failures.
 */
exports.handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body;

    if (!signature || !rawBody) {
      console.error('[webhook failure] Missing x-razorpay-signature header or raw body.');
      return res.status(400).json({
        success: false,
        message: 'Missing x-razorpay-signature header or raw body.',
      });
    }

    const isValidSignature = paymentService.verifyWebhookSignature(rawBody, signature);

    if (!isValidSignature) {
      console.error('[webhook failure] Invalid webhook signature provided.');
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature.',
      });
    }

    let eventPayload;
    try {
      const rawString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf-8') : String(rawBody);
      eventPayload = JSON.parse(rawString);
    } catch (parseError) {
      console.error('[webhook failure] Failed to parse webhook JSON payload:', parseError.message);
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON payload.',
      });
    }

    const result = await paymentService.activateSubscriptionFromWebhook(eventPayload);

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      result,
    });
  } catch (error) {
    console.error('[webhook failure] Error processing webhook:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process webhook',
    });
  }
};
