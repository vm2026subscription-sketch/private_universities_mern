/**
 * Tiered rate limiters for authentication endpoints.
 *
 * The original setup had a single 30-per-15-minutes limiter shared across every
 * auth route plus a very loose global 1000/15m. That is too coarse: OTP
 * verification (a 6-digit guessing target) and password login (credential
 * stuffing) need tighter, independent budgets than, say, resending an email.
 *
 * These are per-IP. They complement — and do not replace — the per-account
 * lockout in the login controller and the per-code attempt budget in the OTP
 * service, which are the controls that survive a distributed source.
 */

const rateLimit = require('express-rate-limit');

const build = ({ windowMs, max, message, skipSuccessfulRequests = false }) =>
  rateLimit({
    windowMs,
    max,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
  });

/** Password submission. Successful logins are not counted. */
const loginLimiter = build({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
});

/** OTP / verification-code submission — the tightest budget. */
const otpVerifyLimiter = build({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: 'Too many verification attempts. Please request a new code.',
});

/** Endpoints that trigger an outbound email or SMS (cost + abuse surface). */
const otpSendLimiter = build({
  windowMs: 60 * 60 * 1000,
  max: 8,
  message: 'Too many verification requests. Please try again later.',
});

/** Account creation. */
const registerLimiter = build({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many accounts created from this network. Please try again later.',
});

/** Password reset request/completion. */
const passwordResetLimiter = build({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many password reset attempts. Please try again later.',
});

/** Token refresh — generous, since a normal client refreshes on a timer. */
const refreshLimiter = build({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Too many refresh attempts. Please sign in again.',
});

module.exports = {
  loginLimiter,
  otpVerifyLimiter,
  otpSendLimiter,
  registerLimiter,
  passwordResetLimiter,
  refreshLimiter,
};
