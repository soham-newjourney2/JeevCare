const express = require('express');
const router = express.Router();
const { getLeaderboard, getMyStatus } = require('../controllers/communityController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/leaderboard').get(getLeaderboard);
router.route('/me').get(protect, authorize('citizen'), getMyStatus);

module.exports = router;
