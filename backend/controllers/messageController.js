const Message = require('../models/Message');
const Case = require('../models/Case');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/messages?caseId=xxx
exports.getMessages = asyncHandler(async (req, res) => {
  const { caseId, page = 1, limit = 50 } = req.query;
  if (!caseId) return res.status(400).json({ success: false, message: 'caseId is required.' });

  // Check case access for client users
  if (req.user.role === 'client') {
    const cs = await Case.findById(caseId);
    if (!cs || !cs.client || cs.client.toString() !== (req.user.linkedClientId || '').toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
  } else if (req.user.role === 'lawyer') {
    const cs = await Case.findById(caseId);
    if (!cs || !cs.advocate || cs.advocate.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [messages, total] = await Promise.all([
    Message.find({ caseId }).sort({ createdAt: 1 }).skip(skip).limit(Number(limit)),
    Message.countDocuments({ caseId })
  ]);

  // Mark messages as read by this user
  await Message.updateMany(
    { caseId, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );

  res.json({ success: true, data: messages, pagination: { total, page: Number(page), limit: Number(limit) } });
});

// POST /api/messages
exports.createMessage = asyncHandler(async (req, res) => {
  const { caseId, text } = req.body;
  if (!caseId || !text) return res.status(400).json({ success: false, message: 'caseId and text required.' });

  const cs = await Case.findById(caseId);
  if (!cs) return res.status(404).json({ success: false, message: 'Case not found.' });

  const message = await Message.create({
    caseId,
    sender: req.user._id,
    senderName: req.user.name,
    senderRole: req.user.role,
    text,
    readBy: [req.user._id]
  });

  // Notify the other party
  const recipientId = req.user.role === 'client' ? cs.advocate : (cs.client ? undefined : cs.advocate);
  // Notify advocate if client sends, or notify all relevant parties
  if (cs.advocate && cs.advocate.toString() !== req.user._id.toString()) {
    await Notification.create({
      userId: cs.advocate,
      type: 'message',
      title: `New message on ${cs.title}`,
      message: text.substring(0, 100),
      link: `/cases/${caseId}`,
      caseId
    });
  }

  // Audit log
  await AuditLog.create({
    action: 'create', entity: 'message', entityId: message._id,
    entityTitle: `Message on ${cs.title}`,
    userId: req.user._id, userName: req.user.name, userRole: req.user.role,
    details: `Sent message on case ${cs.caseNumber}`
  });

  res.status(201).json({ success: true, data: message, message: 'Message sent.' });
});
