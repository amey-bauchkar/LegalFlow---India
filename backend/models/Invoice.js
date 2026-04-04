const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true, trim: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  clientName: { type: String, default: '' },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
  amount: { type: Number, required: [true, 'Amount is required'], min: 0 },
  gst: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  type: { type: String, enum: ['Fixed Fee', 'Hourly', 'Retainership', 'Milestone-Based', 'Event-Based'], default: 'Fixed Fee' },
  status: { type: String, enum: ['Paid', 'Pending', 'Overdue'], default: 'Pending' },
  description: { type: String, default: '' },
  date: { type: String, default: '' },
  dueDate: { type: String, default: '' },
  paidDate: { type: String, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

invoiceSchema.pre('save', function(next) {
  this.gst = Math.round(this.amount * 0.18);
  this.total = this.amount + this.gst;
  this.updatedAt = Date.now();
  next();
});

invoiceSchema.index({ invoiceNumber: 'text', clientName: 'text' });

module.exports = mongoose.model('Invoice', invoiceSchema);
