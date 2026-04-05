const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/notifications
exports.getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, unreadOnly } = req.query;
  const filter = { userId: req.user._id };
  if (unreadOnly === 'true') filter.read = false;

  const skip = (Number(page) - 1) * Number(limit);
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId: req.user._id, read: false })
  ]);

  res.json({
    success: true,
    data: notifications,
    unreadCount,
    pagination: { total, page: Number(page), limit: Number(limit) }
  });
});

// PUT /api/notifications/:id/read
exports.markRead = asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notif) return res.status(404).json({ success: false, message: 'Notification not found.' });
  res.json({ success: true, data: notif });
});

// PUT /api/notifications/read-all
exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  res.json({ success: true, message: 'All notifications marked as read.' });
});

// GET /api/notifications/unread-count
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user._id, read: false });
  res.json({ success: true, data: { count } });
});
