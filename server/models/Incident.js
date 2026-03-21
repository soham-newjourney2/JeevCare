const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
    reporter: { type: mongoose.Schema.ObjectId, ref: 'User', default: null }, // Null implies anonymous
    animalType: { type: String, required: [true, 'Please add the animal type'] },
    concernType: { type: String, required: [true, 'Please add the concern type'] },
    description: { type: String },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true }
    },
    imageUrl: { type: String },
    urgencyFlag: { type: Boolean, default: false },
    sosFlag: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['reported', 'assigned', 'in_progress', 'resolved', 'closed', 'duplicate', 'false_report'],
        default: 'reported'
    },
    similarityHash: { type: String },
    createdAt: { type: Date, default: Date.now }
});

// Indexes for performing queries
incidentSchema.index({ location: "2dsphere" });
incidentSchema.index({ status: 1 });
incidentSchema.index({ createdAt: -1 });
incidentSchema.index({ animalType: 1 });

module.exports = mongoose.model('Incident', incidentSchema);
