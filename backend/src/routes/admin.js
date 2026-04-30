const router = require('express').Router();
const { protect, admin } = require('../middleware/auth');
const adminCtrl = require('../controllers/adminController');
const settingsCtrl = require('../controllers/siteSettingController');
const bannerCtrl = require('../controllers/bannerController');
const testimonialCtrl = require('../controllers/testimonialController');
const pageCtrl = require('../controllers/pageController');
const faqCtrl = require('../controllers/faqController');
const contactCtrl = require('../controllers/contactController');
const notificationCtrl = require('../controllers/notificationController');
const newsletterCtrl = require('../controllers/newsletterController');
const auditCtrl = require('../controllers/auditLogController');

router.use(protect, admin);

// Dashboard & content (existing)
router.get('/dashboard', adminCtrl.getDashboard);
router.get('/content', adminCtrl.getContentData);

// Users (existing)
router.get('/users', adminCtrl.getUsers);
router.patch('/users/:id', adminCtrl.updateUserAccess);

// Questions (existing)
router.delete('/questions/:id', adminCtrl.deleteQuestion);

// Universities (existing)
router.post('/universities', adminCtrl.createUniversity);
router.put('/universities/:id', adminCtrl.updateUniversity);
router.delete('/universities/:id', adminCtrl.deleteUniversity);

// Courses (existing)
router.post('/courses', adminCtrl.createCourse);
router.put('/courses/:id', adminCtrl.updateCourse);
router.delete('/courses/:id', adminCtrl.deleteCourse);

// Exams (existing)
router.post('/exams', adminCtrl.createExam);
router.put('/exams/:id', adminCtrl.updateExam);
router.delete('/exams/:id', adminCtrl.deleteExam);

// News (existing)
router.post('/news', adminCtrl.createNews);
router.put('/news/:id', adminCtrl.updateNews);
router.delete('/news/:id', adminCtrl.deleteNews);

// Bulk import (existing)
router.post('/import/universities', adminCtrl.bulkImportUniversities);
router.post('/import/courses', adminCtrl.bulkImportCourses);

// ── New CMS Routes ─────────────────────────────────────────────

// Site Settings
router.get('/site-settings', settingsCtrl.getSettings);
router.post('/site-settings', settingsCtrl.upsertSetting);
router.post('/site-settings/bulk', settingsCtrl.bulkUpsertSettings);
router.delete('/site-settings/:id', settingsCtrl.deleteSetting);

// Banners
router.get('/banners', bannerCtrl.getBanners);
router.post('/banners', bannerCtrl.createBanner);
router.put('/banners/:id', bannerCtrl.updateBanner);
router.delete('/banners/:id', bannerCtrl.deleteBanner);

// Testimonials
router.get('/testimonials', testimonialCtrl.getAll);
router.post('/testimonials', testimonialCtrl.create);
router.put('/testimonials/:id', testimonialCtrl.update);
router.delete('/testimonials/:id', testimonialCtrl.remove);

// Pages
router.get('/pages', pageCtrl.getAll);
router.post('/pages', pageCtrl.create);
router.put('/pages/:id', pageCtrl.update);
router.delete('/pages/:id', pageCtrl.remove);

// FAQs
router.get('/faqs', faqCtrl.getAll);
router.post('/faqs', faqCtrl.create);
router.put('/faqs/:id', faqCtrl.update);
router.delete('/faqs/:id', faqCtrl.remove);

// Contacts
router.get('/contacts', contactCtrl.getAll);
router.patch('/contacts/:id', contactCtrl.updateStatus);
router.delete('/contacts/:id', contactCtrl.remove);

// Notifications
router.get('/notifications', notificationCtrl.getAll);
router.post('/notifications', notificationCtrl.create);
router.delete('/notifications/:id', notificationCtrl.remove);

// Newsletter
router.get('/newsletter/subscribers', newsletterCtrl.getSubscribers);
router.delete('/newsletter/subscribers/:id', newsletterCtrl.removeSubscriber);

// Audit Logs
router.get('/audit-logs', auditCtrl.getLogs);

module.exports = router;
