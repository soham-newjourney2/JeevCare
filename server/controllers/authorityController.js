const Incident = require('../models/Incident');
const Assignment = require('../models/Assignment');
const AuditLog = require('../models/AuditLog');
const { penaliseReporter, syncActiveCount } = require('../services/caseLifecycle');

// GET /api/authority/analytics
const getAnalytics = async (req, res, next) => {
    try {
        const totalIncidents = await Incident.countDocuments({});
        const activeCases = await Incident.countDocuments({ status: { $in: ['assigned', 'in_progress', 'team_dispatched', 'on_site'] } });
        const closedCases = await Incident.countDocuments({ status: { $in: ['resolved', 'closed'] } });

        const byAnimalType = await Incident.aggregate([
            { $group: { _id: "$animalType", count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            data: {
                totalIncidents,
                activeCases,
                closedCases,
                byAnimalType
            }
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/authority/cases
const getAllCases = async (req, res, next) => {
    try {
        const incidents = await Incident.find({}).sort({ createdAt: -1 }).populate('reporter', 'name email').lean();
        res.json({ success: true, count: incidents.length, data: incidents });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/authority/cases/:id/mark-false
const markFalseReport = async (req, res, next) => {
    try {
        // Only matches once, so the reporter is penalised a single time
        const incident = await Incident.findOneAndUpdate(
            { _id: req.params.id, status: { $ne: 'false_report' } },
            { status: 'false_report' },
            { new: true }
        );

        if (!incident) {
            const exists = await Incident.exists({ _id: req.params.id });
            return exists
                ? res.status(400).json({ success: false, message: 'Incident is already marked as a false report' })
                : res.status(404).json({ success: false, message: 'Incident not found' });
        }

        await penaliseReporter(incident);

        // Close any open NGO assignment so it stops counting towards their workload
        const open = await Assignment.find({ incident: incident._id, status: { $nin: ['rejected', 'closed'] } });
        for (const a of open) {
            a.status = 'closed';
            a.timeline.push({ status: 'closed', note: 'Closed by authority: false report' });
            await a.save();
            await syncActiveCount(a.ngo);
        }

        await AuditLog.create({
            action: 'MARK_FALSE_REPORT',
            performedBy: req.user._id,
            targetModel: 'Incident',
            targetId: incident._id
        });

        res.json({ success: true, message: 'Incident marked as false report', data: incident });
    } catch (error) {
        next(error);
    }
};

// GET /api/authority/audit-logs
const getAuditLogs = async (req, res, next) => {
    try {
        const logs = await AuditLog.find({}).sort({ createdAt: -1 }).populate('performedBy', 'name email role');
        res.json({ success: true, data: logs });
    } catch (error) {
        next(error);
    }
};

// POST /api/authority/broadcast
const broadcastAlert = async (req, res, next) => {
    try {
        const { message, severity, targetArea } = req.body;

        const io = req.app.get('io');
        if (io) {
            io.emit('authority_broadcast', {
                message,
                severity: severity || 'info', // e.g. 'warning', 'critical'
                targetArea: targetArea || 'all',
                timestamp: new Date()
            });
        }

        await AuditLog.create({
            action: 'BROADCAST_ALERT',
            performedBy: req.user._id,
            targetModel: 'None',
            targetId: null
        });

        res.json({ success: true, message: 'Alert broadcasted successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAnalytics,
    getAllCases,
    markFalseReport,
    getAuditLogs,
    broadcastAlert
};
