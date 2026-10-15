const User = require('../models/User');
const CitizenProfile = require('../models/CitizenProfile');
const NGOProfile = require('../models/NGOProfile');
const AuthorityProfile = require('../models/AuthorityProfile');
const ServiceProvider = require('../models/ServiceProvider');
const generateToken = require('../utils/generateToken');

// Authority accounts are created with `npm run create-authority`, never through the API
const SELF_REGISTER_ROLES = ['citizen', 'ngo', 'service_provider'];

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

// POST /api/auth/register
const registerUser = async (req, res, next) => {
    try {
        const { name, email, password, role, ...profileData } = req.body;

        if (!SELF_REGISTER_ROLES.includes(role)) {
            return res.status(role === 'authority' ? 403 : 400).json({
                success: false,
                message: role === 'authority'
                    ? 'Authority accounts are created by administrators'
                    : 'Invalid role for registration'
            });
        }

        if (![name, email, password].every(isNonEmptyString)) {
            return res.status(400).json({ success: false, message: 'Name, email and password are required' });
        }

        const userExists = await User.findOne({ email: email.trim().toLowerCase() });

        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const user = await User.create({
            name,
            email,
            password,
            role
        });

        if (user) {
            // If the profile can't be created (e.g. missing NGO location), remove the
            // account so the person can fix the form and sign up again
            try {
                if (role === 'citizen') {
                    await CitizenProfile.create({ user: user._id });
                } else if (role === 'ngo') {
                    await NGOProfile.create({
                        user: user._id,
                        organizationName: profileData.organizationName,
                        location: profileData.location,
                        registrationNumber: profileData.registrationNumber
                    });
                } else if (role === 'service_provider') {
                    await ServiceProvider.create({
                        user: user._id,
                        businessName: profileData.businessName,
                        serviceType: profileData.serviceType,
                        location: profileData.location
                    });
                }
            } catch (profileError) {
                await User.deleteOne({ _id: user._id });
                throw profileError;
            }

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    token: generateToken(user._id)
                }
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid user data' });
        }
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/login
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');

        if (user && (await user.matchPassword(password))) {
            res.json({
                success: true,
                message: 'Logged in successfully',
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    token: generateToken(user._id)
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
    } catch (error) {
        next(error);
    }
};

// GET /api/auth/profile
const getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            let profile = null;
            if (user.role === 'citizen') {
                profile = await CitizenProfile.findOne({ user: user._id });
            } else if (user.role === 'ngo') {
                profile = await NGOProfile.findOne({ user: user._id });
            } else if (user.role === 'authority') {
                profile = await AuthorityProfile.findOne({ user: user._id });
            } else if (user.role === 'service_provider') {
                profile = await ServiceProvider.findOne({ user: user._id });
            }

            res.json({
                success: true,
                message: 'Profile fetched successfully',
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    profile: profile
                }
            });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = { registerUser, loginUser, getUserProfile };
