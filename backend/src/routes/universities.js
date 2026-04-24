const router = require('express').Router();
const { getUniversities, getUniversity, createUniversity, updateUniversity, deleteUniversity, searchUniversities, compareUniversities } = require('../controllers/universityController');
const { protect, admin } = require('../middleware/auth');

router.get('/search', searchUniversities);
router.post('/compare', compareUniversities);
router.route('/').get(getUniversities).post(protect, admin, createUniversity);
router.route('/:id').get(getUniversity).put(protect, admin, updateUniversity).delete(protect, admin, deleteUniversity);

module.exports = router;
