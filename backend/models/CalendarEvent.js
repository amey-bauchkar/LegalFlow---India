const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', default: null },
  title: { type: String, required: [true, 'Event title is required'], trim: true },
  date: { type: String, required: true },
  time: { type: String, default: '' },
  court: { type: String, default: '' },
  type: { type: String, enum: ['Hearing', 'Deadline', 'Meeting', 'Other'], default: 'Other' },
  priority: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Medium' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
