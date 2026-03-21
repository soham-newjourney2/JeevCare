const User = require('../models/User');
const CitizenProfile = require('../models/CitizenProfile');
const NGOProfile = require('../models/NGOProfile');
const AuthorityProfile = require('../models/AuthorityProfile');
const ServiceProvider = require('../models/ServiceProvider');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
    try {
        const { name, email, password, role, ...profileData } = req.body;

        if (role === 'anonymous') {
            return res.status(400).json({ success: false, message: 'Invalid role for registration' });
        }

        const userExists = await User.findOne({ email });

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
            // Create corresponding profile based on role
            if (role === 'citizen') {
                await CitizenProfile.create({ user: user._id, ...profileData });
            } else if (role === 'ngo') {
                await NGOProfile.create({
                    user: user._id,
                    organizationName: profileData.organizationName,
                    location: profileData.location,
                    registrationNumber: profileData.registrationNumber
                });
            } else if (role === 'authority') {
                await AuthorityProfile.create({
                    user: user._id,
                    department: profileData.department,
                    ward: profileData.ward
                });
            } else if (role === 'service_provider') {
                await ServiceProvider.create({
                    user: user._id,
                    businessName: profileData.businessName,
                    serviceType: profileData.serviceType,
                    location: profileData.location
                });
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

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');

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

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
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
