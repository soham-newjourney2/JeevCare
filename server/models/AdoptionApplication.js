const mongoose = require('mongoose');

const adoptionApplicationSchema = new mongoose.Schema({
    pet: { type: mongoose.Schema.Types.ObjectId, ref: 'AdoptionProfile', required: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    applicationType: { type: String, enum: ['adopt', 'foster'], required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    experience: { type: String, required: true },
    housingType: { type: String, enum: ['Apartment', 'House', 'Farm', 'Other'], required: true },
    hasOtherPets: { type: Boolean, default: false },
    otherPetsDetails: { type: String },
    reason: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdoptionApplication', adoptionApplicationSchema);
