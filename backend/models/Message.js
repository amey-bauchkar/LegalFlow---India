const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, default: '' },
  senderRole: { type: String, default: '' },
  text: { type: String, required: [true, 'Message text is required'], trim: true },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

messageSchema.index({ caseId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
