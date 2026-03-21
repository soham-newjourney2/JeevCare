const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Authenticated route to view all active campaigns (Citizens see all, NGOs see their own)
router.get('/', protect, donationController.getAllCampaigns);

// NGO specific route to create campaigns
router.post('/', protect, authorize('ngo'), donationController.createCampaign);

// Citizen specific route to pledge a donation
router.post('/donate', protect, authorize('citizen'), donationController.processDonation);

// Citizen specific route to get personal donation history
router.get('/history', protect, authorize('citizen'), donationController.getDonationHistory);

module.exports = router;
