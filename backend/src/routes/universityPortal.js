/**
 * University self-service portal routes.
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
  getMyUniversity: portalGetMyUniversity,
  updateMyUniversity: portalUpdateMyUniversity,
  uploadGalleryImage: portalUploadGalleryImage,
  getCourses: portalGetCourses,
  createCourse: portalCreateCourse,
  updateCourse: portalUpdateCourse,
  deleteCourse: portalDeleteCourse
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

const { protect, admin, requireRole } = require('../middleware/auth');
const {
  requireUniversityAccess,
  requireUniversityOwner,
  rejectUniversityIdInPayload,
  stripPlatformControlledFields,
} = require('../middleware/universityTenancy');
const { registerLimiter, passwordResetLimiter, otpSendLimiter } = require('../middleware/rateLimiters');

const universityOnly = requireRole('university', { exact: true });
const allowUniversityOrAdmin = requireRole('university', 'admin', 'superadmin');

/* ── Public ───────────────────────────────────────────────────────────────── */
router.post('/signup', registerLimiter, signup);
router.post('/team/accept-invite', passwordResetLimiter, acceptInvite);

/* ── Applicant ────────────────────────────────────────────────────────────── */
router.get('/me', protect, getMyStatus);

/* ── University Portal / Tenant Endpoints ──────────────────────────────────── */
const handleGetUniversity = (req, res, next) => {
  if (req.user?.role === 'admin' || req.user?.role === 'superadmin' || !req.university) {
    return portalGetMyUniversity(req, res, next);
  }
  return getMyUniversity(req, res, next);
};

const handleUpdateUniversity = (req, res, next) => {
  if (req.user?.role === 'admin' || req.user?.role === 'superadmin' || !req.university) {
    return portalUpdateMyUniversity(req, res, next);
  }
  return updateMyUniversity(req, res, next);
};

/* Direct & Prefixed Profile Routes */
router.get('/my-university', protect, allowUniversityOrAdmin, handleGetUniversity);
router.put('/my-university', protect, allowUniversityOrAdmin, handleUpdateUniversity);
router.get('/university-portal/my-university', protect, allowUniversityOrAdmin, portalGetMyUniversity);
router.put('/university-portal/my-university', protect, allowUniversityOrAdmin, portalUpdateMyUniversity);

/* Gallery */
router.post('/my-university/gallery', protect, allowUniversityOrAdmin, portalUploadGalleryImage);
router.post('/university-portal/my-university/gallery', protect, allowUniversityOrAdmin, portalUploadGalleryImage);
router.delete('/my-university/gallery', protect, allowUniversityOrAdmin, removeGalleryImage);

/* Courses */
router.get('/my-university/courses', protect, allowUniversityOrAdmin, portalGetCourses);
router.post('/my-university/courses', protect, allowUniversityOrAdmin, portalCreateCourse);
router.put('/my-university/courses/:courseId', protect, allowUniversityOrAdmin, portalUpdateCourse);
router.delete('/my-university/courses/:courseId', protect, allowUniversityOrAdmin, portalDeleteCourse);

router.get('/university-portal/my-university/courses', protect, allowUniversityOrAdmin, portalGetCourses);
router.post('/university-portal/my-university/courses', protect, allowUniversityOrAdmin, portalCreateCourse);
router.put('/university-portal/my-university/courses/:id', protect, allowUniversityOrAdmin, portalUpdateCourse);
router.delete('/university-portal/my-university/courses/:id', protect, allowUniversityOrAdmin, portalDeleteCourse);

/* Team */
router.get('/team', protect, universityOnly, requireUniversityAccess, listTeam);
router.post('/team/invite', protect, universityOnly, requireUniversityAccess, requireUniversityOwner, otpSendLimiter, rejectUniversityIdInPayload, inviteTeamMember);
router.delete('/team/:userId', protect, universityOnly, requireUniversityAccess, requireUniversityOwner, removeTeamMember);

/* ── Admin Claims Endpoints ───────────────────────────────────────────────── */
router.get('/university-portal/claims', protect, admin, listClaims);
router.get('/claims', protect, admin, listClaims);
router.get('/claims/:id', protect, admin, getClaim);
router.post('/claims/:id/approve', protect, admin, approveClaim);
router.post('/claims/:id/reject', protect, admin, rejectClaim);
router.delete('/access/:userId', protect, requireRole('superadmin'), revokeAccess);

/* ── Admin Moderation Reviews ─────────────────────────────────────────────── */
router.get('/reviews', protect, admin, listPendingReviews);
router.post('/reviews/:id/approve', protect, admin, approveChanges);
router.post('/reviews/:id/reject', protect, admin, rejectChanges);

module.exports = router;
