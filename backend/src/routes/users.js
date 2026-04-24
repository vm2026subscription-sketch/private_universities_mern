const router = require('express').Router();
const { getProfile, updateProfile, getSavedUniversities, saveUniversity, removeSavedUniversity } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.get('/saved-universities', protect, getSavedUniversities);
router.post('/saved-universities/:universityId', protect, saveUniversity);
router.delete('/saved-universities/:universityId', protect, removeSavedUniversity);
module.exports = router;
