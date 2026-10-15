const express = require('express');
const router = express.Router();
const { createIncident, getIncidentById, getMyReports } = require('../controllers/incidentController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { verifyImage } = require('../middleware/uploadMiddleware');
const sanitizeBody = require('../middleware/sanitizeBody');

// Multer parses multipart fields after the global sanitizer has run, so sanitize again
router.post('/', optionalAuth, upload.single('image'), verifyImage, sanitizeBody, createIncident);
router.get('/my-reports', protect, getMyReports);
router.get('/:id', protect, getIncidentById);

module.exports = router;
