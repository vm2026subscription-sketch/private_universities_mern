const router = require('express').Router();
const { getCourses, getCategories, getCourse, getGroupedCourses } = require('../controllers/courseController');
router.get('/', getCourses);
router.get('/grouped', getGroupedCourses);
router.get('/categories', getCategories);
router.get('/:id', getCourse);
module.exports = router;
