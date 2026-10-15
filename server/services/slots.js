const ServiceProvider = require('../models/ServiceProvider');

/**
 * Atomically remove a free slot from a provider. Only one caller can succeed for a given
 * slot, which prevents double-booking when two people book at the same moment.
 * `match` identifies the provider, e.g. { _id } or { user }.
 * Returns the provider (as it was before the slot was removed), or null if the slot is gone.
 */
async function claimSlot(match, date, time) {
    return ServiceProvider.findOneAndUpdate(
        { ...match, availableSlots: { $elemMatch: { date, time } } },
        { $pull: { availableSlots: { date, time } } }
    );
}

// Put a slot back, e.g. when creating the booking failed after the slot was claimed
async function releaseSlot(providerId, date, time) {
    await ServiceProvider.updateOne({ _id: providerId }, { $push: { availableSlots: { date, time } } });
}

module.exports = { claimSlot, releaseSlot };
