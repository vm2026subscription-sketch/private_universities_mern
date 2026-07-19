/**
 * Centralised, fail-fast environment configuration for security-critical settings.
 *
 * Rationale: the previous implementation read `process.env.JWT_SECRET` inline at
 * every call site with no validation. A deploy that shipped the placeholder from
 * .env.example (`your_jwt_secret_here`) — or omitted the variable entirely —
 * would either crash at request time or, worse, sign tokens with a publicly
 * known secret. Both failure modes are silent until exploited.
 *
 * This module validates once at startup and throws before the server binds a
 * port, so a misconfigured deploy fails loudly instead of running insecurely.
 */

const PLACEHOLDER_SECRETS = new Set([
  'your_jwt_secret_here',
  'your_jwt_access_secret_here',
  'your_jwt_refresh_secret_here',
  'secret',
  'jwtsecret',
  'changeme',
  'change_me',
  'todo',
]);

const MIN_SECRET_LENGTH = 32;

/**
 * Development must be declared EXPLICITLY.
 *
 * Every security decision below keys off this rather than off
 * `NODE_ENV === 'production'`. That distinction matters: NODE_ENV is frequently
 * unset in real deploys, and an `=== 'production'` test silently downgrades
 * cookie flags, HSTS and secret-strength enforcement when it is. Requiring an
 * explicit opt-in to relaxed behaviour makes an unset NODE_ENV fail CLOSED
 * (treated as production) instead of open.
 */
const isExplicitlyDevelopment = () =>
  ['development', 'dev', 'test', 'local'].includes(String(process.env.NODE_ENV || '').toLowerCase());

/** True unless the operator explicitly declared a development environment. */
const isProduction = () => !isExplicitlyDevelopment();

/** Kept for callers that need the literal check (e.g. verbose logging). */
const isDeclaredProduction = () => String(process.env.NODE_ENV || '').toLowerCase() === 'production';

/**
 * Dev-only conveniences (echoing OTP codes / reset links in API responses) must
 * never activate implicitly: the operator has to opt in explicitly AND have
 * declared a development environment.
 */
const isDevEchoEnabled = () =>
  isExplicitlyDevelopment() && process.env.ALLOW_DEV_OTP_ECHO === 'true';

const assertStrongSecret = (name, value, { required }) => {
  if (!value) {
    if (required) {
      throw new Error(
        `[config] ${name} is not set. Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
      );
    }
    return null;
  }

  const normalized = String(value).trim();

  if (PLACEHOLDER_SECRETS.has(normalized.toLowerCase())) {
    throw new Error(`[config] ${name} is set to a well-known placeholder value. Replace it with a random secret.`);
  }

  if (normalized.length < MIN_SECRET_LENGTH) {
    const message = `[config] ${name} is only ${normalized.length} characters; at least ${MIN_SECRET_LENGTH} are required for HS256.`;
    // In production this is fatal. In development we warn so local setups with a
    // short throwaway secret keep working, but the operator still sees the risk.
    if (isProduction()) throw new Error(message);
    console.warn(`${message} (allowed in development only)`);
  }

  return normalized;
};

const parseDuration = (value, fallback) => {
  const normalized = String(value || '').trim();
  return normalized || fallback;
};

const buildAuthConfig = () => {
  const legacySecret = process.env.JWT_SECRET;

  // Backward compatibility: existing deployments only define JWT_SECRET. Rather
  // than break them, derive the access secret from it while still allowing a
  // clean split via the dedicated variables.
  const accessSecret = assertStrongSecret(
    'JWT_ACCESS_SECRET (or JWT_SECRET)',
    process.env.JWT_ACCESS_SECRET || legacySecret,
    { required: true }
  );

  const crypto = require('crypto');

  /**
   * Derives a distinct, domain-separated key from the access secret.
   *
   * Used when a dedicated secret is not configured. HMAC with a fixed label
   * yields a key that is computationally independent of the others, which is
   * what the token-type separation actually depends on: a token signed for one
   * purpose cannot verify against another purpose's key.
   */
  const deriveSecret = (label) =>
    crypto.createHmac('sha256', accessSecret).update(label).digest('base64url');

  // Refresh tokens MUST NOT share a secret with access tokens: if they did, a
  // leaked access token could be replayed as a refresh token (and vice versa)
  // whenever a `typ` check was bypassed.
  let refreshSecret = assertStrongSecret(
    'JWT_REFRESH_SECRET',
    process.env.JWT_REFRESH_SECRET,
    { required: false }
  );

  if (!refreshSecret) {
    refreshSecret = deriveSecret('vm:refresh-token:v1');
    if (isProduction()) {
      console.warn(
        '[config] JWT_REFRESH_SECRET is not set; derived it from the access secret. ' +
        'Set it to an independent random value.'
      );
    }
  }

  /**
   * MFA challenge tokens get their OWN key.
   *
   * They previously shared the access secret. Because the legacy-token fallback
   * verifies against JWT_SECRET without asserting `typ`, and because
   * accessSecret falls back to JWT_SECRET, an MFA challenge issued after the
   * password step could be replayed as a Bearer access token — authenticating
   * the caller with the password alone and skipping the OTP entirely.
   * A separate key makes that replay cryptographically impossible regardless of
   * how any downstream claim check behaves.
   */
  let mfaSecret = assertStrongSecret('JWT_MFA_SECRET', process.env.JWT_MFA_SECRET, { required: false });
  if (!mfaSecret) mfaSecret = deriveSecret('vm:mfa-challenge:v1');

  const distinct = new Set([accessSecret, refreshSecret, mfaSecret]);
  if (distinct.size !== 3) {
    throw new Error('[config] JWT access, refresh and MFA secrets must all differ from one another.');
  }

  return {
    accessSecret,
    refreshSecret,
    mfaSecret,
    legacySecret: legacySecret ? String(legacySecret).trim() : null,

    issuer: process.env.JWT_ISSUER || 'vidyarthi-mitra-api',
    audience: process.env.JWT_AUDIENCE || 'vidyarthi-mitra-client',

    accessTtl: parseDuration(process.env.JWT_ACCESS_EXPIRE, '15m'),
    refreshTtl: parseDuration(process.env.JWT_REFRESH_EXPIRE, '30d'),
    mfaTtl: parseDuration(process.env.JWT_MFA_EXPIRE, '5m'),

    // Tokens issued before this refactor carry `{ id }` and no iss/aud claims.
    // Accepting them keeps live sessions alive across the deploy. Turn this off
    // (ALLOW_LEGACY_TOKENS=false) once the legacy TTL window has elapsed.
    allowLegacyTokens: process.env.ALLOW_LEGACY_TOKENS !== 'false',

    bcryptRounds: Math.min(Math.max(Number(process.env.BCRYPT_ROUNDS) || 12, 10), 15),
  };
};

let cachedAuthConfig = null;

const getAuthConfig = () => {
  if (!cachedAuthConfig) cachedAuthConfig = buildAuthConfig();
  return cachedAuthConfig;
};

/** Called from server bootstrap so misconfiguration aborts startup. */
const validateEnvironment = () => {
  const config = getAuthConfig();

  if (!isExplicitlyDevelopment()) {
    if (process.env.ALLOW_DEV_OTP_ECHO === 'true') {
      throw new Error(
        '[config] ALLOW_DEV_OTP_ECHO is enabled but NODE_ENV is not a development value. ' +
        'This would return verification codes and password-reset links in API responses. Refusing to start.'
      );
    }

    if (!isDeclaredProduction()) {
      console.warn(
        `[config] NODE_ENV is "${process.env.NODE_ENV || '(unset)'}" — treating this as production ` +
        'and applying strict security settings. Set NODE_ENV=development explicitly for local work.'
      );
    }

    if (config.allowLegacyTokens) {
      console.warn(
        '[config] ALLOW_LEGACY_TOKENS is enabled so pre-refactor sessions keep working. ' +
        'Set it to false once those tokens have expired.'
      );
    }
  }

  return true;
};

module.exports = {
  getAuthConfig,
  validateEnvironment,
  isProduction,
  isDeclaredProduction,
  isExplicitlyDevelopment,
  isDevEchoEnabled,
};
