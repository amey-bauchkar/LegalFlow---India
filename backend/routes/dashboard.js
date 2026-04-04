const express = require('express');
const { getDashboardStats } = require('../controllers/calendarController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/stats', getDashboardStats);

module.exports = router;
