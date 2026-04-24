const router = require('express').Router();
const { protect, admin } = require('../middleware/auth');
const {
  getDashboard,
  getContentData,
  getUsers,
  updateUserAccess,
  deleteQuestion,
  createUniversity,
  updateUniversity,
  deleteUniversity,
  createCourse,
  updateCourse,
  deleteCourse,
  createExam,
  updateExam,
  deleteExam,
  createNews,
  updateNews,
  deleteNews,
  bulkImportUniversities,
  bulkImportCourses,
} = require('../controllers/adminController');

router.use(protect, admin);
router.get('/dashboard', getDashboard);
router.get('/content', getContentData);
router.get('/users', getUsers);
router.patch('/users/:id', updateUserAccess);
router.delete('/questions/:id', deleteQuestion);
router.post('/universities', createUniversity);
router.put('/universities/:id', updateUniversity);
router.delete('/universities/:id', deleteUniversity);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);
router.post('/exams', createExam);
router.put('/exams/:id', updateExam);
router.delete('/exams/:id', deleteExam);
router.post('/news', createNews);
router.put('/news/:id', updateNews);
router.delete('/news/:id', deleteNews);
router.post('/import/universities', bulkImportUniversities);
router.post('/import/courses', bulkImportCourses);

module.exports = router;
