const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Document title is required'], trim: true },
  type: { type: String, default: '' },
  category: { type: String, default: '' },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedByName: { type: String, default: '' },
  fileUrl: { type: String, default: '' },
  fileSize: { type: String, default: '' },
  status: { type: String, enum: ['Verified', 'Filed', 'Uploaded', 'Pending Review'], default: 'Uploaded' },
  uploadDate: { type: Date, default: Date.now },
  signedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  signedByName: { type: String, default: '' },
  signedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

documentSchema.index({ title: 'text', type: 'text' });

module.exports = mongoose.model('Document', documentSchema);
