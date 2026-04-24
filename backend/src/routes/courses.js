const router = require('express').Router();
const { getCourses, getCategories, getCourse } = require('../controllers/courseController');
router.get('/', getCourses);
router.get('/categories', getCategories);
router.get('/:id', getCourse);
module.exports = router;
