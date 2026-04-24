const router = require('express').Router();
const { getExams, getUpcoming, getExam } = require('../controllers/examController');
router.get('/', getExams);
router.get('/upcoming', getUpcoming);
router.get('/:id', getExam);
module.exports = router;
