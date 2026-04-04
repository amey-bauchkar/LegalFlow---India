const express = require('express');
const { getDocuments, uploadDocument, getDocument, deleteDocument } = require('../controllers/documentController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getDocuments);

router.post('/upload', upload.single('file'), uploadDocument);

router.route('/:id')
  .get(getDocument)
  .delete(deleteDocument);

module.exports = router;
