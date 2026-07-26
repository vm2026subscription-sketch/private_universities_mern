/**
 * Tiered rate limiters for authentication and public-form endpoints.
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

/* ── Public, unauthenticated write endpoints ──────────────────────────────────
 *
 * These three (contact, lead, newsletter) accept anonymous submissions that land
 * in collections an admin then reads, and a lead additionally represents a
 * billable event for a sponsoring university. Only the very loose global
 * 1000/15m limiter applied before, which is enough headroom for a script to
 * insert tens of thousands of junk rows — poisoning the leads CSV that partners
 * are invoiced against.
 *
 * Budgets are per-IP and sized well above real human use: a student fills the
 * contact form once, and requests brochures from a handful of universities.
 */

/** Contact form. */
const contactLimiter = build({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many messages sent from this network. Please try again later.',
});

/** Lead capture (Apply / Download brochure) — a student may submit several. */
const leadLimiter = build({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: 'Too many requests submitted. Please try again in a little while.',
});

/** Newsletter subscribe / unsubscribe. */
const newsletterLimiter = build({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many subscription requests. Please try again later.',
});

/**
 * AI assist (/questions/assist) — public, and every call costs a Gemini request
 * against a quota measured in tens per day on the free tier. Without a limiter a
 * single client can exhaust the quota and take the chat widget down for everyone.
 * 60/hour is far above conversational use and far below scripted abuse.
 */
const aiAssistLimiter = build({
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: 'You have reached the AI assistant limit for now. Please try again in a little while.',
});

module.exports = {
  loginLimiter,
  otpVerifyLimiter,
  otpSendLimiter,
  registerLimiter,
  passwordResetLimiter,
  refreshLimiter,
  contactLimiter,
  leadLimiter,
  newsletterLimiter,
  aiAssistLimiter,
};
