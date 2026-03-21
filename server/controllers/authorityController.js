const Incident = require('../models/Incident');
const CitizenProfile = require('../models/CitizenProfile');
const AuditLog = require('../models/AuditLog');

// @desc    Get dashboard metrics
// @route   GET /api/authority/analytics
// @access  Private (Authority)
const getAnalytics = async (req, res, next) => {
    try {
        const { ward } = req.query; // optional ward filtering

        let query = {};

        const totalIncidents = await Incident.countDocuments(query);
        const activeCases = await Incident.countDocuments({ ...query, status: { $in: ['assigned', 'in_progress'] } });
        const closedCases = await Incident.countDocuments({ ...query, status: { $in: ['resolved', 'closed'] } });

        // Count by animal type
        const byAnimalType = await Incident.aggregate([
            { $match: query },
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

// @desc    Get all cases
// @route   GET /api/authority/cases
// @access  Private (Authority)
const getAllCases = async (req, res, next) => {
    try {
        const incidents = await Incident.find({}).sort({ createdAt: -1 }).populate('reporter', 'name email').lean();
        res.json({ success: true, count: incidents.length, data: incidents });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark incident as false report
// @route   PATCH /api/authority/cases/:id/mark-false
// @access  Private (Authority)
const markFalseReport = async (req, res, next) => {
    try {
        const incident = await Incident.findById(req.params.id);

        if (!incident) {
            return res.status(404).json({ success: false, message: 'Incident not found' });
        }

        incident.status = 'false_report';
        await incident.save();

        // Adjust Trust Score of reporter if not anonymous
        if (incident.reporter) {
            const profile = await CitizenProfile.findOne({ user: incident.reporter });
            if (profile) {
                profile.falseReports += 1;
                // trustScore = (validReports * 10) - (falseReports * 20), min 0
                let tScore = (profile.validReports * 10) - (profile.falseReports * 20);
                profile.trustScore = Math.max(0, tScore);
                await profile.save();
            }
        }

        // Log audit
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

// @desc    Get system audit logs
// @route   GET /api/authority/audit-logs
// @access  Private (Authority)
const getAuditLogs = async (req, res, next) => {
    try {
        const logs = await AuditLog.find({}).sort({ createdAt: -1 }).populate('performedBy', 'name email role');
        res.json({ success: true, data: logs });
    } catch (error) {
        next(error);
    }
};

// @desc    Broadcast an alert to citizens
// @route   POST /api/authority/broadcast
// @access  Private (Authority)
const broadcastAlert = async (req, res, next) => {
    try {
        const { message, severity, targetArea } = req.body;

        // In a real application, this might trigger push notifications, emails, 
        // or a global websocket event to all connected citizens.
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
