/**
 * Authentication and authorization middleware.
 *
 * Authorization decisions read the role from the freshly loaded database record,
 * never from the JWT claim. This means a demotion or a ban takes effect on the
 * user's very next request instead of waiting for the token to expire.
 */

const User = require('../models/User');
const { verifyAccessToken, verifyLegacyToken } = require('../utils/tokenService');

/** Ordered least- to most-privileged. Used to derive "at least this role" checks. */
const ROLE_HIERARCHY = ['user', 'admin', 'superadmin'];

const roleRank = (role) => {
  const index = ROLE_HIERARCHY.indexOf(role);
  return index === -1 ? -1 : index;
};

const deny = (res, status, message) => res.status(status).json({ success: false, message });

const extractBearerToken = (req) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
};

/**
 * Verifies the access token and loads the caller.
 *
 * Hardening over the previous version:
 *  - Signature, algorithm (HS256 pinned), issuer, audience, expiry and token
 *    type are all asserted by verifyAccessToken. The old code called
 *    `jwt.verify(token, secret)` with no constraints beyond the signature.
 *  - tokenVersion is compared, so password changes/resets, role changes and
 *    "log out everywhere" revoke outstanding tokens immediately.
 *  - Expired tokens are reported distinctly (401 + code) so the client can
 *    transparently refresh instead of dumping the user at the login screen.
 */
exports.protect = async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) return deny(res, 401, 'Not authorized');

  let payload = null;

  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Session expired',
      });
    }

    // Backward compatibility: tokens minted before the auth refactor carry
    // `{ id }` and no iss/aud/typ claims. Accepted only while
    // ALLOW_LEGACY_TOKENS is enabled, so existing sessions survive the deploy.
    try {
      payload = verifyLegacyToken(token);
    } catch {
      payload = null;
    }

    if (!payload) return deny(res, 401, 'Not authorized');
  }

  try {
    const user = await User.findById(payload.sub);
    if (!user) return deny(res, 401, 'Not authorized');

    if (user.status === 'banned') {
      return deny(res, 403, 'Account has been banned');
    }
    if (user.status === 'suspended') {
      return deny(res, 403, 'Account is suspended');
    }

    const revoked = () =>
      res.status(401).json({ success: false, code: 'TOKEN_REVOKED', message: 'Session expired' });

    if (payload.legacy) {
      /**
       * Legacy tokens predate tokenVersion, so they cannot be matched against
       * it. Without a substitute they would be entirely unrevocable — password
       * change, password reset and "log out everywhere" could not invalidate a
       * pre-refactor token for its full 30-day life. Comparing the token's
       * issue time against passwordChangedAt restores revocation for exactly
       * the case that matters: a credential rotated in response to compromise.
       */
      if (user.passwordChangedAt && payload.iat) {
        const changedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);
        if (payload.iat < changedAtSeconds) return revoked();
      }
    } else if ((payload.tv || 0) !== (user.tokenVersion || 0)) {
      return revoked();
    }

    req.user = user;
    req.tokenPayload = payload;
    return next();
  } catch (error) {
    console.error('[auth] protect failed:', error);
    return deny(res, 401, 'Not authorized');
  }
};

/**
 * Role-based access control.
 *
 * `requireRole('admin')` grants admin and everything above it (superadmin);
 * pass `{ exact: true }` when a privilege must not be inherited.
 */
exports.requireRole = (...roles) => {
  // An options object is a non-array object. Testing only `typeof === 'object'`
  // also matched an array, so requireRole(['admin']) popped the roles themselves
  // as options and denied everyone.
  const last = roles[roles.length - 1];
  const options = last && typeof last === 'object' && !Array.isArray(last) ? roles.pop() : {};

  const allowed = roles.flat().filter(Boolean);
  if (allowed.length === 0) {
    throw new Error('requireRole() needs at least one role');
  }
  const minimumRank = Math.min(...allowed.map(roleRank));

  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) return deny(res, 401, 'Not authorized');

    const permitted = options.exact
      ? allowed.includes(role)
      : roleRank(role) >= minimumRank;

    if (!permitted) {
      return deny(res, 403, 'You do not have permission to perform this action');
    }

    return next();
  };
};

/** Requires a verified email. Useful for gating sensitive self-service actions. */
exports.requireVerified = (req, res, next) => {
  if (!req.user?.isEmailVerified && !req.user?.isPhoneVerified) {
    return deny(res, 403, 'Please verify your account to continue');
  }
  return next();
};

// Backward-compatible aliases. Existing routes import { protect, admin, superadmin }
// and continue to work unchanged.
exports.admin = exports.requireRole('admin');
exports.superadmin = exports.requireRole('superadmin');

exports.ROLE_HIERARCHY = ROLE_HIERARCHY;
exports.roleRank = roleRank;
