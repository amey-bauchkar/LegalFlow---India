const Case = require('../models/Case');
const { asyncHandler } = require('../middleware/errorHandler');

// Helper: build query with search, filter, sort, pagination
const buildQuery = (req, baseFilter = {}) => {
  const { search, status, priority, court, stage, sort, page = 1, limit = 50 } = req.query;
  let filter = { ...baseFilter };

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { caseNumber: { $regex: search, $options: 'i' } },
      { clientName: { $regex: search, $options: 'i' } },
      { courtName: { $regex: search, $options: 'i' } },
      { advocateName: { $regex: search, $options: 'i' } }
    ];
  }
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (court) filter.courtKey = court;
  if (stage !== undefined) filter.stage = Number(stage);

  let sortObj = { updatedAt: -1 };
  if (sort) {
    const [field, order] = sort.split(':');
    sortObj = { [field]: order === 'asc' ? 1 : -1 };
  }

  const skip = (Number(page) - 1) * Number(limit);
  return { filter, sortObj, skip, limit: Number(limit), page: Number(page) };
};

// GET /api/cases
exports.getCases = asyncHandler(async (req, res) => {
  let baseFilter = {};
  // Lawyers can only see their assigned cases
  if (req.user.role === 'lawyer') {
    baseFilter.advocate = req.user._id;
  }
  const { filter, sortObj, skip, limit, page } = buildQuery(req, baseFilter);
  const [cases, total] = await Promise.all([
    Case.find(filter).populate('client', 'name type').populate('advocate', 'name').sort(sortObj).skip(skip).limit(limit),
    Case.countDocuments(filter)
  ]);

  res.json({
    success: true,
    message: 'Cases retrieved.',
    data: cases,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) }
  });
});

// GET /api/cases/:id
exports.getCase = asyncHandler(async (req, res) => {
  const c = await Case.findById(req.params.id).populate('client').populate('advocate', 'name email designation');
  if (!c) return res.status(404).json({ success: false, message: 'Case not found.' });
  // Lawyer check
  if (req.user.role === 'lawyer' && c.advocate && c.advocate._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized to view this case.' });
  }
  res.json({ success: true, message: 'Case retrieved.', data: c });
});

// POST /api/cases
exports.createCase = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user._id;
  if (!req.body.advocate) req.body.advocate = req.user._id;
  const c = await Case.create(req.body);
  const populated = await Case.findById(c._id).populate('client', 'name type').populate('advocate', 'name');
  res.status(201).json({ success: true, message: 'Case created.', data: populated });
});

// PUT /api/cases/:id
exports.updateCase = asyncHandler(async (req, res) => {
  let c = await Case.findById(req.params.id);
  if (!c) return res.status(404).json({ success: false, message: 'Case not found.' });
  if (req.user.role === 'lawyer' && c.advocate && c.advocate.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized to update this case.' });
  }
  c = await Case.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    .populate('client', 'name type').populate('advocate', 'name');
  res.json({ success: true, message: 'Case updated.', data: c });
});

// DELETE /api/cases/:id
exports.deleteCase = asyncHandler(async (req, res) => {
  const c = await Case.findById(req.params.id);
  if (!c) return res.status(404).json({ success: false, message: 'Case not found.' });
  await Case.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Case deleted.', data: null });
});
