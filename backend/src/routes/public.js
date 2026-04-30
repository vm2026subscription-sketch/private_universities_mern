const router = require('express').Router();
const { getPublicSettings } = require('../controllers/siteSettingController');
const { getActiveBanners } = require('../controllers/bannerController');
const { getApproved } = require('../controllers/testimonialController');
const { getBySlug } = require('../controllers/pageController');
const { getPublished } = require('../controllers/faqController');
const { submit } = require('../controllers/contactController');
const { subscribe, unsubscribe } = require('../controllers/newsletterController');
const { getUserNotifications, markAsRead, markAllRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/site-settings', getPublicSettings);
router.get('/banners', getActiveBanners);
router.get('/testimonials', getApproved);
router.get('/pages/:slug', getBySlug);
router.get('/faqs', getPublished);
router.post('/contact', submit);
router.post('/newsletter/subscribe', subscribe);
router.post('/newsletter/unsubscribe', unsubscribe);

// Protected user notification routes
router.get('/notifications', protect, getUserNotifications);
router.patch('/notifications/:id/read', protect, markAsRead);
router.patch('/notifications/read-all', protect, markAllRead);

module.exports = router;
