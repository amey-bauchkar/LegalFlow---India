const CalendarEvent = require('../models/CalendarEvent');
const Case = require('../models/Case');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/calendar
exports.getEvents = asyncHandler(async (req, res) => {
  const { month, year, type, priority, sort, page = 1, limit = 100 } = req.query;
  let filter = {};

  if (type) filter.type = type;
  if (priority) filter.priority = priority;

  // Filter by month/year if provided
  if (month && year) {
    const m = String(month).padStart(2, '0');
    filter.date = { $regex: `^${year}-${m}` };
  }

  if (req.user.role === 'lawyer') {
    const lawyerCases = await Case.find({ advocate: req.user._id }).select('_id');
    const caseIds = lawyerCases.map(c => c._id);
    filter.$or = [
      { caseId: { $in: caseIds } },
      { caseId: null }
    ];
  }

  let sortObj = { date: 1 };
  if (sort) {
    const [field, order] = sort.split(':');
    sortObj = { [field]: order === 'asc' ? 1 : -1 };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [events, total] = await Promise.all([
    CalendarEvent.find(filter).populate('caseId', 'title caseNumber').sort(sortObj).skip(skip).limit(Number(limit)),
    CalendarEvent.countDocuments(filter)
  ]);

  res.json({
    success: true,
    message: 'Calendar events retrieved.',
    data: events,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
  });
});

// POST /api/calendar
exports.createEvent = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user._id;
  const event = await CalendarEvent.create(req.body);
  res.status(201).json({ success: true, message: 'Event created.', data: event });
});

// PUT /api/calendar/:id
exports.updateEvent = asyncHandler(async (req, res) => {
  const event = await CalendarEvent.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
  res.json({ success: true, message: 'Event updated.', data: event });
});

// DELETE /api/calendar/:id
exports.deleteEvent = asyncHandler(async (req, res) => {
  const event = await CalendarEvent.findById(req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
  await CalendarEvent.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Event deleted.', data: null });
});

// GET /api/dashboard/stats
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const Case = require('../models/Case');
  const Invoice = require('../models/Invoice');
  const Task = require('../models/Task');

  let caseFilter = {};
  if (req.user.role === 'lawyer') {
    caseFilter.advocate = req.user._id;
  }

  const [allCases, allInvoices, allTasks, allEvents] = await Promise.all([
    Case.find(caseFilter).populate('client', 'name type'),
    Invoice.find(req.user.role === 'lawyer' ? { caseId: { $in: (await Case.find(caseFilter).select('_id')).map(c => c._id) } } : {}),
    Task.find(req.user.role === 'lawyer' ? { caseId: { $in: (await Case.find(caseFilter).select('_id')).map(c => c._id) } } : {}),
    CalendarEvent.find(req.user.role === 'lawyer' ? { $or: [{ caseId: { $in: (await Case.find(caseFilter).select('_id')).map(c => c._id) } }, { caseId: null }] } : {})
  ]);

  const activeCases = allCases.filter(c => c.status === 'Active');
  const totalRevenue = allInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.total, 0);
  const totalOutstanding = allInvoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + i.total, 0);
  const overdueInvoices = allInvoices.filter(i => i.status === 'Overdue');
  const overdueTasks = allTasks.filter(t => t.status === 'Overdue');

  res.json({
    success: true,
    message: 'Dashboard stats retrieved.',
    data: {
      totalCases: allCases.length,
      activeCases: activeCases.length,
      totalRevenue,
      totalOutstanding,
      cases: allCases,
      invoices: allInvoices,
      tasks: allTasks,
      events: allEvents,
      overdueInvoices,
      overdueTasks
    }
  });
});
