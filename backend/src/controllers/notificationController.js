const Notification = require('../models/Notification');
const { serverError, fail, paginated, parsePagination } = require('../utils/apiResponse');

exports.getAll = async (req, res) => {
  try {
    const { category, type } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (type) filter.type = type;

    // Pagination is opt-in. Without ?page/?limit this keeps the previous
    // behaviour exactly: the newest 100, and `total` so the UI can show how many
    // exist beyond them (it used to report nothing at all).
    const { page, limit, skip, isPaginated } = parsePagination(req.query, { defaultLimit: 50 });
    const effectiveLimit = isPaginated ? limit : 100;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(isPaginated ? skip : 0)
        .limit(effectiveLimit),
      Notification.countDocuments(filter),
    ]);

    return paginated(res, {
      data: notifications,
      total,
      page: isPaginated ? page : 1,
      limit: effectiveLimit,
    });
  } catch (error) {
    return serverError(res, error, 'notification.getAll');
  }
};

exports.create = async (req, res) => {
  try {
    const { title, message, type, category, link, isBroadcast, userId } = req.body;
    if (!title || !message) return fail(res, 400, 'Title and message are required');

    if (isBroadcast) {
      const notification = await Notification.create({ title, message, type, category, link, isBroadcast: true });
      res.status(201).json({ success: true, data: notification, message: 'Broadcast notification created' });
    } else if (userId) {
      const notification = await Notification.create({ userId, title, message, type, category, link });
      res.status(201).json({ success: true, data: notification });
    } else {
      return fail(res, 400, 'Specify userId or set isBroadcast to true');
    }
  } catch (error) {
    return serverError(res, error, 'notification.create');
  }
};

exports.remove = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return fail(res, 404, 'Notification not found');
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    return serverError(res, error, 'notification.remove');
  }
};

// Protected user endpoints
exports.getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [{ userId: req.user._id }, { isBroadcast: true }]
    }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: notifications });
  } catch (error) {
    return serverError(res, error, 'notification.getUserNotifications');
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, $or: [{ userId: req.user._id }, { isBroadcast: true }] },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) return fail(res, 404, 'Notification not found');
    res.json({ success: true, data: notification });
  } catch (error) {
    return serverError(res, error, 'notification.markAsRead');
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { $or: [{ userId: req.user._id }, { isBroadcast: true }], isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return serverError(res, error, 'notification.markAllRead');
  }
};
