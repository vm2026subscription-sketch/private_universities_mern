const router = require('express').Router();
const { getPublicSettings } = require('../controllers/siteSettingController');
const { getActiveBanners, trackClick } = require('../controllers/bannerController');
const { getApproved, submitPublic } = require('../controllers/testimonialController');
const { getBySlug } = require('../controllers/pageController');
const { getPublished } = require('../controllers/faqController');
const { submit } = require('../controllers/contactController');
const { subscribe, unsubscribe } = require('../controllers/newsletterController');
const { getUserNotifications, markAsRead, markAllRead } = require('../controllers/notificationController');
const { submitLead } = require('../controllers/leadController');
const admissionApplicationCtrl = require('../controllers/admissionApplicationController');
const { protect } = require('../middleware/auth');
const { admissionApplicationLimiter } = require('../middleware/rateLimiters');

// Public routes
router.get('/site-settings', getPublicSettings);
router.get('/banners', getActiveBanners);
router.get('/banners/click/:id', trackClick);
router.get('/testimonials', getApproved);
router.post('/testimonials', submitPublic);
router.get('/pages/:slug', getBySlug);
router.get('/faqs', getPublished);
router.post('/contact', submit);
router.post('/newsletter/subscribe', subscribe);
router.post('/newsletter/unsubscribe', unsubscribe);
router.post('/leads/submit', submitLead);
router.get('/admission/catalog/:resource', admissionApplicationCtrl.getCatalogOptions);
router.post('/admission/applications', admissionApplicationLimiter, admissionApplicationCtrl.submitApplication);

// Protected user notification routes
router.get('/notifications', protect, getUserNotifications);
router.patch('/notifications/:id/read', protect, markAsRead);
router.patch('/notifications/read-all', protect, markAllRead);

module.exports = router;
