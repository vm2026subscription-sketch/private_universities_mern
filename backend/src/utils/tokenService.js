/**
 * JWT issuance and verification.
 *
 * Replaces the previous one-line `jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' })`.
 *
 * Hardening applied here:
 *  - Three token types with distinct purposes and a mandatory `typ` claim, so an
 *    access token can never be replayed as a refresh token or an MFA challenge.
 *  - Separate signing secrets for access vs refresh.
 *  - Explicit `algorithms: ['HS256']` on verify. Without it, verification trusts
 *    the algorithm advertised in the attacker-controlled token header.
 *  - `issuer` / `audience` are set on sign and asserted on verify, so tokens
 *    minted by a sibling service (or a different environment sharing a secret)
 *    are rejected.
 *  - `jti` on every token to support revocation and replay detection.
 *  - `tv` (tokenVersion) so password changes, resets, role changes and forced
 *    logout can invalidate every outstanding access token immediately.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getAuthConfig } = require('../config/env');

const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
  MFA: 'mfa',
};

const newJti = () => crypto.randomBytes(16).toString('hex');

/** SHA-256 is appropriate here: refresh JTIs are 128-bit random, not guessable. */
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const baseSignOptions = (config, expiresIn) => ({
  algorithm: 'HS256',
  expiresIn,
  issuer: config.issuer,
  audience: config.audience,
});

const baseVerifyOptions = (config) => ({
  algorithms: ['HS256'],
  issuer: config.issuer,
  audience: config.audience,
  clockTolerance: 5, // seconds, tolerates minor clock skew between hosts
});

/**
 * Short-lived credential presented on every API call.
 * `role` is included for observability only — authorization always re-reads the
 * role from the database record so a demotion takes effect immediately rather
 * than at token expiry.
 */
const signAccessToken = (user) => {
  const config = getAuthConfig();
  return jwt.sign(
    {
      sub: String(user._id),
      typ: TOKEN_TYPES.ACCESS,
      role: user.role,
      tv: user.tokenVersion || 0,
      jti: newJti(),
    },
    config.accessSecret,
    baseSignOptions(config, config.accessTtl)
  );
};

/**
 * Long-lived, single-use, rotated on every exchange. The `jti` is persisted
 * (hashed) server-side so the token can be revoked and reuse can be detected.
 */
const signRefreshToken = (user, jti = newJti()) => {
  const config = getAuthConfig();
  const token = jwt.sign(
    {
      sub: String(user._id),
      typ: TOKEN_TYPES.REFRESH,
      tv: user.tokenVersion || 0,
      jti,
    },
    config.refreshSecret,
    baseSignOptions(config, config.refreshTtl)
  );
  return { token, jti };
};

/**
 * Proof that the password factor succeeded. Required by the OTP step.
 *
 * This is the fix for the most serious authentication flaw in the original
 * design: `/auth/login/verify-otp` accepted `{ email, code }` alone, so a valid
 * OTP was sufficient to log in and the password was never actually required.
 * Binding the OTP step to this token makes the OTP a true SECOND factor.
 */
const signMfaChallengeToken = (user) => {
  const config = getAuthConfig();
  return jwt.sign(
    {
      sub: String(user._id),
      typ: TOKEN_TYPES.MFA,
      amr: ['pwd'],
      jti: newJti(),
    },
    // Signed with a DEDICATED key, not the access secret. Sharing the access
    // secret made this token replayable as a Bearer credential through the
    // legacy-verification path, which authenticated the caller on the password
    // factor alone and skipped the OTP.
    config.mfaSecret,
    baseSignOptions(config, config.mfaTtl)
  );
};

const verifyWithType = (token, secret, expectedType) => {
  const config = getAuthConfig();
  const payload = jwt.verify(token, secret, baseVerifyOptions(config));

  if (payload.typ !== expectedType) {
    const error = new Error(`Expected a ${expectedType} token`);
    error.name = 'JsonWebTokenError';
    throw error;
  }

  return payload;
};

const verifyAccessToken = (token) =>
  verifyWithType(token, getAuthConfig().accessSecret, TOKEN_TYPES.ACCESS);

const verifyRefreshToken = (token) =>
  verifyWithType(token, getAuthConfig().refreshSecret, TOKEN_TYPES.REFRESH);

const verifyMfaChallengeToken = (token) =>
  verifyWithType(token, getAuthConfig().mfaSecret, TOKEN_TYPES.MFA);

/**
 * Backward compatibility only.
 *
 * Tokens minted before this refactor look like `{ id, iat, exp }`, are signed
 * with JWT_SECRET and carry no issuer/audience/typ claims. Rejecting them at
 * deploy time would forcibly log out every active user, so we accept them for a
 * migration window while still pinning the algorithm.
 *
 * Returns a normalised payload, or null when legacy acceptance is disabled.
 */
const verifyLegacyToken = (token) => {
  const config = getAuthConfig();
  if (!config.allowLegacyTokens || !config.legacySecret) return null;

  const payload = jwt.verify(token, config.legacySecret, {
    algorithms: ['HS256'],
    clockTolerance: 5,
  });

  /**
   * A genuine pre-refactor token has payload `{ id, iat, exp }` and NOTHING
   * else — no `typ`, no `iss`, no `aud`.
   *
   * This check is load-bearing. JWT_SECRET is also the fallback for the access
   * secret, so without it any modern token signed with that key (notably an MFA
   * challenge, which is handed out after the password step but BEFORE the OTP)
   * would be accepted here as a full access token, bypassing the second factor.
   * Anything carrying a modern claim is not a legacy token and must be rejected.
   */
  if (payload.typ !== undefined || payload.iss !== undefined || payload.aud !== undefined) {
    return null;
  }

  // Legacy tokens carry `id`; `sub` was never used before the refactor.
  if (!payload.id) return null;

  return {
    sub: String(payload.id),
    typ: TOKEN_TYPES.ACCESS,
    legacy: true,
    iat: payload.iat,
  };
};

const getRefreshTokenExpiry = () => {
  const config = getAuthConfig();
  // jsonwebtoken accepts strings like '30d'; decode the signed token to get the
  // authoritative exp rather than re-parsing the duration string ourselves.
  const probe = jwt.sign({ typ: 'probe' }, config.refreshSecret, {
    algorithm: 'HS256',
    expiresIn: config.refreshTtl,
  });
  const { exp } = jwt.decode(probe);
  return new Date(exp * 1000);
};

module.exports = {
  TOKEN_TYPES,
  signAccessToken,
  signRefreshToken,
  signMfaChallengeToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyMfaChallengeToken,
  verifyLegacyToken,
  getRefreshTokenExpiry,
  hashToken,
};
