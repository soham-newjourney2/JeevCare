const ServiceProvider = require('../models/ServiceProvider');
const TeleConsultation = require('../models/TeleConsultation');
const ErrorResponse = require('../utils/errorResponse');

exports.requestConsultation = async (req, res, next) => {
    try {
        const { vet, animalType, symptoms, date, timeSlot } = req.body;

        // Find the vet's service provider profile
        const provider = await ServiceProvider.findOne({ user: vet });
        if (!provider) {
            return next(new ErrorResponse('Veterinarian profile not found', 404));
        }

        // Check if the requested slot is still available
        const slotIndex = provider.availableSlots.findIndex(
            slot => slot.date === date && slot.time === timeSlot
        );

        if (slotIndex === -1) {
            return next(new ErrorResponse('The requested time slot is no longer available.', 400));
        }

        // Create the consultation
        const consult = await TeleConsultation.create({
            citizen: req.user.id,
            vet,
            animalType,
            symptoms,
            date,
            timeSlot
        });

        // Remove the booked slot from availability to prevent physical OR virtual double booking
        provider.availableSlots.splice(slotIndex, 1);
        await provider.save();

        res.status(201).json({ success: true, data: consult });
    } catch (err) {
        next(err);
    }
};

exports.getConsultations = async (req, res, next) => {
    try {
        let query = {};
        if (req.user.role === 'citizen') {
            query.citizen = req.user.id;
        } else if (req.user.role === 'service_provider') {
            query.vet = req.user.id;
        }

        const consults = await TeleConsultation.find(query)
            .populate('citizen', 'name email phone')
            .populate('vet', 'name profile.serviceType');

        res.status(200).json({ success: true, count: consults.length, data: consults });
    } catch (err) {
        next(err);
    }
};

exports.updateStatus = async (req, res, next) => {
    try {
        let consult = await TeleConsultation.findById(req.params.id);
        if (!consult) return next(new ErrorResponse('Consultation not found', 404));

        if (consult.vet.toString() !== req.user.id) {
            return next(new ErrorResponse('Not authorized', 403));
        }

        consult.status = req.body.status || consult.status;
        if (req.body.meetingLink !== undefined) consult.meetingLink = req.body.meetingLink;
        if (req.body.notes !== undefined) consult.notes = req.body.notes;

        await consult.save();
        res.status(200).json({ success: true, data: consult });
    } catch (err) {
        next(err);
    }
};

exports.getVets = async (req, res, next) => {
    try {
        // Fetch all verified ServiceProviders who are strictly "vet"
        const vetsProfiles = await ServiceProvider.find({
            serviceType: 'vet'
        }).populate('user', 'name email');

        // Filter and map only those who actually have available slots
        const data = vetsProfiles
            .filter(vp => vp.availableSlots && vp.availableSlots.length > 0)
            .map(vp => ({
                _id: vp.user._id, // Send back the User ID since models link via User
                name: vp.user.name,
                businessName: vp.businessName,
                slotsAvailable: vp.availableSlots.length
            }));

        res.status(200).json({ success: true, count: data.length, data });
    } catch (err) {
        next(err);
    }
}
