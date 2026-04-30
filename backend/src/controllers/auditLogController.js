const AuditLog = require('../models/AuditLog');

exports.getLogs = async (req, res) => {
  try {
    const { resource, action, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (resource) filter.resource = resource;
    if (action) filter.action = action;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate('userId', 'name email'),
      AuditLog.countDocuments(filter)
    ]);

    res.json({ success: true, data: logs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
