const mongoose = require('mongoose');

const teleConsultationSchema = new mongoose.Schema({
    citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vet: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    animalType: { type: String, required: true },
    symptoms: { type: String, required: true },
    date: { type: String, required: true },
    timeSlot: { type: String, required: true },
    status: { type: String, enum: ['requested', 'scheduled', 'completed', 'cancelled'], default: 'requested' },
    meetingLink: { type: String },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TeleConsultation', teleConsultationSchema);
