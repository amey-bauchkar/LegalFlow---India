const express = require('express');
const { getCases, getCase, createCase, updateCase, deleteCase } = require('../controllers/caseController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getCases)
  .post(createCase);

router.route('/:id')
  .get(getCase)
  .put(updateCase)
  .delete(authorize('admin'), deleteCase);

module.exports = router;
