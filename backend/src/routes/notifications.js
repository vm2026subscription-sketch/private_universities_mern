const router = require('express').Router();
const { protect } = require('../middleware/auth');
const {
  getUserNotifications,
  markAsRead,
  markAllRead,
} = require('../controllers/notificationController');

// All endpoints in this router require authentication
router.use(protect);

router.get('/', getUserNotifications);

router.put('/read-all', markAllRead);
router.patch('/read-all', markAllRead);

router.put('/:id/read', markAsRead);
router.patch('/:id/read', markAsRead);

module.exports = router;
