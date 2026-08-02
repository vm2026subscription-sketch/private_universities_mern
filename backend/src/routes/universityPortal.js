/**
 * University self-service portal routes.
 *
 * Note what is absent: there is no `/:universityId` on any tenant route. A
 * university account's target is derived from its session by
 * requireUniversityAccess, so there is no identifier in the request for a caller
 * to tamper with. Admin routes do take ids, which is correct — admins act on
 * universities they do not own.
 */

const router = require('express').Router();

const {
  signup,
  getMyStatus,
  listClaims,
  getClaim,
  approveClaim,
  rejectClaim,
  revokeAccess,
  listTeam,
  inviteTeamMember,
  acceptInvite,
  removeTeamMember,
} = require('../controllers/universityPortalController');

const { protect, requireRole } = require('../middleware/auth');
const {
  requireUniversityAccess,
  requireUniversityOwner,
  rejectUniversityIdInPayload,
} = require('../middleware/universityTenancy');
const { registerLimiter, passwordResetLimiter, otpSendLimiter } = require('../middleware/rateLimiters');

/**
 * `{ exact: true }` is load-bearing on every tenant route below.
 *
 * Without it, requireRole falls back to rank comparison, and because
 * `university` is deliberately absent from ROLE_HIERARCHY its rank is -1 — the
 * check would then behave in ways nobody reading the route intended. Exact
 * matching states the requirement literally: this role, nothing else.
 */
const universityOnly = requireRole('university', { exact: true });

/* ── Public ───────────────────────────────────────────────────────────────── */

router.post('/signup', registerLimiter, signup);
router.post('/team/accept-invite', passwordResetLimiter, acceptInvite);

/* ── Applicant (authenticated, tenancy not yet required) ──────────────────── */

// Reachable before approval on purpose: this is how an applicant discovers
// whether their claim was approved or rejected.
router.get('/me', protect, getMyStatus);

/* ── Tenant (authenticated + approved) ────────────────────────────────────── */

router.get('/team', protect, universityOnly, requireUniversityAccess, listTeam);

router.post(
  '/team/invite',
  protect,
  universityOnly,
  requireUniversityAccess,
  requireUniversityOwner,
  otpSendLimiter, // sends an outbound email — same abuse surface as OTP dispatch
  rejectUniversityIdInPayload,
  inviteTeamMember
);

router.delete(
  '/team/:userId',
  protect,
  universityOnly,
  requireUniversityAccess,
  requireUniversityOwner,
  removeTeamMember
);

/* ── Admin review ─────────────────────────────────────────────────────────── */

router.get('/claims', protect, requireRole('admin'), listClaims);
router.get('/claims/:id', protect, requireRole('admin'), getClaim);
router.post('/claims/:id/reject', protect, requireRole('admin'), rejectClaim);

/**
 * Approval accepts an ordinary admin. When the target university already has an
 * owner the controller escalates the requirement to superadmin, because that
 * approval would revoke a live account's access rather than grant a fresh one.
 */
router.post('/claims/:id/approve', protect, requireRole('admin'), approveClaim);

/** Withdrawing access outright is superadmin-only — it has no claim to appeal. */
router.delete('/access/:userId', protect, requireRole('superadmin'), revokeAccess);

module.exports = router;
