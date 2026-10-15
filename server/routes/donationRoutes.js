const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, donationController.getAllCampaigns);

router.post('/', protect, authorize('ngo'), donationController.createCampaign);

router.post('/donate', protect, authorize('citizen'), donationController.processDonation);

router.get('/history', protect, authorize('citizen'), donationController.getDonationHistory);

module.exports = router;
