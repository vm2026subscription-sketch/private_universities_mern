const router = require('express').Router();
const { getUniversities, getUniversity, createUniversity, updateUniversity, deleteUniversity, searchUniversities, compareUniversities, getTrends, getSimilarUniversities } = require('../controllers/universityController');
const { protect, admin } = require('../middleware/auth');

router.get('/search', searchUniversities);
router.get('/trends', getTrends);
router.post('/compare', compareUniversities);
router.route('/').get(getUniversities).post(protect, admin, createUniversity);
router.get('/:id/similar', getSimilarUniversities);
router.route('/:id').get(getUniversity).put(protect, admin, updateUniversity).delete(protect, admin, deleteUniversity);

module.exports = router;
