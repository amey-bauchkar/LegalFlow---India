const Client = require('../models/Client');
const Case = require('../models/Case');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/clients
exports.getClients = asyncHandler(async (req, res) => {
  const { search, type, status, sort, page = 1, limit = 50 } = req.query;
  let filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { pan: { $regex: search, $options: 'i' } },
      { contact: { $regex: search, $options: 'i' } }
    ];
  }
  if (type) filter.type = type;
  if (status) filter.status = status;

  // Lawyer: only show clients associated with their cases
  if (req.user.role === 'lawyer') {
    const lawyerCases = await Case.find({ advocate: req.user._id }).select('client');
    const clientIds = [...new Set(lawyerCases.map(c => c.client.toString()))];
    filter._id = { $in: clientIds };
  }

  let sortObj = { name: 1 };
  if (sort) {
    const [field, order] = sort.split(':');
    sortObj = { [field]: order === 'asc' ? 1 : -1 };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [clients, total] = await Promise.all([
    Client.find(filter).sort(sortObj).skip(skip).limit(Number(limit)),
    Client.countDocuments(filter)
  ]);

  // Enrich with active case count and billing info
  const enriched = await Promise.all(clients.map(async (client) => {
    const cases = await Case.find({ client: client._id });
    const activeCases = cases.filter(c => c.status === 'Active').length;
    const totalBilled = cases.reduce((sum, c) => sum + (c.totalBilled || 0), 0);
    return { ...client.toObject(), activeCases, totalBilled };
  }));

  res.json({
    success: true,
    message: 'Clients retrieved.',
    data: enriched,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
  });
});

// GET /api/clients/:id
exports.getClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });
  res.json({ success: true, message: 'Client retrieved.', data: client });
});

// POST /api/clients
exports.createClient = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user._id;
  const client = await Client.create(req.body);
  res.status(201).json({ success: true, message: 'Client created.', data: client });
});

// PUT /api/clients/:id
exports.updateClient = asyncHandler(async (req, res) => {
  const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });
  res.json({ success: true, message: 'Client updated.', data: client });
});

// DELETE /api/clients/:id
exports.deleteClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });
  await Client.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Client deleted.', data: null });
});
