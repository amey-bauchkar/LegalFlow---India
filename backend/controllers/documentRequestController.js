const DocumentRequest = require('../models/DocumentRequest');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const Case = require('../models/Case');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/document-requests
exports.getDocumentRequests = asyncHandler(async (req, res) => {
  const { caseId, status, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (caseId) filter.caseId = caseId;
  if (status) filter.status = status;

  // Client can only see their own case requests
  if (req.user.role === 'client') {
    const clientCases = await Case.find({ client: req.user.linkedClientId }).select('_id');
    filter.caseId = { $in: clientCases.map(c => c._id) };
  } else if (req.user.role === 'lawyer') {
    const lawyerCases = await Case.find({ advocate: req.user._id }).select('_id');
    filter.caseId = { $in: lawyerCases.map(c => c._id) };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [requests, total] = await Promise.all([
    DocumentRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('caseId', 'title caseNumber'),
    DocumentRequest.countDocuments(filter)
  ]);

  res.json({ success: true, data: requests, pagination: { total, page: Number(page), limit: Number(limit) } });
});

// POST /api/document-requests
exports.createDocumentRequest = asyncHandler(async (req, res) => {
  const { caseId, clientId, title, description } = req.body;
  if (!caseId || !title) return res.status(400).json({ success: false, message: 'caseId and title required.' });

  const request = await DocumentRequest.create({
    caseId, clientId, title, description,
    requestedBy: req.user._id,
    requestedByName: req.user.name
  });

  // Audit
  await AuditLog.create({
    action: 'request', entity: 'document_request', entityId: request._id,
    entityTitle: title,
    userId: req.user._id, userName: req.user.name, userRole: req.user.role,
    details: `Requested document: ${title}`
  });

  res.status(201).json({ success: true, data: request, message: 'Document request created.' });
});

// PUT /api/document-requests/:id
exports.updateDocumentRequest = asyncHandler(async (req, res) => {
  const request = await DocumentRequest.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedAt: Date.now() },
    { new: true, runValidators: true }
  );
  if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
  res.json({ success: true, data: request, message: 'Request updated.' });
});
