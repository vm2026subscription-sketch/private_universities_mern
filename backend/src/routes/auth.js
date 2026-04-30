const router = require('express').Router();
const passport = require('passport');
const { register, login, getMe, forgotPassword, resetPassword, googleCallback, logout, verifyEmail, resendVerificationEmail, sendOtp, verifyPhoneOtp } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

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

// Email/Password auth
router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/logout', logout);

// Phone OTP auth
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyPhoneOtp);

// Google OAuth
router.get('/google', ensureGoogleAuthConfigured, passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  ensureGoogleAuthConfigured,
  passport.authenticate('google', { session: false, failureRedirect: getGoogleErrorRedirect('google_auth_failed') }),
  googleCallback
);

module.exports = router;
