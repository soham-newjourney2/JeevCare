const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    citizen: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    provider: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    serviceType: { type: String, required: true },
    date: { type: Date, required: true },
    timeSlot: { type: String, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
    notes: { type: String }
}, {
    timestamps: true
});

module.exports = mongoose.model('Booking', bookingSchema);
