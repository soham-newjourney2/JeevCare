const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
    reporter: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    animalType: { type: String, required: [true, 'Please add the animal type'] },
    concernType: { type: String, required: [true, 'Please add the concern type'] },
    description: { type: String },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true }
    },
    imageUrl: { type: String },
    urgencyFlag: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['reported', 'assigned', 'in_progress', 'team_dispatched', 'on_site', 'resolved', 'closed', 'duplicate', 'false_report'],
        default: 'reported'
    },
    duplicateOf: { type: mongoose.Schema.ObjectId, ref: 'Incident' },
    createdAt: { type: Date, default: Date.now }
});

incidentSchema.index({ location: "2dsphere" });
incidentSchema.index({ status: 1 });
incidentSchema.index({ createdAt: -1 });
incidentSchema.index({ animalType: 1 });

module.exports = mongoose.model('Incident', incidentSchema);
