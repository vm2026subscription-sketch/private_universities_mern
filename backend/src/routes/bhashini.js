const router = require('express').Router();
const { translateText, translateBatch } = require('../controllers/bhashiniController');

router.post('/translate', translateText);
router.post('/translate-batch', translateBatch);

module.exports = router;
