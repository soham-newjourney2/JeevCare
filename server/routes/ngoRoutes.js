const express = require('express');
const router = express.Router();
const { getCases, acceptCase, rejectCase, updateCaseStatus, getProfile, dispatchTeam, getNgoAnalytics } = require('../controllers/ngoController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);
router.use(authorize('ngo'));

router.get('/profile', getProfile);
router.get('/cases', getCases);
router.patch('/cases/:id/accept', acceptCase);
router.patch('/cases/:id/reject', rejectCase);
router.patch('/cases/:id/status', updateCaseStatus);
router.post('/cases/:id/dispatch', dispatchTeam);
router.get('/analytics', getNgoAnalytics);

module.exports = router;
