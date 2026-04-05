const express = require('express');
const { getMessages, createMessage } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.route('/').get(getMessages).post(createMessage);

module.exports = router;
