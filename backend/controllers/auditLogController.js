const AuditLog = require('../models/AuditLog');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/audit-logs (admin only)
exports.getAuditLogs = asyncHandler(async (req, res) => {
  const { entity, action, page = 1, limit = 50, userId } = req.query;
  const filter = {};
  if (entity) filter.entity = entity;
  if (action) filter.action = action;
  if (userId) filter.userId = userId;

  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    AuditLog.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
  });
});

// Helper: create audit log entry (used by other controllers)
exports.createAuditEntry = async ({ action, entity, entityId, entityTitle, userId, userName, userRole, details }) => {
  try {
    await AuditLog.create({ action, entity, entityId, entityTitle, userId, userName, userRole, details });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};
