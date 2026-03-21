const express = require('express');
const router = express.Router();
const { createIncident, getIncidentById, getMyReports } = require('../controllers/incidentController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const optionalAuth = async (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
        } catch (error) {
            console.error('Optional auth token verify failed:', error.message);
        }
    }
    next();
};

router.post('/', optionalAuth, upload.single('image'), createIncident);
router.get('/my-reports', protect, getMyReports);
router.get('/:id', getIncidentById);

module.exports = router;
