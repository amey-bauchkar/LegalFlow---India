const Document = require('../models/Document');
const Case = require('../models/Case');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/documents
exports.getDocuments = asyncHandler(async (req, res) => {
  const { search, type, status, caseId, sort, page = 1, limit = 50 } = req.query;
  let filter = {};

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { type: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } }
    ];
  }
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (caseId) filter.caseId = caseId;

  // Role-based filtering
  if (req.user.role === 'lawyer') {
    const lawyerCases = await Case.find({ advocate: req.user._id }).select('_id');
    filter.caseId = { $in: lawyerCases.map(c => c._id) };
  } else if (req.user.role === 'client') {
    const clientCases = await Case.find({ client: req.user.linkedClientId }).select('_id');
    filter.caseId = { $in: clientCases.map(c => c._id) };
  }

  let sortObj = { uploadDate: -1 };
  if (sort) {
    const [field, order] = sort.split(':');
    sortObj = { [field]: order === 'asc' ? 1 : -1 };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [documents, total] = await Promise.all([
    Document.find(filter).populate('caseId', 'title caseNumber').sort(sortObj).skip(skip).limit(Number(limit)),
    Document.countDocuments(filter)
  ]);

  res.json({
    success: true,
    message: 'Documents retrieved.',
    data: documents,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
  });
});

// POST /api/documents/upload
exports.uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a file.' });
  }
  const { title, type, category, caseId, status } = req.body;
  if (!title || !caseId) {
    return res.status(400).json({ success: false, message: 'Title and caseId are required.' });
  }

  const doc = await Document.create({
    title,
    type: type || '',
    category: category || '',
    caseId,
    uploadedBy: req.user._id,
    uploadedByName: req.user.name,
    fileUrl: `/uploads/${req.file.filename}`,
    fileSize: `${(req.file.size / 1024).toFixed(0)} KB`,
    status: status || 'Uploaded',
    uploadDate: new Date()
  });

  res.status(201).json({ success: true, message: 'Document uploaded.', data: doc });
});

// GET /api/documents/:id
exports.getDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id).populate('caseId', 'title caseNumber');
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });
  res.json({ success: true, message: 'Document retrieved.', data: doc });
});

// DELETE /api/documents/:id
exports.deleteDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });
  await Document.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Document deleted.', data: null });
});

// PUT /api/documents/:id/sign - Simulated e-signature
exports.signDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

  doc.signedBy = req.user._id;
  doc.signedByName = req.user.name;
  doc.signedAt = new Date();
  doc.status = 'Verified';
  await doc.save();

  // Audit log
  const AuditLog = require('../models/AuditLog');
  await AuditLog.create({
    action: 'sign', entity: 'document', entityId: doc._id,
    entityTitle: doc.title,
    userId: req.user._id, userName: req.user.name, userRole: req.user.role,
    details: `E-signed document: ${doc.title}`
  });

  res.json({ success: true, message: 'Document signed successfully.', data: doc });
});
