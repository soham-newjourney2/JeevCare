const Incident = require('../models/Incident');
const Assignment = require('../models/Assignment');
const NGOProfile = require('../models/NGOProfile');

// @desc    Get cases assigned to this NGO and nearby unassigned cases
// @route   GET /api/ngo/cases
// @access  Private (NGO)
const getCases = async (req, res, next) => {
    try {
        const ngoProfile = await NGOProfile.findOne({ user: req.user._id });
        if (!ngoProfile) {
            return res.status(404).json({ success: false, message: 'NGO Profile not found' });
        }

        // 1. Get cases currently assigned to them
        const assignments = await Assignment.find({ ngo: req.user._id }).populate('incident').sort({ assignedAt: -1 });

        // 2. Fetch unassigned or pending cases within 15km
        const openIncidents = await Incident.find({
            status: { $in: ['reported', 'assigned'] },
            location: {
                $nearSphere: {
                    $geometry: {
                        type: "Point",
                        coordinates: ngoProfile.location.coordinates
                    },
                    $maxDistance: 15000 // 15 km
                }
            }
        }).sort({ createdAt: -1 });

        const myIncidentIds = assignments.map(a => a.incident?._id?.toString());
        const validUnassigned = openIncidents.filter(inc => !myIncidentIds.includes(inc._id.toString()));

        // Transform unassigned incidents into "pending_acceptance" format for the UI
        const poolItems = validUnassigned.map(inc => ({
            _id: `virtual_${inc._id}`, // Not an actual assignment ID yet, handled during accept
            incident: inc,
            ngo: req.user._id,
            status: 'pending_acceptance',
            assignedAt: inc.createdAt,
            isVirtual: true // flag for the frontend/backend to know it's unassigned
        }));

        res.json({ success: true, data: [...assignments, ...poolItems] });
    } catch (error) {
        next(error);
    }
};

// @desc    Accept a case
// @route   PATCH /api/ngo/cases/:id/accept
// @access  Private (NGO)
const acceptCase = async (req, res, next) => {
    try {
        let assignment;

        if (req.params.id.startsWith('virtual_')) {
            const incidentId = req.params.id.replace('virtual_', '');
            const incident = await Incident.findById(incidentId);

            if (!incident || !['reported', 'assigned'].includes(incident.status)) {
                return res.status(400).json({ success: false, message: 'Case no longer available in the pool.' });
            }

            // Remove any existing pending assignments for this incident by OTHER NGOs
            await Assignment.deleteMany({ incident: incident._id, status: 'pending_acceptance' });

            // Create assignment on the fly
            assignment = await Assignment.create({
                incident: incident._id,
                ngo: req.user._id,
                status: 'pending_acceptance',
                timeline: [{ status: 'claimed', note: 'NGO claimed case from open pool' }]
            });
            // Proceed to accept below
        } else {
            assignment = await Assignment.findById(req.params.id);
            if (!assignment || assignment.ngo.toString() !== req.user._id.toString()) {
                return res.status(404).json({ success: false, message: 'Assignment not found' });
            }
        }

        if (assignment.status !== 'pending_acceptance') {
            return res.status(400).json({ success: false, message: 'Case already processed' });
        }

        assignment.status = 'accepted';
        assignment.timeline.push({ status: 'accepted', note: 'NGO accepted the case' });
        await assignment.save();

        const incident = await Incident.findById(assignment.incident);
        incident.status = 'in_progress';
        await incident.save();

        // Increment NGO active cases count
        await NGOProfile.findOneAndUpdate({ user: req.user._id }, { $inc: { activeCasesCount: 1 } });

        res.json({ success: true, message: 'Case accepted', data: assignment });
    } catch (error) {
        next(error);
    }
};

// @desc    Reject a case
// @route   PATCH /api/ngo/cases/:id/reject
// @access  Private (NGO)
const rejectCase = async (req, res, next) => {
    try {
        if (req.params.id.startsWith('virtual_')) {
            // Nothing to do, just return success because the NGO passed on an open pool case
            return res.json({ success: true, message: 'Passed on case from open pool' });
        }

        const assignment = await Assignment.findById(req.params.id);

        if (!assignment || assignment.ngo.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        if (assignment.status !== 'pending_acceptance') {
            return res.status(400).json({ success: false, message: 'Case already processed' });
        }

        assignment.status = 'rejected';
        assignment.timeline.push({ status: 'rejected', note: 'NGO rejected the case' });
        await assignment.save();

        const incident = await Incident.findById(assignment.incident);
        incident.status = 'reported'; // Revert to reported so it can be seen in the open pool
        await incident.save();

        res.json({ success: true, message: 'Case rejected', data: assignment });
    } catch (error) {
        next(error);
    }
};

// @desc    Update case status
// @route   PATCH /api/ngo/cases/:id/status
// @access  Private (NGO)
const updateCaseStatus = async (req, res, next) => {
    try {
        const { status, note, resolutionNotes } = req.body;
        const assignment = await Assignment.findById(req.params.id);

        if (!assignment || assignment.ngo.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        assignment.timeline.push({ status, note });

        if (status === 'resolved' || status === 'closed') {
            assignment.resolutionNotes = resolutionNotes || note;
            // Decrement active cases count
            await NGOProfile.findOneAndUpdate({ user: req.user._id }, { $inc: { activeCasesCount: -1 } });

            // Gamification Logic
            if (status === 'resolved') {
                const incidentTemp = await Incident.findById(assignment.incident);
                if (incidentTemp && incidentTemp.reporter) {
                    const CitizenProfile = require('../models/CitizenProfile');
                    const cProfile = await CitizenProfile.findOne({ user: incidentTemp.reporter });
                    if (cProfile) {
                        cProfile.validReports += 1;
                        let tScore = (cProfile.validReports * 10) - (cProfile.falseReports * 20);
                        cProfile.trustScore = Math.max(0, tScore);

                        // Badges evaluation
                        if (cProfile.validReports === 1 && !cProfile.badges.includes('First Responder')) {
                            cProfile.badges.push('First Responder');
                        }
                        if (cProfile.validReports === 5 && !cProfile.badges.includes('Animal Hero')) {
                            cProfile.badges.push('Animal Hero');
                        }
                        if (cProfile.validReports === 10 && !cProfile.badges.includes('Guardian Angel')) {
                            cProfile.badges.push('Guardian Angel');
                        }
                        if (cProfile.trustScore >= 90 && !cProfile.badges.includes('Trusted Citizen')) {
                            cProfile.badges.push('Trusted Citizen');
                        }
                        await cProfile.save();
                    }
                }
            }
        }

        await assignment.save();

        const incident = await Incident.findById(assignment.incident);
        incident.status = status;
        await incident.save();

        // Broadcast to citizen
        const io = req.app.get('io');
        if (io && incident.reporter) {
            io.to(`citizen_${incident.reporter}`).emit('status_update', {
                message: `Your reported case status has changed to ${status}`,
                incidentId: incident._id,
                status
            });
        }

        res.json({ success: true, message: `Case status updated to ${status}`, data: assignment });
    } catch (error) {
        next(error);
    }
};

// @desc    Get NGO profile
// @route   GET /api/ngo/profile
// @access  Private (NGO)
const getProfile = async (req, res, next) => {
    try {
        const profile = await NGOProfile.findOne({ user: req.user._id }).populate('user', 'name email');
        if (!profile) {
            return res.status(404).json({ success: false, message: 'NGO Profile not found' });
        }
        res.json({ success: true, data: profile });
    } catch (error) {
        next(error);
    }
};

// @desc    Dispatch team to an incident
// @route   POST /api/ngo/cases/:id/dispatch
// @access  Private (NGO)
const dispatchTeam = async (req, res, next) => {
    try {
        const { teamMembers, ETA, vehicleDetails } = req.body;
        const assignment = await Assignment.findById(req.params.id);

        if (!assignment || assignment.ngo.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        assignment.timeline.push({ status: 'team_dispatched', note: `Team dispatched. ETA: ${ETA} mins.` });
        await assignment.save();

        const incident = await Incident.findById(assignment.incident);
        incident.status = 'team_dispatched';
        await incident.save();

        res.json({ success: true, message: 'Team dispatched successfully', data: assignment });
    } catch (error) {
        next(error);
    }
};

// @desc    Get NGO specific analytics
// @route   GET /api/ngo/analytics
// @access  Private (NGO)
const getNgoAnalytics = async (req, res, next) => {
    try {
        const assignments = await Assignment.find({ ngo: req.user._id });
        const totalAssigned = assignments.length;
        const accepted = assignments.filter(a => a.status === 'accepted').length;
        const resolved = assignments.filter(a => a.status === 'resolved' || a.status === 'closed').length;

        res.json({
            success: true,
            data: {
                totalAssigned,
                accepted,
                resolved,
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCases,
    acceptCase,
    rejectCase,
    updateCaseStatus,
    getProfile,
    dispatchTeam,
    getNgoAnalytics
};
