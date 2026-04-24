const crypto = require('crypto');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');

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
  role: user.role,
  avatar: user.avatar,
  isEmailVerified: user.isEmailVerified,
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

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email.toLowerCase();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });
    const role = normalizedEmail === getAdminEmail() ? 'admin' : 'user';
    const user = await User.create({ name, email: normalizedEmail, password, role });
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
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    await ensureAdminRole(user);
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

exports.googleCallback = async (req, res) => {
  if (!req.user.isEmailVerified) {
    req.user.isEmailVerified = true;
    await req.user.save();
  }
  const token = generateToken(req.user._id);
  res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
};

exports.logout = (req, res) => {
  res.json({ success: true, message: 'Logged out' });
};
