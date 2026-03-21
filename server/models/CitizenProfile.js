const mongoose = require('mongoose');

const citizenProfileSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, unique: true },
    maskedIdentity: { type: Boolean, default: false },
    trustScore: { type: Number, default: 0, min: 0 },
    validReports: { type: Number, default: 0 },
    falseReports: { type: Number, default: 0 },
    badges: [{ type: String }]
}, {
    timestamps: true
});

module.exports = mongoose.model('CitizenProfile', citizenProfileSchema);
