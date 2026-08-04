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

const {
  getMyUniversity,
  updateMyUniversity,
  addGalleryImages,
  removeGalleryImage,
  listPendingReviews,
  approveChanges,
  rejectChanges,
} = require('../controllers/universityProfileController');

const {
  listMyCourses,
  createMyCourse,
  updateMyCourse,
  deleteMyCourse,
} = require('../controllers/universityCourseController');

const { protect, requireRole } = require('../middleware/auth');
const {
  requireUniversityAccess,
  requireUniversityOwner,
  rejectUniversityIdInPayload,
  stripPlatformControlledFields,
} = require('../middleware/universityTenancy');
const { requireActiveSubscription } = require('../middleware/subscriptionAuth');
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

/**
 * The guard chain every tenant route shares.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PERSON B — INSERT `requireActiveSubscription` AS THE LAST ENTRY OF `tenantWrite`
 * ────────────────────────────────────────────────────────────────────────────
 * Reads (`tenantRead`) must stay ungated: a university whose subscription has
 * lapsed still needs to sign in, see its dashboard and reach the renew button.
 * Only WRITES pay. And note that nothing here touches the public university
 * page — an expired subscription locks editing, never publication.
 */
const tenantRead = [protect, universityOnly, requireUniversityAccess];
const tenantWrite = [
  ...tenantRead,
  rejectUniversityIdInPayload,
  stripPlatformControlledFields,
  requireActiveSubscription,
];

/* Profile */
router.get('/my-university', ...tenantRead, getMyUniversity);
router.put('/my-university', ...tenantWrite, updateMyUniversity);

/* Gallery */
router.post('/my-university/gallery', ...tenantWrite, addGalleryImages);
router.delete('/my-university/gallery', ...tenantWrite, removeGalleryImage);

/* Courses — the id in the path is always re-scoped to the caller's university */
router.get('/my-university/courses', ...tenantRead, listMyCourses);
router.post('/my-university/courses', ...tenantWrite, createMyCourse);
router.put('/my-university/courses/:courseId', ...tenantWrite, updateMyCourse);
router.delete('/my-university/courses/:courseId', ...tenantWrite, deleteMyCourse);

/* Team */
router.get('/team', protect, universityOnly, requireUniversityAccess, listTeam);

router.post(
  '/team/invite',
  protect,
  universityOnly,
  requireUniversityAccess,
  requireActiveSubscription,
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
  requireActiveSubscription,
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

/* ── Admin moderation of profile edits ────────────────────────────────────── */

router.get('/reviews', protect, requireRole('admin'), listPendingReviews);
router.post('/reviews/:id/approve', protect, requireRole('admin'), approveChanges);
router.post('/reviews/:id/reject', protect, requireRole('admin'), rejectChanges);

module.exports = router;
