const Notification = require('../models/Notification');

exports.getAll = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, message, type, category, link, isBroadcast, targetRole, userId } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, message: 'Title and message are required' });

    if (isBroadcast) {
      const notification = await Notification.create({ title, message, type, category, link, isBroadcast: true, targetRole });
      res.status(201).json({ success: true, data: notification, message: 'Broadcast notification created' });
    } else if (userId) {
      const notification = await Notification.create({ userId, title, message, type, category, link });
      res.status(201).json({ success: true, data: notification });
    } else {
      return res.status(400).json({ success: false, message: 'Specify userId, targetRole, or set isBroadcast to true' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: Build precise non-duplicating filter for authenticated user
const getUserFilter = (user) => {
  const userRoles = [user.role];
  if (['admin', 'superadmin'].includes(user.role)) {
    userRoles.push('admin');
  }

  return {
    $or: [
      { userId: user._id },
      { targetRole: { $in: userRoles }, userId: { $exists: false } },
      { isBroadcast: true, userId: { $exists: false } },
    ],
  };
};

// Protected user endpoints
exports.getUserNotifications = async (req, res) => {
  try {
    const filter = getUserFilter(req.user);

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(50),
      Notification.countDocuments({ ...filter, isRead: false }),
    ]);

    res.json({
      success: true,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const filter = getUserFilter(req.user);

    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        ...filter,
      },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const filter = getUserFilter(req.user);

    await Notification.updateMany(
      {
        ...filter,
        isRead: false,
      },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
