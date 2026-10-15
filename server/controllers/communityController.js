const CitizenProfile = require('../models/CitizenProfile');

exports.getLeaderboard = async (req, res, next) => {
    try {
        const topCitizens = await CitizenProfile.find({})
            .sort({ trustScore: -1, validReports: -1 })
            .limit(10)
            .populate('user', 'name');

        res.status(200).json({ success: true, count: topCitizens.length, data: topCitizens });
    } catch (err) {
        next(err);
    }
};

exports.getMyStatus = async (req, res, next) => {
    try {
        const profile = await CitizenProfile.findOne({ user: req.user.id });
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }
        res.status(200).json({ success: true, data: profile });
    } catch (err) {
        next(err);
    }
};
