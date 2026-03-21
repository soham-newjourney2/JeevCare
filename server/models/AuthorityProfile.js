const mongoose = require('mongoose');

const authorityProfileSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, unique: true },
    department: { type: String, required: true },
    ward: { type: String }, // For ward-level filtering
    jurisdiction: {
        type: { type: String, enum: ['Polygon'] },
        coordinates: { type: [[[Number]]] } // Optional: polygon definition for exact coverage
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('AuthorityProfile', authorityProfileSchema);
