const router = require('express').Router();
const { getNews, getFeatured, getNewsById } = require('../controllers/newsController');
router.get('/', getNews);
router.get('/featured', getFeatured);
router.get('/:id', getNewsById);
module.exports = router;
