const express = require('express');
const { getWorkflowAlerts, generateNotifications } = require('../controllers/workflowController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.route('/alerts').get(getWorkflowAlerts);
router.route('/generate-notifications').post(generateNotifications);

module.exports = router;
