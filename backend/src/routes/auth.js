const router = require('express').Router();
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const { register, login, verifyLoginOtp, getMe, forgotPassword, resetPassword, googleCallback, logout, verifyEmail, resendVerificationEmail, sendOtp, verifyPhoneOtp } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Dedicated limiter for brute-forceable credential/OTP endpoints. The global
// /api limiter (1000/15m) is far too loose to stop credential-stuffing or
// 6-digit-OTP brute force; this caps sensitive auth attempts per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait a few minutes and try again.' },
});

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
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

// Email/Password auth (sensitive endpoints throttled by authLimiter)
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/login/verify-otp', authLimiter, verifyLoginOtp);
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-verification', authLimiter, resendVerificationEmail);
router.get('/me', protect, getMe);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPassword);
router.post('/logout', logout);

// Phone OTP auth
router.post('/send-otp', authLimiter, sendOtp);
router.post('/verify-otp', authLimiter, verifyPhoneOtp);

// Google OAuth
router.get('/google', ensureGoogleAuthConfigured, passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  ensureGoogleAuthConfigured,
  passport.authenticate('google', { session: false, failureRedirect: getGoogleErrorRedirect('google_auth_failed') }),
  googleCallback
);

module.exports = router;
