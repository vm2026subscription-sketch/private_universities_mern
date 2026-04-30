const crypto = require('crypto');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const otpService = require('../services/otpService');

const ADMIN_EMAIL = 'vidyarthimitrauniversity@gmail.com';
const getAdminEmail = () => (process.env.ADMIN_EMAIL || ADMIN_EMAIL).toLowerCase();

const ensureAdminRole = async (user) => {
  if (user?.email?.toLowerCase() === getAdminEmail() && user.role !== 'admin') {
    user.role = 'admin';
    await user.save();
  }
  return user;
};

const getSafeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  countryCode: user.countryCode,
  role: user.role,
  avatar: user.avatar,
  isEmailVerified: user.isEmailVerified,
  isPhoneVerified: user.isPhoneVerified,
  authProvider: user.authProvider,
  status: user.status,
  profileCompleteness: user.profileCompleteness,
});

const setVerificationCode = (user) => {
  const code = `${Math.floor(100000 + Math.random() * 900000)}`;
  user.emailVerificationCode = crypto.createHash('sha256').update(code).digest('hex');
  user.emailVerificationExpiry = Date.now() + 10 * 60 * 1000;
  return code;
};

const sendVerificationEmail = async (user, code) => {
  await sendEmail({
    to: user.email,
    subject: 'Verify your Vidyarthi Mitra account',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Verify your email</h2>
        <p>Your verification code is:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 16px 0;">${code}</div>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });
};

const updateLoginTracking = async (user) => {
  user.lastLogin = new Date();
  user.loginCount = (user.loginCount || 0) + 1;
  await user.save();
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, countryCode } = req.body;
    const normalizedEmail = email.toLowerCase();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    if (phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) return res.status(400).json({ success: false, message: 'Phone number already registered' });
    }

    const role = normalizedEmail === getAdminEmail() ? 'admin' : 'user';
    const userData = { name, email: normalizedEmail, password, role, authProvider: 'local' };
    if (phone) {
      userData.phone = phone;
      userData.countryCode = countryCode || '+91';
    }

    const user = await User.create(userData);
    const code = setVerificationCode(user);
    await user.save();

    try {
      await sendVerificationEmail(user, code);
    } catch (emailError) {
      console.error('Verification email failed:', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Account created. Please verify your email to continue.',
      email: user.email,
      user: getSafeUser(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.password) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (user.status === 'banned') return res.status(403).json({ success: false, message: 'Account has been banned' });
    if (user.status === 'suspended') return res.status(403).json({ success: false, message: 'Account is suspended' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    await ensureAdminRole(user);
    await updateLoginTracking(user);
    const token = generateToken(user._id);
    res.json({ success: true, token, user: getSafeUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMe = async (req, res) => {
  await ensureAdminRole(req.user);
  res.json({ success: true, user: getSafeUser(req.user) });
};

// ── Phone OTP Auth ──────────────────────────────────────────────

exports.sendOtp = async (req, res) => {
  try {
    const { identifier, type = 'sms', purpose = 'login' } = req.body;
    if (!identifier) return res.status(400).json({ success: false, message: 'Phone number or email is required' });

    const result = await otpService.sendOtp({
      identifier,
      type,
      purpose,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ success: true, message: result.message, expiresAt: result.expiresAt });
  } catch (error) {
    res.status(429).json({ success: false, message: error.message });
  }
};

exports.verifyPhoneOtp = async (req, res) => {
  try {
    const { phone, code, name, countryCode } = req.body;
    if (!phone || !code) return res.status(400).json({ success: false, message: 'Phone and OTP code are required' });

    const verification = await otpService.verifyOtp(phone, code);
    if (!verification.success) {
      return res.status(400).json({ success: false, message: verification.message });
    }

    let user = await User.findOne({ phone });

    if (!user) {
      // Auto-register on first phone OTP login
      const email = `${phone.replace(/[^0-9]/g, '')}@phone.vidyarthimitra.local`;
      user = await User.create({
        name: name || `User ${phone.slice(-4)}`,
        email,
        phone,
        countryCode: countryCode || '+91',
        isPhoneVerified: true,
        authProvider: 'phone',
        status: 'active'
      });
    } else {
      if (user.status === 'banned') return res.status(403).json({ success: false, message: 'Account has been banned' });
      if (user.status === 'suspended') return res.status(403).json({ success: false, message: 'Account is suspended' });
      user.isPhoneVerified = true;
      await user.save();
    }

    await ensureAdminRole(user);
    await updateLoginTracking(user);
    const token = generateToken(user._id);

    res.json({ success: true, token, user: getSafeUser(user), isNewUser: !user.isEmailVerified });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Email Verification ──────────────────────────────────────────

exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    const user = await User.findOne({
      email: email.toLowerCase(),
      emailVerificationCode: hashedCode,
      emailVerificationExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resendVerificationEmail = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isEmailVerified) return res.status(400).json({ success: false, message: 'Email is already verified' });

    const code = setVerificationCode(user);
    await user.save();
    await sendVerificationEmail(user, code);

    res.json({ success: true, message: 'Verification code sent again' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Password Reset ──────────────────────────────────────────────

exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ success: false, message: 'No user with that email' });
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpiry = Date.now() + 30 * 60 * 1000;
    await user.save();
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Vidyarthi Mitra - Password Reset',
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 30 minutes.</p>`
    });
    res.json({ success: true, message: 'Reset email sent' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ resetPasswordToken: hashedToken, resetPasswordExpiry: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();
    const token = generateToken(user._id);
    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Google OAuth ────────────────────────────────────────────────

exports.googleCallback = async (req, res) => {
  if (!req.user.isEmailVerified) {
    req.user.isEmailVerified = true;
    await req.user.save();
  }
  if (req.user.authProvider === 'local' && req.user.googleId) {
    req.user.authProvider = 'google';
    await req.user.save();
  }
  await updateLoginTracking(req.user);
  const token = generateToken(req.user._id);
  res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
};

exports.logout = (req, res) => {
  res.json({ success: true, message: 'Logged out' });
};
