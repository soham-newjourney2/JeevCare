const Incident = require('../models/Incident');
const Assignment = require('../models/Assignment');
const NGOProfile = require('../models/NGOProfile');
const {
    ACTIVE_STATUSES, INCIDENT_STATUS, canMove,
    syncActiveCount, creditReporter, routeIncident, notifyReporter
} = require('../services/caseLifecycle');

const notFound = (res) => res.status(404).json({ success: false, message: 'Assignment not found' });

// Move one of this NGO's assignments from its current status to `to`, atomically.
// Returns { assignment, incident } or an { error, code } describing why it was refused.
async function moveAssignment(req, to, { note, extra = {} } = {}) {
    const current = await Assignment.findOne({ _id: req.params.id, ngo: req.user._id });
    if (!current) return { error: 'Assignment not found', code: 404 };
    if (!canMove(current.status, to)) {
        return { error: `A case that is ${current.status.replace('_', ' ')} cannot be marked ${to.replace('_', ' ')}`, code: 400 };
    }

    // Conditional on the status we just read, so a duplicate or stale request cannot apply twice
    const assignment = await Assignment.findOneAndUpdate(
        { _id: current._id, status: current.status },
        { $set: { status: to, ...extra }, $push: { timeline: { status: to, note } } },
        { new: true }
    );
    if (!assignment) return { error: 'This case was just updated. Refresh and try again.', code: 409 };

    const incident = await Incident.findByIdAndUpdate(assignment.incident, { status: INCIDENT_STATUS[to] }, { new: true });
    await syncActiveCount(req.user._id);
    notifyReporter(req.app.get('io'), incident, INCIDENT_STATUS[to]);
    return { assignment, incident };
}

// GET /api/ngo/cases
const getCases = async (req, res, next) => {
    try {
        const ngoProfile = await NGOProfile.findOne({ user: req.user._id });
        if (!ngoProfile) {
            return res.status(404).json({ success: false, message: 'NGO Profile not found' });
        }

        // Cases offered to or held by this NGO, plus unassigned cases within 15 km
        const assignments = await Assignment.find({ ngo: req.user._id, status: { $ne: 'rejected' } })
            .populate('incident').sort({ assignedAt: -1 });

        const openIncidents = await Incident.find({
            status: 'reported',
            location: {
                $nearSphere: {
                    $geometry: { type: 'Point', coordinates: ngoProfile.location.coordinates },
                    $maxDistance: 15000
                }
            }
        });

        // Open cases are listed as pending items with a "virtual_" id, claimed on accept
        const poolItems = openIncidents.map(inc => ({
            _id: `virtual_${inc._id}`,
            incident: inc,
            ngo: req.user._id,
            status: 'pending_acceptance',
            assignedAt: inc.createdAt,
            isVirtual: true
        }));

        res.json({ success: true, data: [...assignments, ...poolItems] });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/ngo/cases/:id/accept
const acceptCase = async (req, res, next) => {
    try {
        let assignment;

        if (req.params.id.startsWith('virtual_')) {
            // Claim an unassigned case. Only one NGO can win: the update matches only while it is still "reported".
            const incident = await Incident.findOneAndUpdate(
                { _id: req.params.id.replace('virtual_', ''), status: 'reported' },
                { status: 'in_progress' },
                { new: true }
            );
            if (!incident) {
                return res.status(409).json({ success: false, message: 'Case no longer available in the pool.' });
            }
            assignment = await Assignment.create({
                incident: incident._id,
                ngo: req.user._id,
                status: 'accepted',
                timeline: [
                    { status: 'claimed', note: 'NGO claimed case from open pool' },
                    { status: 'accepted', note: 'NGO accepted the case' }
                ]
            });
            notifyReporter(req.app.get('io'), incident, 'in_progress');
        } else {
            assignment = await Assignment.findOneAndUpdate(
                { _id: req.params.id, ngo: req.user._id, status: 'pending_acceptance' },
                { $set: { status: 'accepted' }, $push: { timeline: { status: 'accepted', note: 'NGO accepted the case' } } },
                { new: true }
            );
            if (!assignment) {
                return res.status(409).json({ success: false, message: 'Case already processed or not assigned to you' });
            }
            const incident = await Incident.findByIdAndUpdate(assignment.incident, { status: 'in_progress' }, { new: true });
            notifyReporter(req.app.get('io'), incident, 'in_progress');
        }

        await syncActiveCount(req.user._id);
        res.json({ success: true, message: 'Case accepted', data: assignment });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/ngo/cases/:id/reject
const rejectCase = async (req, res, next) => {
    try {
        if (req.params.id.startsWith('virtual_')) {
            return res.json({ success: true, message: 'Passed on case from open pool' });
        }

        const assignment = await Assignment.findOneAndUpdate(
            { _id: req.params.id, ngo: req.user._id, status: 'pending_acceptance' },
            { $set: { status: 'rejected' }, $push: { timeline: { status: 'rejected', note: 'NGO rejected the case' } } },
            { new: true }
        );
        if (!assignment) {
            return res.status(409).json({ success: false, message: 'Case already processed or not assigned to you' });
        }

        const incident = await Incident.findById(assignment.incident);
        incident.status = 'reported';
        await incident.save();

        const passed = await Assignment.distinct('ngo', { incident: incident._id, status: 'rejected' });
        const nextNgo = await routeIncident(incident, req.app.get('io'), {
            exclude: passed,
            note: 'Re-routed after another NGO passed'
        });

        res.json({
            success: true,
            message: nextNgo ? 'Case rejected and offered to another NGO' : 'Case rejected and returned to the open pool',
            data: assignment
        });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/ngo/cases/:id/status
const updateCaseStatus = async (req, res, next) => {
    try {
        const { status, note, resolutionNotes } = req.body;
        if (typeof status !== 'string') {
            return res.status(400).json({ success: false, message: 'status is required' });
        }

        const extra = status === 'resolved' ? { resolutionNotes: resolutionNotes || note } : {};
        const result = await moveAssignment(req, status, { note, extra });
        if (result.error) return res.status(result.code).json({ success: false, message: result.error });

        // Reputation is credited on the single transition into "resolved"
        if (status === 'resolved') await creditReporter(result.incident);

        res.json({ success: true, message: `Case status updated to ${status}`, data: result.assignment });
    } catch (error) {
        next(error);
    }
};

// GET /api/ngo/profile
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

// POST /api/ngo/cases/:id/dispatch
const dispatchTeam = async (req, res, next) => {
    try {
        const { teamMembers, ETA, vehicleDetails } = req.body;
        const etaMinutes = ETA === undefined || ETA === '' ? undefined : Number(ETA);
        if (etaMinutes !== undefined && (!Number.isFinite(etaMinutes) || etaMinutes < 0 || etaMinutes > 24 * 60)) {
            return res.status(400).json({ success: false, message: 'ETA must be a number of minutes' });
        }

        const dispatch = {
            teamMembers: Array.isArray(teamMembers) ? teamMembers.map(String).slice(0, 20) : [],
            etaMinutes,
            vehicleDetails: typeof vehicleDetails === 'string' ? vehicleDetails : undefined
        };
        const note = etaMinutes !== undefined ? `Team dispatched. ETA: ${etaMinutes} mins.` : 'Team dispatched.';
        const result = await moveAssignment(req, 'team_dispatched', { note, extra: { dispatch } });
        if (result.error) return res.status(result.code).json({ success: false, message: result.error });

        res.json({ success: true, message: 'Team dispatched successfully', data: result.assignment });
    } catch (error) {
        next(error);
    }
};

// GET /api/ngo/analytics
const getNgoAnalytics = async (req, res, next) => {
    try {
        const assignments = await Assignment.find({ ngo: req.user._id, status: { $ne: 'rejected' } });
        res.json({
            success: true,
            data: {
                totalAssigned: assignments.length,
                pending: assignments.filter(a => a.status === 'pending_acceptance').length,
                active: assignments.filter(a => ACTIVE_STATUSES.includes(a.status)).length,
                resolved: assignments.filter(a => a.status === 'resolved' || a.status === 'closed').length
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
