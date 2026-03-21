const mongoose = require('mongoose');

const serviceProviderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true },
    serviceType: { type: String, enum: ['vet', 'shelter'], required: true },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true }
    },
    isVerified: { type: Boolean, default: true },
    rating: { type: Number, default: 0 },
    inspections: [{
        date: { type: Date },
        status: { type: String, enum: ['passed', 'failed', 'pending'] },
        notes: { type: String }
    }],
    availableSlots: [{
        date: { type: String, required: true },
        time: { type: String, required: true }
    }]
}, {
    timestamps: true
});

serviceProviderSchema.index({ location: "2dsphere" });

module.exports = mongoose.model('ServiceProvider', serviceProviderSchema);
