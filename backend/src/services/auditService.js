const AuditLog = require('../models/AuditLog');

exports.logAction = async ({ userId, action, resource, resourceId, description, changes, req }) => {
  try {
    await AuditLog.create({
      userId,
      action,
      resource,
      resourceId,
      description,
      changes,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent']
    });
  } catch (error) {
    console.error('[audit] Failed to log action:', error.message);
  }
};
