const router = require('express').Router();
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  getSavedUniversities,
  saveUniversity,
  removeSavedUniversity,
  getSavedCourses,
  saveCourse,
  removeSavedCourse,
  changePassword,
  upsertRating,
  upsertNote,
  getRecommendations,
  addApplication,
  updateApplicationStatus,
  getNotifications,
  markNotificationRead,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { upload } = require('../utils/imageUpload');
const { validateImageUpload } = require('../middleware/fileValidation');

/* ── Profile ─────────────────────────────────────── */
router.get('/profile',  protect, getProfile);
router.put('/profile',  protect, updateProfile);
// validateImageUpload verifies the actual bytes, not just the declared MIME
// type — important here because the avatar can fall back to being stored as a
// data: URI and re-served to every viewer of the profile.
router.post('/avatar',   protect, upload.single('avatar'), validateImageUpload, uploadAvatar);

/* ── Saved Universities ──────────────────────────── */
router.get('/saved-universities',                    protect, getSavedUniversities);
router.post('/saved-universities/:universityId',     protect, saveUniversity);
router.delete('/saved-universities/:universityId',   protect, removeSavedUniversity);

/* ── Saved Courses ───────────────────────────────── */
router.get('/saved-courses',               protect, getSavedCourses);
router.post('/saved-courses/:courseId',    protect, saveCourse);
router.delete('/saved-courses/:courseId',  protect, removeSavedCourse);

/* ── Password ────────────────────────────────────── */
router.put('/change-password', protect, changePassword);

/* ── Ratings ─────────────────────────────────────── */
router.put('/ratings/:universityId', protect, upsertRating);

/* ── Notes ───────────────────────────────────────── */
router.put('/notes/:universityId', protect, upsertNote);

/* ── Recommendations ─────────────────────────────── */
router.get('/recommendations', protect, getRecommendations);

/* ── Applications ────────────────────────────────── */
router.post('/applications', protect, addApplication);
router.put('/applications/:applicationId/status', protect, updateApplicationStatus);

/* ── Notifications ───────────────────────────────── */
router.get('/notifications', protect, getNotifications);
router.put('/notifications/:notificationId/read', protect, markNotificationRead);

module.exports = router;
