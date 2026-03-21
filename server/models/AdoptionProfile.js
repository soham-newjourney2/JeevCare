const mongoose = require('mongoose');

const adoptionProfileSchema = new mongoose.Schema({
    name: { type: String, required: true },
    species: { type: String, required: true, enum: ['Dog', 'Cat', 'Bird', 'Large Animal', 'Other'] },
    breed: { type: String, default: 'Unknown' },
    ageMonths: { type: Number },
    description: { type: String, required: true },
    photos: [{ type: String }],
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['available', 'pending', 'adopted', 'fostered'], default: 'available' },
    medicalHistory: { type: String },
    healthStatus: { type: String, enum: ['Healthy', 'Recovering', 'Special Needs'], default: 'Healthy' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdoptionProfile', adoptionProfileSchema);
