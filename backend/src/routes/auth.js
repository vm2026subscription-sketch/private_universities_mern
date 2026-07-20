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

// One-time admin setup endpoint (remove after use)
const User = require('../models/User');
const getAdminEmails = () => (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
router.get('/setup-admin', async (req, res) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    const password = String(req.query.password || '').trim();
    if (!email || !password) return res.status(400).json({ success: false, message: 'email and password required' });
    if (!getAdminEmails().includes(email)) return res.status(403).json({ success: false, message: 'Not an admin email' });
    const existing = await User.findOne({ email });
    if (existing) {
      existing.password = password;
      existing.role = 'admin';
      existing.isEmailVerified = true;
      existing.status = 'active';
      await existing.save();
      return res.json({ success: true, message: `Admin updated: ${email}` });
    }
    const user = new User({ name: 'Admin', email, password, role: 'admin', isEmailVerified: true, authProvider: 'local', status: 'active' });
    await user.save();
    return res.json({ success: true, message: `Admin created: ${email}` });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

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

module.exports = router;
