const express = require('express');
const { getNotifications, markRead, markAllRead, getUnreadCount } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.route('/').get(getNotifications);
router.route('/unread-count').get(getUnreadCount);
router.route('/read-all').put(markAllRead);
router.route('/:id/read').put(markRead);

module.exports = router;
