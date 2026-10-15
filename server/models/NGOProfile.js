const mongoose = require('mongoose');

const ngoProfileSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, unique: true },
    organizationName: { type: String, required: true },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true } // [lng, lat]
    },
    activeCasesCount: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: true }, // demo: no verification step yet
    registrationNumber: { type: String }
}, {
    timestamps: true
});

ngoProfileSchema.index({ location: "2dsphere" });

module.exports = mongoose.model('NGOProfile', ngoProfileSchema);
