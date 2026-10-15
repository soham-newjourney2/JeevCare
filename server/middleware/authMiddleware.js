const jwt = require('jsonwebtoken');
const User = require('../models/User');

// The user for an "Authorization: Bearer <token>" header, or null if missing or invalid
async function userFromRequest(req) {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return null;
    try {
        const { id } = jwt.verify(header.slice(7), process.env.JWT_SECRET);
        return await User.findById(id).select('-password');
    } catch (error) {
        return null;
    }
}

const protect = async (req, res, next) => {
    req.user = await userFromRequest(req);
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    next();
};

// For routes open to everyone that behave differently for logged-in users
const optionalAuth = async (req, res, next) => {
    req.user = await userFromRequest(req);
    next();
};

const authorize = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'You do not have access to this' });
    }
    next();
};

module.exports = { protect, optionalAuth, authorize };
