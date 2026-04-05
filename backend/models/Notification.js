const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true, enum: ['hearing', 'invoice', 'document', 'message', 'system', 'workflow'] },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  link: { type: String, default: '' }, // hash route e.g. '/cases/abc123'
  read: { type: Boolean, default: false },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
  createdAt: { type: Date, default: Date.now }
});

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
