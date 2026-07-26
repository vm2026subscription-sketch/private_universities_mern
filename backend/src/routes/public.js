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
const { protect } = require('../middleware/auth');
const { contactLimiter, leadLimiter, newsletterLimiter } = require('../middleware/rateLimiters');

// Public routes
router.get('/site-settings', getPublicSettings);
router.get('/banners', getActiveBanners);
router.get('/banners/click/:id', trackClick);
router.get('/testimonials', getApproved);
router.post('/testimonials', submitPublic);
router.get('/pages/:slug', getBySlug);
router.get('/faqs', getPublished);

// Anonymous writes carry a per-IP budget. Previously only the loose global
// 1000/15m limiter guarded them, which is ample room for a script to flood the
// contact inbox, the newsletter list, or — most damaging — the leads table that
// sponsoring universities are billed against.
router.post('/contact', contactLimiter, submit);
router.post('/newsletter/subscribe', newsletterLimiter, subscribe);
router.post('/newsletter/unsubscribe', newsletterLimiter, unsubscribe);
router.post('/leads/submit', leadLimiter, submitLead);

// Protected user notification routes
router.get('/notifications', protect, getUserNotifications);
router.patch('/notifications/:id/read', protect, markAsRead);
router.patch('/notifications/read-all', protect, markAllRead);

module.exports = router;
