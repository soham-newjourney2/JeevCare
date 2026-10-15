const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'"],
            "script-src-attr": ["'none'"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com"],
            "img-src": ["'self'", "data:", "blob:", "https:"],
            "connect-src": ["'self'", "ws:", "wss:"]
        },
    }
}));
app.use(cors(require('./config/cors')));

// Per IP, per 15 minutes. Dashboards make several calls per page, so the general limit is
// generous; login and sign-up get a strict one to slow down password guessing.
const limitMessage = { success: false, message: 'Too many requests, please try again later.' };
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 1000,
    message: limitMessage
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
    message: { success: false, message: 'Too many login or sign-up attempts. Please wait 15 minutes and try again.' }
});
app.use('/api/', apiLimiter);
app.use(['/api/auth/login', '/api/auth/register'], authLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(require('./middleware/sanitizeBody'));

app.use(express.static(path.join(__dirname, '../public')));

// Uploaded photos are verified images with a server-chosen extension
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { index: false, dotfiles: 'ignore' }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/incidents', require('./routes/incidentRoutes'));
app.use('/api/ngo', require('./routes/ngoRoutes'));
app.use('/api/authority', require('./routes/authorityRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/donations', require('./routes/donationRoutes'));
app.use('/api/adoptions', require('./routes/adoptionRoutes'));
app.use('/api/teleconsult', require('./routes/teleconsultRoutes'));
app.use('/api/community', require('./routes/communityRoutes'));

app.get('/api/health', (req, res) => {
    const database = require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected';
    res.status(database === 'connected' ? 200 : 503).json({
        success: database === 'connected',
        message: database === 'connected' ? 'JeevCare API is running.' : 'JeevCare API is running, but MongoDB is not connected.',
        database
    });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
