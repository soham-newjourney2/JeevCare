const ServiceProvider = require('../models/ServiceProvider');
const Booking = require('../models/Booking');

// @desc    Get all verified service providers
// @route   GET /api/services
// @access  Public
const getServiceProviders = async (req, res, next) => {
    try {
        const providers = await ServiceProvider.find({}).populate('user', 'name email');
        res.json({ success: true, data: providers });
    } catch (error) {
        next(error);
    }
};

// @desc    Book a service
// @route   POST /api/services/book
// @access  Private (Citizen)
const bookService = async (req, res, next) => {
    try {
        const { providerId, serviceType, date, timeSlot, notes } = req.body;

        const provider = await ServiceProvider.findById(providerId);

        if (!provider) {
            return res.status(404).json({ success: false, message: 'Service provider not found' });
        }

        // Check if the requested slot is still available
        const slotIndex = provider.availableSlots.findIndex(
            slot => slot.date === date && slot.time === timeSlot
        );

        if (slotIndex === -1) {
            return res.status(400).json({ success: false, message: 'The requested time slot is no longer available.' });
        }

        const booking = await Booking.create({
            citizen: req.user._id,
            provider: provider.user, // reference to User model
            serviceType,
            date,
            timeSlot,
            notes
        });

        // Remove the booked slot from availability
        provider.availableSlots.splice(slotIndex, 1);
        await provider.save();

        res.status(201).json({ success: true, message: 'Service booked successfully', data: booking });
    } catch (error) {
        next(error);
    }
};

// @desc    Submit a complaint (Citizen -> Service Provider)
// @route   POST /api/services/complaints
// @access  Private (Citizen)
const submitComplaint = async (req, res, next) => {
    try {
        const { providerId, comments } = req.body;
        // In real app, we might create a Complaint model. 
        res.status(201).json({ success: true, message: 'Complaint submitted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle availability status
// @route   PATCH /api/services/availability
// @access  Private (Service Provider)
const toggleAvailability = async (req, res, next) => {
    try {
        const { isAvailable } = req.body;
        const provider = await ServiceProvider.findOne({ user: req.user._id });

        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider profile not found' });
        }

        provider.isAvailable = typeof isAvailable !== 'undefined' ? isAvailable : !provider.isAvailable;
        await provider.save();

        res.json({ success: true, message: 'Availability updated', data: provider });
    } catch (error) {
        next(error);
    }
};

// @desc    Accept/Reject a booking
// @route   PATCH /api/services/bookings/:id
// @access  Private (Service Provider)
const manageBooking = async (req, res, next) => {
    try {
        const { status } = req.body; // 'confirmed', 'cancelled', 'completed'
        const booking = await Booking.findById(req.params.id);

        if (!booking || booking.provider.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        booking.status = status;
        await booking.save();

        res.json({ success: true, message: `Booking status updated to ${status}`, data: booking });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all bookings for the authenticated service provider
// @route   GET /api/services/bookings
// @access  Private (Service Provider)
const getMyBookings = async (req, res, next) => {
    try {
        const bookings = await Booking.find({ provider: req.user._id })
            .populate('citizen', 'name email')
            .sort({ date: 1, timeSlot: 1 });

        res.json({ success: true, count: bookings.length, data: bookings });
    } catch (error) {
        next(error);
    }
};

// @desc    Get available slots for a specific provider
// @route   GET /api/services/:id/slots
// @access  Public
const getProviderSlots = async (req, res, next) => {
    try {
        let provider;
        // Check if ID is a valid ObjectId before querying
        if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            provider = await ServiceProvider.findById(req.params.id);
            if (!provider) {
                provider = await ServiceProvider.findOne({ user: req.params.id });
            }
        }

        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }
        res.json({ success: true, data: provider.availableSlots || [] });
    } catch (error) {
        next(error);
    }
};

// @desc    Get authenticated provider's slots
// @route   GET /api/services/slots
// @access  Private (Service Provider)
const getMySlots = async (req, res, next) => {
    try {
        const provider = await ServiceProvider.findOne({ user: req.user._id });
        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider profile not found' });
        }
        res.json({ success: true, data: provider.availableSlots || [] });
    } catch (error) {
        next(error);
    }
};

// @desc    Add a single available slot
// @route   POST /api/services/slots
// @access  Private (Service Provider)
const addSlot = async (req, res, next) => {
    try {
        const { date, time } = req.body;
        const provider = await ServiceProvider.findOne({ user: req.user._id });

        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider profile not found' });
        }

        // Prevent duplicates
        const exists = provider.availableSlots.some(s => s.date === date && s.time === time);
        if (exists) {
            return res.status(400).json({ success: false, message: 'Slot already exists' });
        }

        provider.availableSlots.push({ date, time });
        await provider.save();

        res.status(201).json({ success: true, data: provider.availableSlots });
    } catch (error) {
        next(error);
    }
};

// @desc    Remove an available slot
// @route   DELETE /api/services/slots/:slotId
// @access  Private (Service Provider)
const removeSlot = async (req, res, next) => {
    try {
        const provider = await ServiceProvider.findOne({ user: req.user._id });

        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider profile not found' });
        }

        provider.availableSlots = provider.availableSlots.filter(s => s._id.toString() !== req.params.slotId);
        await provider.save();

        res.json({ success: true, data: provider.availableSlots });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all bookings for the authenticated citizen
// @route   GET /api/services/my-citizen-bookings
// @access  Private (Citizen)
const getCitizenBookings = async (req, res, next) => {
    try {
        const bookings = await Booking.find({ citizen: req.user._id })
            .populate({ path: 'provider', select: 'name email', populate: { path: 'profile', model: 'ServiceProvider', localField: '_id', foreignField: 'user', strictPopulate: false } })
            .sort({ date: -1, timeSlot: -1 });

        res.json({ success: true, count: bookings.length, data: bookings });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getServiceProviders,
    bookService,
    submitComplaint,
    toggleAvailability,
    manageBooking,
    getMyBookings,
    getProviderSlots,
    getMySlots,
    addSlot,
    removeSlot,
    getCitizenBookings
};
