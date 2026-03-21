const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { errorHandler, notFound } = require('./middlewares/errorHandler');

const app = express();

// Security Middlewares
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'", "https://cdn.socket.io"],
            "script-src-attr": ["'unsafe-inline'"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com"],
            "img-src": ["'self'", "data:", "blob:", "https:"],
            "connect-src": ["'self'", "ws:", "wss:"]
        },
    }
}));
app.use(cors());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/incidents', require('./routes/incidentRoutes'));
app.use('/api/ngo', require('./routes/ngoRoutes'));
app.use('/api/authority', require('./routes/authorityRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/donations', require('./routes/donationRoutes'));
app.use('/api/adoptions', require('./routes/adoptionRoutes'));
app.use('/api/teleconsult', require('./routes/teleconsultRoutes'));
app.use('/api/community', require('./routes/communityRoutes'));

// Basic health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({ success: true, message: 'JeevCare API is running.' });
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
