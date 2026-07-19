/**
 * Refresh-token lifecycle: issue, rotate, revoke.
 *
 * Implements OWASP's recommended refresh-token rotation with reuse detection:
 * every exchange invalidates the presented token and issues a new one. If a
 * token that has already been rotated is presented again, we treat it as a
 * stolen-token replay and revoke the entire family (every descendant of that
 * login), forcing re-authentication.
 */

const crypto = require('crypto');
const Session = require('../models/Session');
const {
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
  hashToken,
} = require('../utils/tokenService');

const newFamilyId = () => crypto.randomBytes(16).toString('hex');

const describeRequest = (req) => ({
  ip: req?.ip,
  userAgent: req?.headers?.['user-agent'],
  device: req?.headers?.['user-agent'],
});

/** Issues a brand new refresh token starting a fresh family (i.e. a new login). */
const issueRefreshToken = async (user, req, familyId = newFamilyId()) => {
  // Never extend a family that was revoked while this request was in flight.
  if (revokedFamilies.has(familyId)) {
    const error = new Error('Session expired. Please sign in again.');
    error.statusCode = 401;
    throw error;
  }

  const { token, jti } = signRefreshToken(user);

  await Session.create({
    userId: user._id,
    tokenHash: hashToken(jti),
    familyId,
    expiresAt: getRefreshTokenExpiry(),
    isActive: true,
    ...describeRequest(req),
  });

  return token;
};

/**
 * Revokes a token family.
 *
 * `revokedFamilies` guards against resurrection: a concurrent rotation that was
 * mid-flight when the family was revoked would otherwise insert a fresh active
 * session into it. Recording the revocation lets issueRefreshToken refuse to
 * add to a dead family, and the second sweep cleans up anything that raced in.
 */
const revokedFamilies = new Set();

const revokeFamily = async (familyId, reason, { bumpTokenVersion = false, userId = null } = {}) => {
  revokedFamilies.add(familyId);

  const apply = () =>
    Session.updateMany(
      { familyId, isActive: true },
      { isActive: false, revokedAt: new Date(), revokedReason: reason }
    );

  await apply();
  await apply(); // catches sessions inserted by an in-flight concurrent rotation

  // Revoking sessions alone leaves the matching ACCESS token valid for its full
  // lifetime (up to 15 minutes). When the trigger is a suspected theft, that is
  // exactly the window an attacker wants, so invalidate access tokens too.
  if (bumpTokenVersion && userId) {
    const User = require('../models/User');
    await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
  }

  // Bounded cleanup so the guard set cannot grow without limit.
  if (revokedFamilies.size > 10000) revokedFamilies.clear();
};

const revokeAllForUser = async (userId, reason) => {
  await Session.updateMany(
    { userId, isActive: true },
    { isActive: false, revokedAt: new Date(), revokedReason: reason }
  );
};

/**
 * Validates and rotates a refresh token.
 *
 * Returns { user, token } on success. Throws an Error carrying `statusCode` on
 * any failure — all failures surface to the client as a single generic message
 * so the response cannot be used to distinguish "expired" from "revoked" from
 * "never existed".
 */
const rotateRefreshToken = async (presentedToken, req, loadUser) => {
  const authError = (message = 'Session expired. Please sign in again.') => {
    const error = new Error(message);
    error.statusCode = 401;
    return error;
  };

  let payload;
  try {
    payload = verifyRefreshToken(presentedToken);
  } catch {
    throw authError();
  }

  const tokenHash = hashToken(payload.jti);

  /**
   * Claim the token ATOMICALLY.
   *
   * A read-then-check-then-write sequence lets two concurrent presentations of
   * the same token both observe it as unrotated and both succeed, so a thief
   * racing the legitimate client is never detected. A single conditional update
   * means exactly one caller can win; any other caller gets null and is treated
   * as reuse.
   */
  const claimed = await Session.findOneAndUpdate(
    { tokenHash, isActive: true, rotatedAt: null },
    { rotatedAt: new Date(), isActive: false, lastActivity: new Date() },
    { new: true }
  );

  if (!claimed) {
    // Either the token never existed, or it was already exchanged/revoked —
    // i.e. the credential exists in more than one place. Burn the family.
    const known = await Session.findOne({ tokenHash });
    if (known) {
      await revokeFamily(known.familyId, 'refresh_token_reuse_detected', {
        bumpTokenVersion: true,
        userId: known.userId,
      });
      console.warn(
        `[auth] Refresh token reuse detected for user ${known.userId} (family ${known.familyId}). Family revoked.`
      );
    }
    throw authError();
  }

  if (claimed.expiresAt <= new Date()) throw authError();

  const user = await loadUser(payload.sub);
  if (!user) throw authError();
  if (user.status === 'banned' || user.status === 'suspended') throw authError();

  // tokenVersion is bumped by password change/reset, role change and forced
  // logout, which invalidates refresh tokens issued before that event.
  if ((payload.tv || 0) !== (user.tokenVersion || 0)) {
    await revokeFamily(claimed.familyId, 'token_version_mismatch');
    throw authError();
  }

  const token = await issueRefreshToken(user, req, claimed.familyId);
  return { user, token };
};

/** Revokes the single session behind a refresh token. Used by logout. */
const revokeRefreshToken = async (presentedToken, reason = 'logout') => {
  if (!presentedToken) return false;

  let payload;
  try {
    payload = verifyRefreshToken(presentedToken);
  } catch {
    return false; // Logout is best-effort and must never leak token validity.
  }

  const result = await Session.updateOne(
    { tokenHash: hashToken(payload.jti), isActive: true },
    { isActive: false, revokedAt: new Date(), revokedReason: reason }
  );

  return result.modifiedCount > 0;
};

module.exports = {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  revokeFamily,
};
