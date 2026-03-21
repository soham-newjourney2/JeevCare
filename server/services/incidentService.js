const Incident = require('../models/Incident');
const NGOProfile = require('../models/NGOProfile');

const checkDuplicate = async (animalType, lng, lat) => {
    // Within 2 km
    // Within 6 hours
    // Same animal type
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    // Earth radius in km for $centerSphere is 6378.1
    const duplicate = await Incident.findOne({
        animalType,
        createdAt: { $gte: sixHoursAgo },
        status: { $nin: ['resolved', 'closed', 'false_report'] },
        location: {
            $geoWithin: {
                $centerSphere: [[lng, lat], 2 / 6378.1]
            }
        }
    });

    return duplicate;
};

const findBestNGO = async (lng, lat, maxDistanceKm = 10) => {
    // Find verified NGOs within maxDistanceKm
    let ngos = await NGOProfile.find({
        isVerified: true,
        location: {
            $nearSphere: {
                $geometry: {
                    type: "Point",
                    coordinates: [lng, lat]
                },
                $maxDistance: maxDistanceKm * 1000 // in meters
            }
        }
    });

    if (ngos.length === 0) {
        // Fallback: If no NGO within 10km, just find the absolute closest one anywhere
        ngos = await NGOProfile.find({
            isVerified: true,
            location: {
                $nearSphere: {
                    $geometry: {
                        type: "Point",
                        coordinates: [lng, lat]
                    }
                }
            }
            // Limit to top 5 closest to avoid loading hundreds of profiles into memory
        }).limit(5);

        if (ngos.length === 0) return null; // Literally zero NGOs in the entire DB
    }

    // Sorting NGOs by workload_score penalty
    // $nearSphere already sorts by distance (closest first).
    // We add workload penalty to prioritize NGOs with fewer active cases.

    // Sort array in memory based on active cases count
    const sortedNgos = ngos.sort((a, b) => {
        return a.activeCasesCount - b.activeCasesCount;
    });

    return sortedNgos[0].user; // Return the assigned NGO user ID
};

module.exports = {
    checkDuplicate,
    findBestNGO
};
