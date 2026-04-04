const express = require('express');
const { getUsers, getUser, updateUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getUsers);

router.route('/:id')
  .get(getUser)
  .put(authorize('admin'), updateUser);

module.exports = router;
