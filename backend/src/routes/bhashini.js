const router = require('express').Router();
const { translateText } = require('../controllers/bhashiniController');
const { protect } = require('../middleware/auth');

router.post('/translate', translateText);

module.exports = router;
