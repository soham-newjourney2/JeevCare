const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    ngo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    relatedCase: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' }, // Optional link to a specific animal rescue
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Campaign', campaignSchema);
