const router = require('express').Router();
const passport = require('passport');
const { register, login, getMe, forgotPassword, resetPassword, googleCallback, logout, verifyEmail, resendVerificationEmail } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const ensureGoogleAuthConfigured = (req, res, next) => {
  const isConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CALLBACK_URL
  );

  if (!isConfigured) {
    return res.status(503).json({
      success: false,
      message: 'Google authentication is not configured on this server.',
    });
  }

  return next();
};

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/logout', logout);
router.get('/google', ensureGoogleAuthConfigured, passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  ensureGoogleAuthConfigured,
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  googleCallback
);

module.exports = router;
