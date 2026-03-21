const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    incident: { type: mongoose.Schema.ObjectId, ref: 'Incident', required: true },
    ngo: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    status: {
        type: String,
        enum: ['pending_acceptance', 'accepted', 'rejected'],
        default: 'pending_acceptance'
    },
    assignedAt: { type: Date, default: Date.now },
    resolutionNotes: { type: String },
    timeline: [{
        status: { type: String },
        updatedAt: { type: Date, default: Date.now },
        note: { type: String }
    }]
});

module.exports = mongoose.model('Assignment', assignmentSchema);
