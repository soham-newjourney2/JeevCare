const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    incident: { type: mongoose.Schema.ObjectId, ref: 'Incident', required: true },
    ngo: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    // Lifecycle rules live in services/caseLifecycle.js
    status: {
        type: String,
        enum: ['pending_acceptance', 'accepted', 'team_dispatched', 'on_site', 'resolved', 'closed', 'rejected'],
        default: 'pending_acceptance'
    },
    assignedAt: { type: Date, default: Date.now },
    resolutionNotes: { type: String },
    dispatch: {
        teamMembers: [{ type: String }],
        etaMinutes: { type: Number },
        vehicleDetails: { type: String }
    },
    timeline: [{
        status: { type: String },
        updatedAt: { type: Date, default: Date.now },
        note: { type: String }
    }]
});

module.exports = mongoose.model('Assignment', assignmentSchema);
