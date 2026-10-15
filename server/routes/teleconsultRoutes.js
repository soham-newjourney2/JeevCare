const express = require('express');
const router = express.Router();
const { requestConsultation, getConsultations, updateStatus, getVets } = require('../controllers/teleconsultController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/vets').get(protect, authorize('citizen'), getVets);

router.route('/')
    .post(protect, authorize('citizen'), requestConsultation)
    .get(protect, authorize('citizen', 'service_provider'), getConsultations);

router.route('/:id/status')
    .patch(protect, authorize('service_provider'), updateStatus);

module.exports = router;
