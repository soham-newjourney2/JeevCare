const Campaign = require('../models/Campaign');
const Donation = require('../models/Donation');
const Incident = require('../models/Incident');
const mongoose = require('mongoose');

// NGO creates a new fundraiser campaign
exports.createCampaign = async (req, res) => {
    try {
        const { title, description, targetAmount, relatedCase } = req.body;

        const campaignData = {
            title,
            description,
            targetAmount,
            ngo: req.user.id
        };

        // If linking to a case, verify the case exists and belongs to the NGO (optional safeguard)
        if (relatedCase) {
            if (!mongoose.isValidObjectId(relatedCase)) {
                return res.status(400).json({ message: 'Invalid Case ID format. Must be a 24-character hex string.' });
            }
            const existingCase = await Incident.findById(relatedCase);
            if (!existingCase) {
                return res.status(404).json({ message: 'Linked case not found' });
            }
            campaignData.relatedCase = relatedCase;
        }

        const campaign = new Campaign(campaignData);
        await campaign.save();

        res.status(201).json({ message: 'Campaign created successfully', data: campaign });
    } catch (err) {
        console.error('Error creating campaign:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all active campaigns (Citizens & NGOs)
exports.getAllCampaigns = async (req, res) => {
    try {
        const query = req.user.role === 'ngo' ? { ngo: req.user.id } : { status: 'active' };

        const campaigns = await Campaign.find(query)
            .populate('ngo', 'name email phone')
            .populate('relatedCase', 'animalType location status')
            .sort({ createdAt: -1 });

        res.json({ data: campaigns });
    } catch (err) {
        console.error('Error fetching campaigns:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Process a mock micro-donation from a Citizen
exports.processDonation = async (req, res) => {
    try {
        const { campaignId, amount } = req.body;

        if (!campaignId || !amount || amount <= 0) {
            return res.status(400).json({ message: 'Valid campaign ID and amount are required' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        if (campaign.status !== 'active') {
            return res.status(400).json({ message: 'This campaign is no longer active' });
        }

        // Mock payment processing
        const mockTransactionId = 'TXN_' + Math.random().toString(36).substr(2, 9).toUpperCase();

        const donation = new Donation({
            campaign: campaignId,
            citizen: req.user.id,
            amount: amount,
            status: 'successful',
            transactionId: mockTransactionId
        });

        await donation.save();

        // Update campaign progress
        campaign.currentAmount += amount;

        // Auto-close if target met (optional game logic)
        if (campaign.currentAmount >= campaign.targetAmount) {
            campaign.status = 'completed';
        }

        await campaign.save();

        res.status(200).json({
            message: 'Donation successful! Thank you for your support.',
            data: { donation, newTotal: campaign.currentAmount }
        });

    } catch (err) {
        console.error('Error processing donation:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Fetch personal donation history for a Citizen
exports.getDonationHistory = async (req, res) => {
    try {
        const donations = await Donation.find({ citizen: req.user.id })
            .populate('campaign', 'title ngo targetAmount')
            .sort({ createdAt: -1 });

        res.json({ data: donations });
    } catch (err) {
        console.error('Error fetching donation history:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
