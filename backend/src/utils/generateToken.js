/**
 * Backward-compatible shim.
 *
 * The old signature was `generateToken(userId)` and produced a 30-day token with
 * a `{ id }` payload. Any remaining caller now receives a properly scoped,
 * short-lived access token instead.
 *
 * Prefer importing from ../utils/tokenService directly in new code.
 */

const User = require('../models/User');
const { signAccessToken } = require('./tokenService');

/**
 * @param {object|string} userOrId - a User document, or a bare id (legacy form).
 * @returns {Promise<string>|string} the access token. Passing a bare id returns
 *   a Promise because the user must be loaded to embed role and tokenVersion.
 */
const generateToken = (userOrId) => {
  if (userOrId && typeof userOrId === 'object' && userOrId._id) {
    return signAccessToken(userOrId);
  }

  return User.findById(userOrId).then((user) => {
    if (!user) throw new Error('Cannot issue a token for an unknown user');
    return signAccessToken(user);
  });
};

module.exports = generateToken;
module.exports.generateToken = generateToken;
