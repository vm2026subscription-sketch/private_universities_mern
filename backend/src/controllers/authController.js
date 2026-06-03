const crypto = require('crypto');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const otpService = require('../services/otpService');
const { getSafeUser } = require('../utils/userSerializer');

const ADMIN_EMAIL = 'vidyarthimitrauniversity@gmail.com';
const MIN_PASSWORD_LENGTH = 6;

const getAdminEmail = () => (process.env.ADMIN_EMAIL || ADMIN_EMAIL).toLowerCase();
const getClientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';
const normalizeEmail = (email = '') => String(email).trim().toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isProduction = () => process.env.NODE_ENV === 'production';

const ensureAdminRole = async (user) => {
  if (user?.email?.toLowerCase() === getAdminEmail() && user.role !== 'admin') {
    user.role = 'admin';
    await user.save();
  }
  return user;
};

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
    const normalizedName = String(name || '').trim();
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' });
    }

    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser?.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    if (phone) {
      const phoneExists = await User.findOne({
        phone,
        ...(existingUser ? { _id: { $ne: existingUser._id } } : {}),
      });
      if (phoneExists) return res.status(400).json({ success: false, message: 'Phone number already registered' });
    }

    const role = normalizedEmail === getAdminEmail() ? 'admin' : 'user';
    const userData = {
      name: normalizedName,
      email: normalizedEmail,
      password,
      role,
      authProvider: 'local',
      status: 'active',
      isEmailVerified: false,
      phone: phone || undefined,
      countryCode: phone ? countryCode || '+91' : '+91',
    };

    let user = existingUser;
    if (user && user.authProvider !== 'local') {
      return res.status(400).json({
        success: false,
        message: 'This email is already linked to another sign-in method',
      });
    }

    if (user) {
      user.name = userData.name;
      user.password = userData.password;
      user.role = userData.role;
      user.authProvider = 'local';
      user.status = 'active';
      user.phone = userData.phone;
      user.countryCode = userData.countryCode;
      user.isEmailVerified = false;
    } else {
      user = new User(userData);
    }

    const code = setVerificationCode(user);
    await user.save();

    try {
      await sendVerificationEmail(user, code);
      return res.status(existingUser ? 200 : 201).json({
        success: true,
        requiresVerification: true,
        message: 'Account created. Please verify the OTP sent to your email.',
        email: user.email,
      });
    } catch (emailError) {
      console.error('Signup verification email failed:', emailError.message);

      if (isProduction()) {
        return res.status(500).json({
          success: false,
          message: 'Unable to send verification email. Please try again later.',
        });
      }

      return res.status(existingUser ? 200 : 201).json({
        success: true,
        requiresVerification: true,
        message: 'Email delivery failed in local mode, so use the verification code shown below.',
        email: user.email,
        devVerificationCode: code,
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user || !user.password) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (user.status === 'banned') return res.status(403).json({ success: false, message: 'Account has been banned' });
    if (user.status === 'suspended') return res.status(403).json({ success: false, message: 'Account is suspended' });
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const result = await otpService.sendOtp({
      identifier: user.email,
      type: 'email',
      purpose: 'login',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      requiresOtp: true,
      message: result.message || 'OTP sent to your email',
      email: user.email,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    const statusCode = /too many otp requests/i.test(error.message) ? 429 : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

exports.verifyLoginOtp = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();

    if (!normalizedEmail || !code) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required' });
    }

    const verification = await otpService.verifyOtp(normalizedEmail, code, 'login');
    if (!verification.success) {
      return res.status(400).json({ success: false, message: verification.message });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.status === 'banned') return res.status(403).json({ success: false, message: 'Account has been banned' });
    if (user.status === 'suspended') return res.status(403).json({ success: false, message: 'Account is suspended' });

    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
    }

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

exports.sendOtp = async (req, res) => {
  try {
    const { identifier, type = 'sms', purpose = 'login' } = req.body;
    if (!identifier) return res.status(400).json({ success: false, message: 'Phone number or email is required' });

    const result = await otpService.sendOtp({
      identifier,
      type,
      purpose,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, message: result.message, expiresAt: result.expiresAt });
  } catch (error) {
    const statusCode = /too many otp requests/i.test(error.message) ? 429 : 500;
    res.status(statusCode).json({ success: false, message: error.message });
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
    const isNewUser = !user;

    if (!user) {
      const email = `${phone.replace(/[^0-9]/g, '')}@phone.vidyarthimitra.local`;
      user = await User.create({
        name: name || `User ${phone.slice(-4)}`,
        email,
        phone,
        countryCode: countryCode || '+91',
        isPhoneVerified: true,
        authProvider: 'phone',
        status: 'active',
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
    res.json({ success: true, token, user: getSafeUser(user), isNewUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();

    if (!normalizedEmail || !code) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required' });
    }

    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    const user = await User.findOne({
      email: normalizedEmail,
      emailVerificationCode: hashedCode,
      emailVerificationExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpiry = undefined;
    await ensureAdminRole(user);
    await updateLoginTracking(user);
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Email verified successfully',
      token,
      user: getSafeUser(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resendVerificationEmail = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isEmailVerified) return res.status(400).json({ success: false, message: 'Email is already verified' });

    const code = setVerificationCode(user);
    await user.save();

    try {
      await sendVerificationEmail(user, code);
      res.json({ success: true, message: 'Verification code sent again' });
    } catch (emailError) {
      console.error('Resend verification email failed:', emailError.message);

      if (isProduction()) {
        return res.status(500).json({
          success: false,
          message: 'Unable to resend verification email. Please try again later.',
        });
      }

      return res.json({
        success: true,
        message: 'Email delivery failed in local mode, so use the verification code shown below.',
        devVerificationCode: code,
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpiry = Date.now() + 30 * 60 * 1000;
    await user.save();

    const resetUrl = `${getClientUrl()}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Vidyarthi Mitra - Password Reset',
        html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 30 minutes.</p>`,
      });
    } catch (emailError) {
      console.error('Password reset email failed:', emailError.message);

      if (isProduction()) {
        return res.status(500).json({
          success: false,
          message: 'Could not send reset email. Please try again later.',
        });
      }

      return res.json({
        success: true,
        message: 'Email delivery failed in local mode, so open the reset link below.',
        resetUrl,
      });
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const password = String(req.body.password || '');
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
      });
    }

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    const token = generateToken(user._id);
    res.json({ success: true, token, user: getSafeUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
  res.redirect(`${getClientUrl()}/auth/callback?token=${token}`);
};

exports.logout = (req, res) => {
  res.json({ success: true, message: 'Logged out' });
};
