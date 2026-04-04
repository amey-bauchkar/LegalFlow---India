const express = require('express');
const { getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice } = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getInvoices)
  .post(createInvoice);

router.route('/:id')
  .get(getInvoice)
  .put(updateInvoice)
  .delete(authorize('admin'), deleteInvoice);

module.exports = router;
