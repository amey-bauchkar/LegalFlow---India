const express = require('express');
const { getEvents, createEvent, updateEvent, deleteEvent, getDashboardStats } = require('../controllers/calendarController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getEvents)
  .post(createEvent);

router.route('/:id')
  .put(updateEvent)
  .delete(deleteEvent);

module.exports = router;
