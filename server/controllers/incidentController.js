const fs = require('fs');
const Incident = require('../models/Incident');
const Assignment = require('../models/Assignment');
const { checkDuplicate } = require('../services/incidentService');
const { routeIncident } = require('../services/caseLifecycle');

// POST /api/incidents
const createIncident = async (req, res, next) => {
    try {
        const { animalType, concernType, description, latitude, longitude, urgencyFlag } = req.body;
        const reporterId = req.user ? req.user._id : null;

        const lat = Number(latitude);
        const lng = Number(longitude);
        const badInput = (message) => {
            if (req.file) fs.unlink(req.file.path, () => {}); // don't keep photos for rejected reports
            return res.status(400).json({ success: false, message });
        };

        // 0 is a valid coordinate, so check for missing values rather than falsy ones
        if (latitude === undefined || latitude === '' || longitude === undefined || longitude === '' ||
            !Number.isFinite(lat) || !Number.isFinite(lng)) {
            return badInput('Latitude and longitude are required.');
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return badInput('Latitude must be between -90 and 90, longitude between -180 and 180.');
        }
        if (typeof animalType !== 'string' || !animalType.trim() || typeof concernType !== 'string' || !concernType.trim()) {
            return badInput('Animal type and concern are required.');
        }

        let imageUrl = null;

        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        const isDuplicate = await checkDuplicate(animalType, lng, lat);

        let newIncident = await Incident.create({
            reporter: reporterId,
            animalType,
            concernType,
            description,
            location: {
                type: 'Point',
                coordinates: [lng, lat] // MongoDB expects [longitude, latitude]
            },
            imageUrl,
            urgencyFlag: urgencyFlag === 'true' || urgencyFlag === true,
            status: isDuplicate ? 'duplicate' : 'reported'
        });

        if (isDuplicate) {
            newIncident.duplicateOf = isDuplicate._id; // link to the original report
            await newIncident.save();
            return res.status(201).json({
                success: true,
                message: 'Incident reported, but marked as duplicate of a nearby recent case.',
                data: newIncident
            });
        }

        const bestNgoId = await routeIncident(newIncident, req.app.get('io'));

        res.status(201).json({
            success: true,
            message: 'Incident reported successfully.',
            data: newIncident,
            assignedTo: bestNgoId ? bestNgoId.toString() : null
        });

    } catch (error) {
        next(error);
    }
};

// GET /api/incidents/:id
const getIncidentById = async (req, res, next) => {
    try {
        const incident = await Incident.findById(req.params.id).populate('reporter', 'name');

        const notFound = () => res.status(404).json({ success: false, message: 'Incident not found' });
        if (!incident) return notFound();

        const userId = req.user._id.toString();
        const isReporter = incident.reporter && incident.reporter._id.toString() === userId;
        const isAuthority = req.user.role === 'authority';
        const isAssignedNgo = req.user.role === 'ngo' &&
            await Assignment.exists({ incident: incident._id, ngo: req.user._id });

        // Same response as a missing incident, so IDs cannot be probed
        if (!isReporter && !isAuthority && !isAssignedNgo) return notFound();

        res.json({ success: true, data: incident });
    } catch (error) {
        next(error);
    }
};

// GET /api/incidents/my-reports
const getMyReports = async (req, res, next) => {
    try {
        const incidents = await Incident.find({ reporter: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, data: incidents });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createIncident,
    getIncidentById,
    getMyReports
};
