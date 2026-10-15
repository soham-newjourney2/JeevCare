const Incident = require('../models/Incident');
const NGOProfile = require('../models/NGOProfile');

const EARTH_RADIUS_KM = 6378.1;

// An open report of the same animal within 2 km in the last 6 hours
const checkDuplicate = async (animalType, lng, lat) => {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    return Incident.findOne({
        animalType,
        createdAt: { $gte: sixHoursAgo },
        status: { $nin: ['resolved', 'closed', 'false_report'] },
        location: { $geoWithin: { $centerSphere: [[lng, lat], 2 / EARTH_RADIUS_KM] } }
    });
};

// Least-busy verified NGO within maxDistanceKm, falling back to the 5 nearest anywhere.
// Returns the NGO's user id, or null when there are no verified NGOs.
const findBestNGO = async (lng, lat, { maxDistanceKm = 10, exclude = [] } = {}) => {
    const near = (extra) => ({ $nearSphere: { $geometry: { type: 'Point', coordinates: [lng, lat] }, ...extra } });
    const filter = { isVerified: true, user: { $nin: exclude } };

    let ngos = await NGOProfile.find({ ...filter, location: near({ $maxDistance: maxDistanceKm * 1000 }) });
    if (ngos.length === 0) ngos = await NGOProfile.find({ ...filter, location: near({}) }).limit(5);
    if (ngos.length === 0) return null;

    // Results come nearest-first; a stable sort keeps that order among equally busy NGOs
    ngos.sort((a, b) => a.activeCasesCount - b.activeCasesCount);
    return ngos[0].user;
};

module.exports = { checkDuplicate, findBestNGO };
