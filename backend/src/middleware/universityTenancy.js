/**
 * Tenancy enforcement for university accounts.
 *
 * The single rule this file exists to enforce:
 *
 *   The university being edited is derived from the AUTHENTICATED ACCOUNT,
 *   never from anything the caller sent.
 *
 * An endpoint shaped `PUT /universities/:id` cannot be made safe by adding an
 * ownership check to it, because the check and the lookup read the same
 * attacker-controlled value; every such endpoint is one forgotten comparison
 * away from letting one university rewrite another's page. Removing the
 * identifier from the request surface removes the entire class of bug: there is
 * no id to tamper with. That is why the routes guarded here are `/my-university`
 * rather than `/universities/:id`.
 *
 * Admins are intentionally NOT routed through this middleware. They legitimately
 * act on universities they do not own, so they use the admin endpoints, where
 * taking an id from the URL is correct and expected.
 */

const University = require('../models/University');

const deny = (res, status, message, code) =>
  res.status(status).json({ success: false, ...(code ? { code } : {}), message });

/**
 * Loads the caller's own university and attaches it as `req.university`.
 *
 * Must run after `protect`, which populates `req.user` from a fresh database
 * read. That freshness matters here: revoking a claim clears `universityId`, and
 * because the value is re-read on every request rather than trusted from the
 * JWT, the revocation takes effect on the user's very next call instead of
 * whenever their token happens to expire.
 */
exports.requireUniversityAccess = async (req, res, next) => {
  const user = req.user;
  if (!user) return deny(res, 401, 'Not authorized');

  if (user.role !== 'university') {
    return deny(res, 403, 'This area is for university accounts only.');
  }

  // Signed up, possibly email-verified, but no admin decision yet.
  if (!user.universityId) {
    return deny(
      res,
      403,
      'Your university access request is still awaiting approval.',
      'CLAIM_NOT_APPROVED'
    );
  }

  try {
    const university = await University.findById(user.universityId);

    if (!university) {
      // The linked university was deleted out from under the account. Failing
      // closed is the only safe response: there is nothing legitimate for this
      // session to edit.
      console.error(
        `[tenancy] User ${user._id} is linked to missing university ${user.universityId}`
      );
      return deny(res, 403, 'The linked university record is unavailable. Please contact support.');
    }

    req.university = university;
    return next();
  } catch (error) {
    console.error('[tenancy] Failed to load university:', error);
    return deny(res, 500, 'Could not verify university access.');
  }
};

/**
 * Restricts an action to the claim-approved owner.
 *
 * Invited teammates are `member`s and cannot invite further members. Without
 * that limit the account graph for a university could grow indefinitely from a
 * single approval, which would quietly undo the point of admin review — one
 * approved person could onboard anyone at all.
 */
exports.requireUniversityOwner = (req, res, next) => {
  if (req.user?.universityRole !== 'owner') {
    return deny(res, 403, 'Only the university account owner can perform this action.');
  }
  return next();
};

/**
 * Rejects any attempt to address a university explicitly on a tenant route.
 *
 * Defence in depth. Tenant routes take their target from the session, so an
 * inbound `universityId` is meaningless — but a future handler could start
 * reading one, and a client sending one is a signal worth surfacing rather than
 * silently ignoring. Erroring makes that mistake loud in development instead of
 * a silent hole in production.
 */
exports.rejectUniversityIdInPayload = (req, res, next) => {
  const supplied =
    req.body?.universityId ??
    req.body?.university ??
    req.body?._id ??
    req.query?.universityId;

  if (supplied !== undefined) {
    return deny(
      res,
      400,
      'Do not send a university identifier — your own university is determined by your session.'
    );
  }

  return next();
};

/**
 * Guards fields a university must not be able to set on itself.
 *
 * Sponsorship placement is sold by the platform, and verification badges are the
 * product's credibility. If a tenant could write these, they could promote
 * themselves up the listings or mark themselves verified for free.
 */
const TENANT_FORBIDDEN_FIELDS = [
  'isSponsored',
  'sponsorTier',
  'sponsorPriority',
  'sponsorExpiry',
  'slug',
  'views',
  'status',
];

exports.stripPlatformControlledFields = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object') return next();

  const attempted = TENANT_FORBIDDEN_FIELDS.filter((field) => field in req.body);
  attempted.forEach((field) => delete req.body[field]);

  if (attempted.length) {
    console.warn(
      `[tenancy] User ${req.user?._id} attempted to set platform-controlled fields: ${attempted.join(', ')}`
    );
  }

  return next();
};

exports.TENANT_FORBIDDEN_FIELDS = TENANT_FORBIDDEN_FIELDS;
