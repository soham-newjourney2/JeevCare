const express = require('express');
const router = express.Router();
const {
    createProfile,
    getProfiles,
    getProfile,
    applyForAdoption,
    getNgoApplications,
    updateApplicationStatus
} = require('../controllers/adoptionController');

const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
    .get(getProfiles)
    .post(protect, authorize('service_provider'), createProfile);

router.route('/provider/applications')
    .get(protect, authorize('service_provider'), getNgoApplications);

router.route('/applications/:id/status')
    .patch(protect, authorize('service_provider'), updateApplicationStatus);

router.route('/:id')
    .get(getProfile);

router.route('/:id/apply')
    .post(protect, authorize('citizen'), applyForAdoption);

module.exports = router;
