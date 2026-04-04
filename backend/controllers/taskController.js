const Task = require('../models/Task');
const Case = require('../models/Case');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/tasks
exports.getTasks = asyncHandler(async (req, res) => {
  const { search, status, priority, caseId, sort, page = 1, limit = 50 } = req.query;
  let filter = {};

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { assignee: { $regex: search, $options: 'i' } }
    ];
  }
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (caseId) filter.caseId = caseId;

  if (req.user.role === 'lawyer') {
    const lawyerCases = await Case.find({ advocate: req.user._id }).select('_id');
    filter.caseId = { $in: lawyerCases.map(c => c._id) };
  }

  let sortObj = { dueDate: 1 };
  if (sort) {
    const [field, order] = sort.split(':');
    sortObj = { [field]: order === 'asc' ? 1 : -1 };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [tasks, total] = await Promise.all([
    Task.find(filter).populate('caseId', 'title caseNumber').sort(sortObj).skip(skip).limit(Number(limit)),
    Task.countDocuments(filter)
  ]);

  res.json({
    success: true,
    message: 'Tasks retrieved.',
    data: tasks,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
  });
});

// GET /api/tasks/:id
exports.getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate('caseId', 'title caseNumber');
  if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
  res.json({ success: true, message: 'Task retrieved.', data: task });
});

// POST /api/tasks
exports.createTask = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user._id;
  const task = await Task.create(req.body);
  res.status(201).json({ success: true, message: 'Task created.', data: task });
});

// PUT /api/tasks/:id
exports.updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
  res.json({ success: true, message: 'Task updated.', data: task });
});

// DELETE /api/tasks/:id
exports.deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
  await Task.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Task deleted.', data: null });
});
