/**
 * Authentication controller.
 *
 * Security model (rewritten):
 *  - Roles come exclusively from the database record. There is no hardcoded
 *    admin email and no runtime promotion based on the email address.
 *  - Every account, regardless of role, completes the same two-factor login:
 *    password -> short-lived MFA challenge token -> OTP. Admins no longer skip
 *    the second factor.
 *  - The OTP step is bound to the password step by the MFA challenge token, so
 *    possession of an OTP alone can never authenticate a user.
 *  - Short-lived access tokens plus rotating refresh tokens replace the previous
 *    unrevocable 30-day bearer token.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const otpService = require('../services/otpService');
const { getSafeUser } = require('../utils/userSerializer');
const { logAction } = require('../services/auditService');
const { isDevEchoEnabled, isProduction, getAuthConfig } = require('../config/env');
const {
  signAccessToken,
  signMfaChallengeToken,
  verifyMfaChallengeToken,
} = require('../utils/tokenService');
const {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
} = require('../services/refreshTokenService');

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;
const REFRESH_COOKIE = 'vm_refresh';

/**
 * A precomputed hash used to equalise response time when the account does not
 * exist. Without it, login returns noticeably faster for unknown emails than for
 * known ones, which is a reliable account-enumeration oracle.
 */
const DUMMY_HASH = bcrypt.hashSync('vidyarthi-mitra-timing-equalizer', 12);

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const getClientUrl = () =>
  (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();

/** Uniform message for every credential failure — never reveals which part failed. */
const INVALID_CREDENTIALS = 'Invalid email or password';

const fail = (res, status, message) => res.status(status).json({ success: false, message });

/**
 * Rejects passwords that are too short, absurdly long (bcrypt truncates at 72
 * bytes, and unbounded input is a CPU-exhaustion vector), or trivially guessable.
 */
const WEAK_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwerty123', 'iloveyou', 'admin123', 'welcome1', 'welcome123', 'letmein1',
  'abc12345', 'passw0rd', 'p@ssw0rd', 'vidyarthi', 'vidyarthimitra',
]);

const validatePassword = (password, { name, email } = {}) => {
  const value = String(password || '');

  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`;
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters long`;
  }
  if (WEAK_PASSWORDS.has(value.toLowerCase())) {
    return 'That password is too common. Please choose a less predictable one.';
  }
  const localPart = normalizeEmail(email).split('@')[0];
  if (localPart && localPart.length >= 4 && value.toLowerCase().includes(localPart)) {
    return 'Password must not contain your email address';
  }
  if (name && String(name).trim().length >= 4 && value.toLowerCase().includes(String(name).trim().toLowerCase())) {
    return 'Password must not contain your name';
  }
  return null;
};

const MAX_EMAIL_CODE_ATTEMPTS = 5;

/**
 * Email verification codes.
 *
 * Generated with the OS CSPRNG (not Math.random) and stored under a keyed HMAC
 * rather than bare SHA-256. The plaintext space is only 10^6, so an unkeyed
 * digest is invertible by a precomputed table if the database leaks — the same
 * reasoning already applied to OTP storage in otpService.
 */
const hashEmailCode = (code) =>
  crypto
    .createHmac('sha256', process.env.OTP_PEPPER || getAuthConfig().accessSecret)
    .update(String(code))
    .digest('hex');

const setVerificationCode = (user) => {
  const code = String(crypto.randomInt(100000, 1000000));
  user.emailVerificationCode = hashEmailCode(code);
  user.emailVerificationExpiry = Date.now() + 10 * 60 * 1000;
  user.emailVerificationAttempts = 0;
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
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();
};

const isAccountUsable = (user) => user.status !== 'banned' && user.status !== 'suspended';

/**
 * Issues an access token plus a rotating refresh token.
 *
 * The refresh token is set as an httpOnly cookie (inaccessible to JavaScript, so
 * an XSS cannot exfiltrate it) AND returned in the body for the existing
 * localStorage-based client. Cookie-only would be strictly better; the body copy
 * is a backward-compatibility concession documented in the security report.
 */
/**
 * Cookie flags key off `isProduction()`, which is true unless a development
 * environment was declared explicitly. Testing `NODE_ENV === 'production'`
 * instead would silently drop `Secure` whenever NODE_ENV is unset — a common
 * deploy state — allowing the refresh cookie over plaintext HTTP.
 */
const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: isProduction() ? 'none' : 'lax',
  path: '/api/v1/auth',
});

const setRefreshCookie = (res, refreshToken) => {
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...refreshCookieOptions(),
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

const issueSession = async (user, req, res) => {
  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user, req);

  setRefreshCookie(res, refreshToken);

  return { token: accessToken, refreshToken };
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
};

// Exported so other controllers that re-issue a session (e.g. changePassword)
// keep the cookie in sync with the token they hand back. A stale cookie would
// win over the fresh body token on the next refresh, trip reuse detection and
// forcibly log the user out.
exports.setRefreshCookie = setRefreshCookie;
exports.REFRESH_COOKIE = REFRESH_COOKIE;

const auditAuthEvent = (user, action, description, req) =>
  logAction({
    userId: user._id,
    action,
    resource: 'auth',
    resourceId: user._id,
    description,
    req,
  });

/* ────────────────────────────────────────────────────────────────────────── */
/* Registration                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, countryCode } = req.body;
    const normalizedName = String(name || '').trim();
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedName || !normalizedEmail || !password) {
      return fail(res, 400, 'Name, email, and password are required');
    }
    if (!isValidEmail(normalizedEmail)) {
      return fail(res, 400, 'Enter a valid email address');
    }

    const passwordError = validatePassword(password, { name: normalizedName, email: normalizedEmail });
    if (passwordError) return fail(res, 400, passwordError);

    const existingUser = await User.findOne({ email: normalizedEmail });

    // A verified account already owns this address. The generic response avoids
    // confirming registration status to an unauthenticated caller.
    if (existingUser?.isEmailVerified) {
      return res.status(200).json({
        success: true,
        requiresVerification: true,
        message: 'If this email can be registered, a verification code has been sent.',
        email: normalizedEmail,
      });
    }

    if (existingUser && existingUser.authProvider !== 'local') {
      return fail(res, 400, 'This email is already linked to another sign-in method');
    }

    if (phone) {
      const phoneExists = await User.findOne({
        phone,
        ...(existingUser ? { _id: { $ne: existingUser._id } } : {}),
      });
      if (phoneExists) return fail(res, 400, 'Phone number already registered');
    }

    // NOTE: role is deliberately NOT derived from the email address, and
    // isEmailVerified is never pre-set. Both were the mechanism by which the
    // previous implementation handed out an admin token to an unauthenticated
    // caller. New accounts are always `user` and always unverified.
    const userData = {
      name: normalizedName,
      email: normalizedEmail,
      password,
      authProvider: 'local',
      status: 'active',
      isEmailVerified: false,
      phone: phone || undefined,
      countryCode: phone ? countryCode || '+91' : '+91',
    };

    let user = existingUser;
    if (user) {
      // Re-registration over an UNVERIFIED account is permitted so a user who
      // never received their code can retry. It cannot take over a real account
      // because verified addresses are handled above and no token is issued here.
      user.name = userData.name;
      user.password = userData.password;
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
      // Always 200, never 201: a differing status code between "new account"
      // and "re-registration over an existing unverified account" is an
      // account-enumeration oracle even when the message text is identical.
      return res.status(200).json({
        success: true,
        requiresVerification: true,
        message: 'Account created. Please verify the OTP sent to your email.',
        email: user.email,
      });
    } catch (emailError) {
      console.error('Signup verification email failed:', emailError.message);

      // Echoing the code back requires an explicit opt-in AND an explicitly
      // declared development environment, so an unset NODE_ENV cannot enable it.
      if (!isDevEchoEnabled()) {
        return fail(res, 500, 'Unable to send verification email. Please try again later.');
      }

      return res.status(200).json({
        success: true,
        requiresVerification: true,
        message: 'Email delivery failed in local mode, so use the verification code shown below.',
        email: user.email,
        devVerificationCode: code,
      });
    }
  } catch (error) {
    console.error('[auth] register failed:', error);
    return fail(res, 500, 'Registration failed. Please try again.');
  }
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Login — step 1: password                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

exports.login = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!normalizedEmail || !password) {
      return fail(res, 400, 'Email and password are required');
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+password +failedLoginAttempts +lockUntil'
    );

    // Always spend the cost of a bcrypt comparison, even for unknown accounts,
    // so response timing does not distinguish "no such user" from "wrong password".
    if (!user || !user.password) {
      await bcrypt.compare(password, DUMMY_HASH);
      return fail(res, 401, INVALID_CREDENTIALS);
    }

    if (user.isLocked()) {
      return fail(
        res,
        429,
        `Too many failed attempts. Please try again in ${LOCKOUT_MINUTES} minutes.`
      );
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_FAILED_LOGINS) {
        user.lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      return fail(res, 401, INVALID_CREDENTIALS);
    }

    // Status and verification are checked only AFTER the password is proven, so
    // an attacker cannot probe account state without valid credentials.
    if (!isAccountUsable(user)) {
      return fail(res, 403, 'This account is not able to sign in. Please contact support.');
    }
    if (!user.isEmailVerified) {
      return fail(res, 403, 'Please verify your email before logging in');
    }

    // Transparently upgrade the stored hash when the configured cost factor has
    // been raised since this password was last set.
    if (user.needsPasswordRehash()) {
      user.password = password;
    }
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // ── Uniform second factor ────────────────────────────────────────────────
    // Every role takes this path. The previous implementation returned a token
    // here for admin/superadmin, giving the highest-privilege accounts the
    // weakest authentication in the system.
    const result = await otpService.sendOtp({
      identifier: user.email,
      type: 'email',
      purpose: 'login',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      success: true,
      requiresOtp: true,
      // Proof the password factor succeeded. Required by /login/verify-otp.
      mfaToken: signMfaChallengeToken(user),
      message: result.message || 'OTP sent to your email',
      email: user.email,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    if (/too many otp requests/i.test(error.message)) {
      return fail(res, 429, 'Too many verification requests. Please try again later.');
    }
    console.error('[auth] login failed:', error);
    return fail(res, 500, 'Login failed. Please try again.');
  }
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Login — step 2: OTP                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

exports.verifyLoginOtp = async (req, res) => {
  try {
    const code = String(req.body.code || '').trim();
    const mfaToken = String(req.body.mfaToken || '').trim();

    if (!mfaToken) {
      // Without this binding, a valid OTP alone would authenticate — which is
      // exactly how the previous implementation could be used to bypass the
      // password entirely.
      return fail(res, 400, 'Your sign-in session has expired. Please enter your password again.');
    }
    if (!code) return fail(res, 400, 'OTP code is required');

    let challenge;
    try {
      challenge = verifyMfaChallengeToken(mfaToken);
    } catch {
      return fail(res, 401, 'Your sign-in session has expired. Please enter your password again.');
    }

    const user = await User.findById(challenge.sub);
    if (!user) return fail(res, 401, 'Your sign-in session has expired. Please enter your password again.');
    if (!isAccountUsable(user)) {
      return fail(res, 403, 'This account is not able to sign in. Please contact support.');
    }

    // The OTP is looked up against the account resolved from the challenge
    // token, never against a client-supplied email.
    const verification = await otpService.verifyOtp(user.email, code, 'login');
    if (!verification.success) {
      return fail(res, 400, verification.message);
    }

    await updateLoginTracking(user);
    const { token, refreshToken } = await issueSession(user, req, res);
    await auditAuthEvent(user, 'login', 'Password + OTP login', req);

    return res.json({ success: true, token, refreshToken, user: getSafeUser(user) });
  } catch (error) {
    console.error('[auth] verifyLoginOtp failed:', error);
    return fail(res, 500, 'Could not complete sign-in. Please try again.');
  }
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Session lifecycle                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

exports.getMe = async (req, res) => {
  // Note: no ensureAdminRole side effect. This endpoint is now a pure read;
  // previously it performed a database write on every profile fetch.
  res.json({ success: true, user: getSafeUser(req.user) });
};

/**
 * Exchanges a refresh token for a new access token, rotating the refresh token.
 * Accepts the httpOnly cookie first, falling back to the request body for the
 * localStorage-based client.
 */
exports.refresh = async (req, res) => {
  try {
    const presented = req.cookies?.[REFRESH_COOKIE] || String(req.body?.refreshToken || '').trim();
    if (!presented) return fail(res, 401, 'Session expired. Please sign in again.');

    const { user, token: newRefreshToken } = await rotateRefreshToken(
      presented,
      req,
      (id) => User.findById(id)
    );

    res.cookie(REFRESH_COOKIE, newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/api/v1/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      token: signAccessToken(user),
      refreshToken: newRefreshToken,
      user: getSafeUser(user),
    });
  } catch (error) {
    clearRefreshCookie(res);
    return fail(res, error.statusCode || 401, error.message || 'Session expired. Please sign in again.');
  }
};

/**
 * Logout now actually revokes the session. Previously it returned success while
 * the 30-day bearer token remained fully valid.
 */
exports.logout = async (req, res) => {
  try {
    const presented = req.cookies?.[REFRESH_COOKIE] || String(req.body?.refreshToken || '').trim();
    await revokeRefreshToken(presented, 'logout');
    clearRefreshCookie(res);

    if (req.user) await auditAuthEvent(req.user, 'logout', 'User logged out', req);

    return res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    console.error('[auth] logout failed:', error);
    clearRefreshCookie(res);
    return res.json({ success: true, message: 'Logged out' });
  }
};

/** Revokes every session for the current user across all devices. */
exports.logoutAll = async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
    await revokeAllForUser(req.user._id, 'logout_all');
    clearRefreshCookie(res);
    await auditAuthEvent(req.user, 'logout', 'User logged out of all devices', req);

    return res.json({ success: true, message: 'Signed out of all devices' });
  } catch (error) {
    console.error('[auth] logoutAll failed:', error);
    return fail(res, 500, 'Could not sign out of all devices.');
  }
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Phone OTP                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Sends a verification OTP to a phone number.
 *
 * Hardened: `purpose` is no longer taken from the request body. Previously a
 * caller could request `purpose: 'login'` for an arbitrary identifier, which —
 * combined with the unbound OTP login step — allowed authenticating as another
 * user without their password. Login OTPs can now only be minted by the
 * password step in `login()`.
 */
exports.sendOtp = async (req, res) => {
  try {
    const { identifier, type = 'sms' } = req.body;
    if (!identifier) return fail(res, 400, 'Phone number is required');

    if (!['sms', 'whatsapp'].includes(type)) {
      return fail(res, 400, 'Unsupported delivery channel');
    }
    if (!/^\+?[0-9]{8,15}$/.test(String(identifier).trim())) {
      return fail(res, 400, 'Enter a valid phone number');
    }

    const result = await otpService.sendOtp({
      identifier: String(identifier).trim(),
      type,
      purpose: 'verify',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ success: true, message: result.message, expiresAt: result.expiresAt });
  } catch (error) {
    if (/too many otp requests/i.test(error.message)) {
      return fail(res, 429, 'Too many verification requests. Please try again later.');
    }
    console.error('[auth] sendOtp failed:', error);
    return fail(res, 500, 'Could not send verification code.');
  }
};

exports.verifyPhoneOtp = async (req, res) => {
  try {
    const { phone, code, name, countryCode } = req.body;
    if (!phone || !code) return fail(res, 400, 'Phone and OTP code are required');

    const normalizedPhone = String(phone).trim();
    const verification = await otpService.verifyOtp(normalizedPhone, code, 'verify');
    if (!verification.success) {
      return fail(res, 400, verification.message);
    }

    let user = await User.findOne({ phone: normalizedPhone }).select('+password');
    const isNewUser = !user;

    if (!user) {
      const email = `${normalizedPhone.replace(/[^0-9]/g, '')}@phone.vidyarthimitra.local`;
      user = await User.create({
        name: name || `User ${normalizedPhone.slice(-4)}`,
        email,
        phone: normalizedPhone,
        countryCode: countryCode || '+91',
        isPhoneVerified: true,
        authProvider: 'phone',
        status: 'active',
        // role intentionally omitted -> schema default 'user'
      });
    } else {
      if (!isAccountUsable(user)) {
        return fail(res, 403, 'This account is not able to sign in. Please contact support.');
      }

      /**
       * This endpoint authenticates on possession of a phone number alone — no
       * password, no email OTP. That is acceptable ONLY for accounts that have
       * no stronger credential to begin with (phone-native signups).
       *
       * Allowing it for password or Google accounts would make it a complete
       * bypass of the two-factor flow: anyone who recorded a phone number at
       * registration could be taken over via SIM swap or SS7 interception, and
       * a privileged account could be compromised without ever touching the
       * password. Privileged roles are excluded outright.
       */
      if (user.role !== 'user') {
        return fail(res, 403, 'This account must sign in with its email address and password.');
      }
      if (user.password || user.authProvider !== 'phone') {
        return fail(res, 403, 'This account must sign in with its email address and password.');
      }

      user.isPhoneVerified = true;
      await user.save();
    }

    await updateLoginTracking(user);
    const { token, refreshToken } = await issueSession(user, req, res);
    await auditAuthEvent(user, 'login', 'Phone OTP login', req);

    return res.json({ success: true, token, refreshToken, user: getSafeUser(user), isNewUser });
  } catch (error) {
    console.error('[auth] verifyPhoneOtp failed:', error);
    return fail(res, 500, 'Could not complete verification.');
  }
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Email verification                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

exports.verifyEmail = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();

    if (!normalizedEmail || !code) {
      return fail(res, 400, 'Email and verification code are required');
    }
    if (!/^\d{6}$/.test(code)) {
      return fail(res, 400, 'Invalid or expired verification code');
    }

    const invalidCode = 'Invalid or expired verification code';

    // Load by email (not by code hash) so a wrong guess can be counted against
    // a per-account budget instead of silently returning "not found" forever.
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+emailVerificationCode +emailVerificationExpiry +emailVerificationAttempts'
    );

    if (!user || !user.emailVerificationCode || !user.emailVerificationExpiry) {
      return fail(res, 400, invalidCode);
    }
    if (user.emailVerificationExpiry.getTime() <= Date.now()) {
      return fail(res, 400, invalidCode);
    }
    if ((user.emailVerificationAttempts || 0) >= MAX_EMAIL_CODE_ATTEMPTS) {
      return fail(res, 429, 'Too many incorrect attempts. Please request a new verification code.');
    }

    const candidate = Buffer.from(hashEmailCode(code), 'hex');
    const expected = Buffer.from(user.emailVerificationCode, 'hex');
    const matches =
      candidate.length === expected.length &&
      expected.length > 0 &&
      crypto.timingSafeEqual(candidate, expected);

    if (!matches) {
      user.emailVerificationAttempts = (user.emailVerificationAttempts || 0) + 1;
      // Burn the code once the budget is exhausted so it cannot be ground down.
      if (user.emailVerificationAttempts >= MAX_EMAIL_CODE_ATTEMPTS) {
        user.emailVerificationCode = undefined;
        user.emailVerificationExpiry = undefined;
      }
      await user.save();
      return fail(res, 400, invalidCode);
    }

    if (!isAccountUsable(user)) {
      return fail(res, 403, 'This account is not able to sign in. Please contact support.');
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpiry = undefined;
    user.emailVerificationAttempts = 0;
    await updateLoginTracking(user);

    const { token, refreshToken } = await issueSession(user, req, res);
    await auditAuthEvent(user, 'login', 'Email verification login', req);

    return res.json({
      success: true,
      message: 'Email verified successfully',
      token,
      refreshToken,
      user: getSafeUser(user),
    });
  } catch (error) {
    console.error('[auth] verifyEmail failed:', error);
    return fail(res, 500, 'Could not verify email.');
  }
};

exports.resendVerificationEmail = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    if (!normalizedEmail) return fail(res, 400, 'Email is required');

    const user = await User.findOne({ email: normalizedEmail });

    // Uniform response regardless of whether the account exists or is already
    // verified, so this endpoint cannot be used to enumerate registered emails.
    const genericResponse = {
      success: true,
      message: 'If this email needs verification, a new code has been sent.',
    };

    if (!user || user.isEmailVerified || !isAccountUsable(user)) {
      return res.json(genericResponse);
    }

    const code = setVerificationCode(user);
    await user.save();

    try {
      await sendVerificationEmail(user, code);
      return res.json(genericResponse);
    } catch (emailError) {
      console.error('Resend verification email failed:', emailError.message);

      if (!isDevEchoEnabled()) {
        return fail(res, 500, 'Unable to resend verification email. Please try again later.');
      }

      return res.json({
        ...genericResponse,
        message: 'Email delivery failed in local mode, so use the verification code shown below.',
        devVerificationCode: code,
      });
    }
  } catch (error) {
    console.error('[auth] resendVerificationEmail failed:', error);
    return fail(res, 500, 'Could not resend verification code.');
  }
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Password reset                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

exports.forgotPassword = async (req, res) => {
  const genericResponse = {
    success: true,
    message: 'If an account with that email exists, a reset link has been sent.',
  };

  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return fail(res, 400, 'Enter a valid email address');
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !isAccountUsable(user)) return res.json(genericResponse);

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

      // Returning the reset URL is an account-takeover primitive if it ever
      // fires outside local development, so it requires the explicit opt-in.
      if (!isDevEchoEnabled()) {
        return fail(res, 500, 'Could not send reset email. Please try again later.');
      }

      return res.json({
        ...genericResponse,
        message: 'Email delivery failed in local mode, so open the reset link below.',
        resetUrl,
      });
    }

    return res.json(genericResponse);
  } catch (error) {
    console.error('[auth] forgotPassword failed:', error);
    return res.json(genericResponse);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const password = String(req.body.password || '');
    const rawToken = String(req.params.token || '');

    if (!rawToken) return fail(res, 400, 'Invalid or expired token');

    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) return fail(res, 400, 'Invalid or expired token');
    if (!isAccountUsable(user)) {
      return fail(res, 403, 'This account is not able to sign in. Please contact support.');
    }

    const passwordError = validatePassword(password, { name: user.name, email: user.email });
    if (passwordError) return fail(res, 400, passwordError);

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;

    // Invalidate every session that existed before the reset. A password reset
    // is the primary remedy for a compromised account, so leaving previously
    // issued tokens valid (as the old code did) defeats its purpose.
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await revokeAllForUser(user._id, 'password_reset');

    const { token, refreshToken } = await issueSession(user, req, res);
    await auditAuthEvent(user, 'login', 'Password reset completed', req);

    return res.json({ success: true, token, refreshToken, user: getSafeUser(user) });
  } catch (error) {
    console.error('[auth] resetPassword failed:', error);
    return fail(res, 500, 'Could not reset password.');
  }
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Google OAuth                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * One-time exchange codes for the OAuth redirect.
 *
 * The previous implementation redirected to `/auth/callback?token=<JWT>`, which
 * leaks the credential into browser history, `Referer` headers sent to any
 * third-party resource on the callback page, and every proxy/CDN access log.
 * We now redirect with a short-lived single-use code that the SPA exchanges for
 * tokens over POST.
 *
 * Held in memory: acceptable because codes live for 60 seconds and a lost code
 * merely forces the user to retry sign-in. Move to Redis if the API is ever run
 * as more than one process.
 */
const oauthExchangeCodes = new Map();
const OAUTH_CODE_TTL_MS = 60 * 1000;

const createExchangeCode = (userId) => {
  const code = crypto.randomBytes(32).toString('base64url');
  oauthExchangeCodes.set(code, { userId: String(userId), expiresAt: Date.now() + OAUTH_CODE_TTL_MS });
  return code;
};

const consumeExchangeCode = (code) => {
  const entry = oauthExchangeCodes.get(code);
  if (!entry) return null;
  oauthExchangeCodes.delete(code); // single use, even if expired
  if (entry.expiresAt < Date.now()) return null;
  return entry.userId;
};

// Opportunistic sweep so abandoned codes cannot accumulate.
setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of oauthExchangeCodes) {
    if (entry.expiresAt < now) oauthExchangeCodes.delete(code);
  }
}, OAUTH_CODE_TTL_MS).unref();

exports.googleCallback = async (req, res) => {
  try {
    if (!isAccountUsable(req.user)) {
      return res.redirect(`${getClientUrl()}/auth/callback?error=account_unavailable`);
    }

    if (!req.user.isEmailVerified) {
      req.user.isEmailVerified = true;
      await req.user.save();
    }

    if (req.user.authProvider === 'local' && req.user.googleId) {
      req.user.authProvider = 'google';
      await req.user.save();
    }

    await updateLoginTracking(req.user);
    const code = createExchangeCode(req.user._id);

    return res.redirect(`${getClientUrl()}/auth/callback?code=${encodeURIComponent(code)}`);
  } catch (error) {
    console.error('[auth] googleCallback failed:', error);
    return res.redirect(`${getClientUrl()}/auth/callback?error=google_auth_failed`);
  }
};

exports.googleExchange = async (req, res) => {
  try {
    const code = String(req.body.code || '').trim();
    if (!code) return fail(res, 400, 'Missing authorization code');

    const userId = consumeExchangeCode(code);
    if (!userId) return fail(res, 401, 'This sign-in link has expired. Please try again.');

    const user = await User.findById(userId);
    if (!user || !isAccountUsable(user)) {
      return fail(res, 401, 'This sign-in link has expired. Please try again.');
    }

    const { token, refreshToken } = await issueSession(user, req, res);
    await auditAuthEvent(user, 'login', 'Google OAuth login', req);

    return res.json({ success: true, token, refreshToken, user: getSafeUser(user) });
  } catch (error) {
    console.error('[auth] googleExchange failed:', error);
    return fail(res, 500, 'Could not complete Google sign-in.');
  }
};
