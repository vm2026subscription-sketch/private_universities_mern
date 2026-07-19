const router = require('express').Router();
const passport = require('passport');
const {
  register,
  login,
  verifyLoginOtp,
  getMe,
  forgotPassword,
  resetPassword,
  googleCallback,
  googleExchange,
  logout,
  logoutAll,
  verifyEmail,
  resendVerificationEmail,
  sendOtp,
  verifyPhoneOtp,
  refresh,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  loginLimiter,
  otpVerifyLimiter,
  otpSendLimiter,
  registerLimiter,
  passwordResetLimiter,
  refreshLimiter,
} = require('../middleware/rateLimiters');

const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
const getGoogleErrorRedirect = (error) => `${clientUrl}/auth/callback?error=${encodeURIComponent(error)}`;

const ensureGoogleAuthConfigured = (req, res, next) => {
  const isConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CALLBACK_URL
  );

  if (!isConfigured) {
    return res.redirect(getGoogleErrorRedirect('google_auth_unavailable'));
  }

  return next();
};

/* ── Email / password ─────────────────────────────────────────────────────
 * Login is a two-step flow for EVERY role:
 *   1. POST /login            -> password check, returns { requiresOtp, mfaToken }
 *   2. POST /login/verify-otp -> requires that mfaToken + the emailed code
 * There is no role that skips step 2.
 */
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/login/verify-otp', otpVerifyLimiter, verifyLoginOtp);
router.post('/verify-email', otpVerifyLimiter, verifyEmail);
router.post('/resend-verification', otpSendLimiter, resendVerificationEmail);
router.get('/me', protect, getMe);

/* ── Session lifecycle ────────────────────────────────────────────────── */
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.post('/logout-all', protect, logoutAll);

/* ── Password reset ───────────────────────────────────────────────────── */
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password/:token', passwordResetLimiter, resetPassword);

/* ── Phone OTP ────────────────────────────────────────────────────────────
 * /send-otp can only mint `purpose: 'verify'` codes. Login OTPs are issued
 * exclusively by the password step, so this endpoint can no longer be used to
 * authenticate as another user.
 */
router.post('/send-otp', otpSendLimiter, sendOtp);
router.post('/verify-otp', otpVerifyLimiter, verifyPhoneOtp);

/* ── Google OAuth ─────────────────────────────────────────────────────────
 * The callback redirects with a single-use, 60-second exchange code rather than
 * the JWT itself, keeping the credential out of browser history, Referer
 * headers and proxy logs.
 */
router.get('/google', ensureGoogleAuthConfigured, passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  ensureGoogleAuthConfigured,
  passport.authenticate('google', { session: false, failureRedirect: getGoogleErrorRedirect('google_auth_failed') }),
  googleCallback
);
router.post('/google/exchange', loginLimiter, googleExchange);

module.exports = router;
