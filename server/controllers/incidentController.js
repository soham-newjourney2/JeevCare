const Incident = require('../models/Incident');
const Assignment = require('../models/Assignment');
const { checkDuplicate, findBestNGO } = require('../services/incidentService');

// @desc    Report an incident (Citizen/Anonymous)
// @route   POST /api/incidents
// @access  Public (Optional Auth)
const createIncident = async (req, res, next) => {
    try {
        const { animalType, concernType, description, latitude, longitude, urgencyFlag, sosFlag } = req.body;
        const reporterId = req.user ? req.user._id : null;

        if (!latitude || !longitude) {
            return res.status(400).json({ success: false, message: 'Latitude and longitude are required.' });
        }

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        let imageUrl = null;

        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        // 1. Duplicate Detection
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
            sosFlag: sosFlag === 'true' || sosFlag === true,
            status: isDuplicate ? 'duplicate' : 'reported'
        });

        if (isDuplicate) {
            newIncident.similarityHash = isDuplicate._id.toString(); // linking to original
            await newIncident.save();
            return res.status(201).json({
                success: true,
                message: 'Incident reported, but marked as duplicate of a nearby recent case.',
                data: newIncident
            });
        }

        // 2. Auto Routing
        const bestNgoId = await findBestNGO(lng, lat);

        if (bestNgoId) {
            newIncident.status = 'assigned';
            await newIncident.save();

            // Create assignment
            await Assignment.create({
                incident: newIncident._id,
                ngo: bestNgoId,
                status: 'pending_acceptance',
                timeline: [{ status: 'pending_acceptance', note: 'Case auto-routed to NGO' }]
            });

            // Socket.io alerts
            const io = req.app.get('io');
            if (io) {
                io.to(`ngo_${bestNgoId}`).emit('case_assigned', {
                    message: 'New emergency case assigned to your NGO',
                    incidentId: newIncident._id,
                    animalType: newIncident.animalType
                });
            }
        }

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

// @desc    Get incident by ID
// @route   GET /api/incidents/:id
// @access  Public
const getIncidentById = async (req, res, next) => {
    try {
        const incident = await Incident.findById(req.params.id).populate('reporter', 'name');

        if (!incident) {
            return res.status(404).json({ success: false, message: 'Incident not found' });
        }

        res.json({ success: true, data: incident });
    } catch (error) {
        next(error);
    }
};

// @desc    Get user's reports
// @route   GET /api/incidents/my-reports
// @access  Private (Citizen)
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
