const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
  title: { type: String, required: [true, 'Task title is required'], trim: true },
  assignee: { type: String, default: '' },
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dueDate: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'In Progress', 'Not Started', 'Completed', 'Overdue'], default: 'Pending' },
  priority: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Medium' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Task', taskSchema);
