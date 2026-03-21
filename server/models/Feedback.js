const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    incident: { type: mongoose.Schema.ObjectId, ref: 'Incident', required: true },
    citizen: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    ngo: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comments: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
