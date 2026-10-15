const ServiceProvider = require('../models/ServiceProvider');
const Booking = require('../models/Booking');
const { claimSlot, releaseSlot } = require('../services/slots');

// GET /api/services
const getServiceProviders = async (req, res, next) => {
    try {
        const providers = await ServiceProvider.find({}).populate('user', 'name email');
        res.json({ success: true, data: providers });
    } catch (error) {
        next(error);
    }
};

// POST /api/services/book
const bookService = async (req, res, next) => {
    try {
        const { providerId, serviceType, date, timeSlot, notes } = req.body;
        if (![providerId, date, timeSlot].every(v => typeof v === 'string' && v)) {
            return res.status(400).json({ success: false, message: 'Provider, date and time slot are required' });
        }

        // Claim the slot first, atomically, so two people can't book the same one
        const provider = await claimSlot({ _id: providerId }, date, timeSlot);
        if (!provider) {
            const exists = await ServiceProvider.exists({ _id: providerId });
            return exists
                ? res.status(400).json({ success: false, message: 'The requested time slot is no longer available.' })
                : res.status(404).json({ success: false, message: 'Service provider not found' });
        }

        let booking;
        try {
            booking = await Booking.create({
                citizen: req.user._id,
                provider: provider.user, // reference to User model
                serviceType: typeof serviceType === 'string' && serviceType ? serviceType : provider.serviceType,
                date,
                timeSlot,
                notes: typeof notes === 'string' ? notes : undefined
            });
        } catch (err) {
            await releaseSlot(provider._id, date, timeSlot); // give the slot back if the booking couldn't be saved
            throw err;
        }

        res.status(201).json({ success: true, message: 'Service booked successfully', data: booking });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/services/bookings/:id
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

// GET /api/services/bookings
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

// GET /api/services/:id/slots
const getProviderSlots = async (req, res, next) => {
    try {
        let provider;
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

// GET /api/services/slots
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

// POST /api/services/slots
const addSlot = async (req, res, next) => {
    try {
        const { date, time } = req.body;
        const provider = await ServiceProvider.findOne({ user: req.user._id });

        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider profile not found' });
        }

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

// DELETE /api/services/slots/:slotId
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

// GET /api/services/my-patient-bookings
const getCitizenBookings = async (req, res, next) => {
    try {
        const bookings = await Booking.find({ citizen: req.user._id })
            .populate('provider', 'name email')
            .sort({ date: -1, timeSlot: -1 })
            .lean();

        // The appointments page shows the clinic or shelter name
        const providerIds = [...new Set(bookings.map(b => b.provider && String(b.provider._id)).filter(Boolean))];
        const profiles = await ServiceProvider.find({ user: { $in: providerIds } }).select('user businessName').lean();
        const nameByUser = new Map(profiles.map(p => [String(p.user), p.businessName]));
        bookings.forEach(b => {
            if (b.provider) b.provider.profile = { businessName: nameByUser.get(String(b.provider._id)) };
        });

        res.json({ success: true, count: bookings.length, data: bookings });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getServiceProviders,
    bookService,
    manageBooking,
    getMyBookings,
    getProviderSlots,
    getMySlots,
    addSlot,
    removeSlot,
    getCitizenBookings
};
