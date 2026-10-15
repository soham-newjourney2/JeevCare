const Campaign = require('../models/Campaign');
const Donation = require('../models/Donation');
const Incident = require('../models/Incident');
const mongoose = require('mongoose');
const crypto = require('crypto');

// POST /api/donations
exports.createCampaign = async (req, res) => {
    try {
        const { title, description, relatedCase } = req.body;
        const targetAmount = Number(req.body.targetAmount);

        if (typeof title !== 'string' || !title.trim() || typeof description !== 'string' || !description.trim()) {
            return res.status(400).json({ message: 'Title and description are required' });
        }
        if (!Number.isFinite(targetAmount) || targetAmount <= 0 || targetAmount > 100000000) {
            return res.status(400).json({ message: 'Target amount must be a positive number' });
        }

        const campaignData = {
            title: title.trim(),
            description: description.trim(),
            targetAmount,
            ngo: req.user.id
        };

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

// GET /api/donations (NGOs see their own campaigns, citizens see active ones)
exports.getAllCampaigns = async (req, res) => {
    try {
        const query = req.user.role === 'ngo' ? { ngo: req.user.id } : { status: 'active' };

        const campaigns = await Campaign.find(query)
            .populate('ngo', 'name')
            .populate('relatedCase', 'animalType location status')
            .sort({ createdAt: -1 });

        res.json({ data: campaigns });
    } catch (err) {
        console.error('Error fetching campaigns:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/donations/donate
exports.processDonation = async (req, res) => {
    try {
        const { campaignId } = req.body;
        // Coerce to a number so "50" can never be string-concatenated onto the total
        const amount = Number(req.body.amount);

        if (!mongoose.isValidObjectId(campaignId) || !Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
            return res.status(400).json({ message: 'Valid campaign ID and an amount between ₹1 and ₹10,00,000 are required' });
        }
        const rounded = Math.round(amount * 100) / 100;

        // Atomic increment, so simultaneous donations can't overwrite each other
        const campaign = await Campaign.findOneAndUpdate(
            { _id: campaignId, status: 'active' },
            { $inc: { currentAmount: rounded } },
            { new: true }
        );
        if (!campaign) {
            const exists = await Campaign.exists({ _id: campaignId });
            return exists
                ? res.status(400).json({ message: 'This campaign is no longer active' })
                : res.status(404).json({ message: 'Campaign not found' });
        }

        // Simulated payment: there is no real payment provider
        const mockTransactionId = 'DEMO_' + crypto.randomBytes(5).toString('hex').toUpperCase();
        const donation = await Donation.create({
            campaign: campaignId,
            citizen: req.user.id,
            amount: rounded,
            status: 'successful',
            transactionId: mockTransactionId
        });

        if (campaign.currentAmount >= campaign.targetAmount) {
            await Campaign.updateOne({ _id: campaign._id, status: 'active' }, { status: 'completed' });
        }

        res.status(200).json({
            message: 'Donation successful! Thank you for your support.',
            data: { donation, newTotal: campaign.currentAmount }
        });

    } catch (err) {
        console.error('Error processing donation:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/donations/history
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
