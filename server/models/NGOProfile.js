const mongoose = require('mongoose');

const ngoProfileSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, unique: true },
    organizationName: { type: String, required: true },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true } // [lng, lat]
    },
    activeCasesCount: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: true }, // Auto-verifying for local testing until Authority module is built
    registrationNumber: { type: String }
}, {
    timestamps: true
});

// Add 2dsphere index configuration for geospatial queries
ngoProfileSchema.index({ location: "2dsphere" });

module.exports = mongoose.model('NGOProfile', ngoProfileSchema);
