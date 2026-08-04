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


/* ── Email / password ─────────────────────────────────────────────────────── */
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/login/verify-otp', otpVerifyLimiter, verifyLoginOtp);
router.post('/verify-email', otpVerifyLimiter, verifyEmail);
router.post('/resend-verification', otpSendLimiter, resendVerificationEmail);
router.get('/me', protect, getMe);

/* ── Session lifecycle ────────────────────────────────────────────────────── */
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.post('/logout-all', protect, logoutAll);

/* ── Password reset ───────────────────────────────────────────────────────── */
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password/:token', passwordResetLimiter, resetPassword);

/* ── Phone OTP ────────────────────────────────────────────────────────────── */
router.post('/send-otp', otpSendLimiter, sendOtp);
router.post('/verify-otp', otpVerifyLimiter, verifyPhoneOtp);

/* ── Google OAuth ─────────────────────────────────────────────────────────── */
router.get('/google', ensureGoogleAuthConfigured, passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  ensureGoogleAuthConfigured,
  passport.authenticate('google', { session: false, failureRedirect: getGoogleErrorRedirect('google_auth_failed') }),
  googleCallback
);
router.post('/google/exchange', loginLimiter, googleExchange);

/* ── Email diagnostics (admin only) ───────────────────────────────────────── */
/**
 * Wrapped because server.js treats an unhandled rejection as fatal: an async
 * handler that throws does not merely fail its request, it shuts the process
 * down. This one already did exactly that once, when a refactor removed
 * describeEmailConfig while this route kept importing it — opening the
 * diagnostics page took the whole API offline.
 */
router.get('/email-status', protect, async (req, res) => {
  try {
    const { describeEmailConfig, verifySmtpCredentials } = require('../utils/sendEmail');
    const config = describeEmailConfig();
    const smtp = config.smtpConfigured
      ? await verifySmtpCredentials()
      : { ok: false, reason: 'SMTP not configured' };
    res.json({ config, smtp });
  } catch (error) {
    console.error('[auth] email-status failed:', error);
    res.status(500).json({ success: false, message: 'Could not read the email configuration.' });
  }
});

/* ── ONE-TIME admin promotion (remove after use) ──────────────────────────── */
if (process.env.ENABLE_PROMOTE_ADMIN === 'true') {
  const User = require('../models/User');
  router.get('/promote-admin/:email', async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.email).toLowerCase().trim();
      const user = await User.findOneAndUpdate(
        { email },
        { role: 'admin', isEmailVerified: true, status: 'active' },
        { new: true }
      );
      if (!user) return res.status(404).json({ success: false, message: `No user found: ${email}` });
      res.json({ success: true, message: `Promoted to admin: ${user.email}`, role: user.role });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
}

module.exports = router;
