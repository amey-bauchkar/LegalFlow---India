const Invoice = require('../models/Invoice');
const Case = require('../models/Case');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/invoices
exports.getInvoices = asyncHandler(async (req, res) => {
  const { search, status, type, clientId, caseId, sort, page = 1, limit = 50 } = req.query;
  let filter = {};

  if (search) {
    filter.$or = [
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { clientName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (clientId) filter.clientId = clientId;
  if (caseId) filter.caseId = caseId;

  // Lawyer: only invoices for their cases
  if (req.user.role === 'lawyer') {
    const lawyerCases = await Case.find({ advocate: req.user._id }).select('_id');
    filter.caseId = { $in: lawyerCases.map(c => c._id) };
  }

  let sortObj = { date: -1 };
  if (sort) {
    const [field, order] = sort.split(':');
    sortObj = { [field]: order === 'asc' ? 1 : -1 };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [invoices, total] = await Promise.all([
    Invoice.find(filter).populate('caseId', 'title caseNumber').populate('clientId', 'name').sort(sortObj).skip(skip).limit(Number(limit)),
    Invoice.countDocuments(filter)
  ]);

  // Aggregate stats
  const allInvoices = await Invoice.find(req.user.role === 'lawyer' ? { caseId: filter.caseId } : {});
  const stats = {
    totalBilled: allInvoices.reduce((s, i) => s + i.total, 0),
    totalPaid: allInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.total, 0),
    totalPending: allInvoices.filter(i => i.status === 'Pending').reduce((s, i) => s + i.total, 0),
    totalOverdue: allInvoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + i.total, 0)
  };

  res.json({
    success: true,
    message: 'Invoices retrieved.',
    data: invoices,
    stats,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
  });
});

// GET /api/invoices/:id
exports.getInvoice = asyncHandler(async (req, res) => {
  const inv = await Invoice.findById(req.params.id).populate('caseId', 'title caseNumber').populate('clientId', 'name');
  if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found.' });
  res.json({ success: true, message: 'Invoice retrieved.', data: inv });
});

// POST /api/invoices
exports.createInvoice = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user._id;
  const inv = await Invoice.create(req.body);
  const populated = await Invoice.findById(inv._id).populate('caseId', 'title caseNumber').populate('clientId', 'name');
  res.status(201).json({ success: true, message: 'Invoice created.', data: populated });
});

// PUT /api/invoices/:id
exports.updateInvoice = asyncHandler(async (req, res) => {
  let inv = await Invoice.findById(req.params.id);
  if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found.' });
  
  // If updating amount, recalculate GST/total
  if (req.body.amount !== undefined) {
    req.body.gst = Math.round(req.body.amount * 0.18);
    req.body.total = req.body.amount + req.body.gst;
  }
  
  inv = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    .populate('caseId', 'title caseNumber').populate('clientId', 'name');
  res.json({ success: true, message: 'Invoice updated.', data: inv });
});

// DELETE /api/invoices/:id
exports.deleteInvoice = asyncHandler(async (req, res) => {
  const inv = await Invoice.findById(req.params.id);
  if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found.' });
  await Invoice.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Invoice deleted.', data: null });
});
