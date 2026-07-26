const AuditLog = require('../models/AuditLog');
const { serverError, paginated, parsePagination } = require('../utils/apiResponse');

exports.getLogs = async (req, res) => {
  try {
    const { resource, action } = req.query;
    const filter = {};
    if (resource) filter.resource = resource;
    if (action) filter.action = action;

    // parsePagination replaces the bare parseInt() arithmetic, which produced
    // NaN skip/limit for ?page=abc and accepted an unbounded ?limit=100000.
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email'),
      AuditLog.countDocuments(filter),
    ]);

    return paginated(res, { data: logs, total, page, limit });
  } catch (error) {
    return serverError(res, error, 'auditLog.getLogs');
  }
};
