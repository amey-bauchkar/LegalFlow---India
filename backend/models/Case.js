const mongoose = require('mongoose');

const adjournmentSchema = new mongoose.Schema({
  date: String,
  reason: String,
  nextDate: String
}, { _id: false });

const timelineSchema = new mongoose.Schema({
  date: String,
  type: { type: String, enum: ['Filing', 'Registration', 'Hearing', 'Order', 'Adjournment', 'Stage'] },
  description: String
}, { _id: false });

const caseSchema = new mongoose.Schema({
  caseNumber: { type: String, required: [true, 'Case number is required'], unique: true, trim: true },
  diaryNumber: { type: String, default: '' },
  title: { type: String, required: [true, 'Case title is required'], trim: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  clientName: { type: String, default: '' },
  courtKey: { type: String, default: '' },
  courtName: { type: String, default: '' },
  bench: { type: String, default: '' },
  opposingParty: { type: String, default: '' },
  advocate: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  advocateName: { type: String, default: '' },
  filingType: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Pending', 'Closed', 'Disposed'], default: 'Active' },
  priority: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Medium' },
  stage: { type: Number, default: 0, min: 0, max: 7 },
  filingDate: { type: String, default: '' },
  registrationDate: { type: String, default: '' },
  nextHearingDate: { type: String, default: '' },
  lastHearingDate: { type: String, default: '' },
  lastOrderDate: { type: String, default: '' },
  filingDeadline: { type: String, default: '' },
  lastHearingOutcome: { type: String, default: '' },
  causeListRef: { type: String, default: '' },
  nextActionDate: { type: String, default: '' },
  description: { type: String, default: '' },
  billingType: { type: String, default: '' },
  totalBilled: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  adjournmentHistory: [adjournmentSchema],
  timeline: [timelineSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

caseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

caseSchema.index({ title: 'text', caseNumber: 'text', courtName: 'text' });

module.exports = mongoose.model('Case', caseSchema);
