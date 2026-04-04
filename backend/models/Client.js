const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Client name is required'], trim: true },
  contact: { type: String, default: '' },
  email: { type: String, default: '', lowercase: true, trim: true },
  phone: { type: String, default: '', match: [/^(\+91[\s-]?)?[0-9\s-]{5,15}$/, 'Please provide a valid Indian phone number'] },
  address: { type: String, default: '' },
  type: { type: String, enum: ['Corporate', 'Individual'], default: 'Individual' },
  industry: { type: String, default: '' },
  gst: { type: String, default: null },
  pan: { type: String, default: '', match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$|^$/, 'Invalid PAN format'] },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

clientSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

clientSchema.index({ name: 'text', email: 'text', pan: 'text' });

module.exports = mongoose.model('Client', clientSchema);
