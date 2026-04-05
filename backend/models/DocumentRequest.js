const mongoose = require('mongoose');

const documentRequestSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['Requested', 'Uploaded', 'Reviewed'], default: 'Requested' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedByName: { type: String, default: '' },
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  respondedByName: { type: String, default: '' },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }, // linked uploaded doc
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

documentRequestSchema.index({ caseId: 1, status: 1 });

module.exports = mongoose.model('DocumentRequest', documentRequestSchema);
