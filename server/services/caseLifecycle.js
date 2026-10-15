const Incident = require('../models/Incident');
const Assignment = require('../models/Assignment');
const NGOProfile = require('../models/NGOProfile');
const CitizenProfile = require('../models/CitizenProfile');
const { findBestNGO } = require('./incidentService');

// Where an NGO may move an accepted case next. Anything else is rejected.
const NEXT_STATUS = {
    accepted: ['team_dispatched', 'on_site', 'resolved'],
    team_dispatched: ['on_site', 'resolved'],
    on_site: ['resolved'],
    resolved: ['closed']
};

// Assignment statuses that count towards an NGO's current workload
const ACTIVE_STATUSES = ['accepted', 'team_dispatched', 'on_site'];

// Incident status shown to citizens/authorities for each assignment status
const INCIDENT_STATUS = {
    accepted: 'in_progress',
    team_dispatched: 'team_dispatched',
    on_site: 'on_site',
    resolved: 'resolved',
    closed: 'closed'
};

const canMove = (from, to) => (NEXT_STATUS[from] || []).includes(to);

// Workload is counted from live assignments instead of a +1/-1 counter that can drift
async function syncActiveCount(ngoUserId) {
    const count = await Assignment.countDocuments({ ngo: ngoUserId, status: { $in: ACTIVE_STATUSES } });
    await NGOProfile.updateOne({ user: ngoUserId }, { activeCasesCount: count });
}

const trustScore = (p) => Math.max(0, p.validReports * 10 - p.falseReports * 20);

async function creditReporter(incident) {
    if (!incident || !incident.reporter) return;
    const profile = await CitizenProfile.findOne({ user: incident.reporter });
    if (!profile) return;

    profile.validReports += 1;
    profile.trustScore = trustScore(profile);
    const award = (badge, earned) => { if (earned && !profile.badges.includes(badge)) profile.badges.push(badge); };
    award('First Responder', profile.validReports >= 1);
    award('Animal Hero', profile.validReports >= 5);
    award('Guardian Angel', profile.validReports >= 10);
    award('Trusted Citizen', profile.trustScore >= 90);
    await profile.save();
}

async function penaliseReporter(incident) {
    if (!incident || !incident.reporter) return;
    const profile = await CitizenProfile.findOne({ user: incident.reporter });
    if (!profile) return;
    profile.falseReports += 1;
    profile.trustScore = trustScore(profile);
    await profile.save();
}

/**
 * Offer an incident to the best available NGO, skipping NGOs that already passed on it.
 * Returns the NGO user id, or null if nobody is available (the case stays in the open pool).
 */
async function routeIncident(incident, io, { exclude = [], note = 'Case auto-routed to NGO' } = {}) {
    const [lng, lat] = incident.location.coordinates;
    const ngoId = await findBestNGO(lng, lat, { exclude });
    if (!ngoId) return null;

    await Assignment.create({
        incident: incident._id,
        ngo: ngoId,
        status: 'pending_acceptance',
        timeline: [{ status: 'pending_acceptance', note }]
    });
    incident.status = 'assigned';
    await incident.save();

    if (io) {
        io.to(`ngo_${ngoId}`).emit('case_assigned', {
            message: 'New emergency case assigned to your NGO',
            incidentId: incident._id,
            animalType: incident.animalType
        });
    }
    return ngoId;
}

function notifyReporter(io, incident, status) {
    if (io && incident && incident.reporter) {
        io.to(`citizen_${incident.reporter}`).emit('status_update', {
            message: `Your reported case status has changed to ${status.replace('_', ' ')}`,
            incidentId: incident._id,
            status
        });
    }
}

module.exports = {
    NEXT_STATUS,
    ACTIVE_STATUSES,
    INCIDENT_STATUS,
    canMove,
    syncActiveCount,
    creditReporter,
    penaliseReporter,
    routeIncident,
    notifyReporter
};
