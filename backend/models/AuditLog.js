const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true, enum: ['create', 'update', 'delete', 'upload', 'sign', 'login', 'request'] },
  entity: { type: String, required: true }, // 'case', 'client', 'document', 'invoice', 'user', 'message'
  entityId: { type: mongoose.Schema.Types.ObjectId },
  entityTitle: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, default: '' },
  userRole: { type: String, default: '' },
  details: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
