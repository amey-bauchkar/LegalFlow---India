const express = require('express');
const { getDocumentRequests, createDocumentRequest, updateDocumentRequest } = require('../controllers/documentRequestController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.route('/').get(getDocumentRequests).post(createDocumentRequest);
router.route('/:id').put(updateDocumentRequest);

module.exports = router;
