const express = require('express');
const router = express.Router();
const { getAnalytics, getAllCases, markFalseReport, getAuditLogs, broadcastAlert } = require('../controllers/authorityController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);
router.use(authorize('authority'));

router.get('/analytics', getAnalytics);
router.get('/cases', getAllCases);
router.patch('/cases/:id/mark-false', markFalseReport);
router.get('/audit-logs', getAuditLogs);
router.post('/broadcast', broadcastAlert);

module.exports = router;
