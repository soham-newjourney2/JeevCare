const ServiceProvider = require('../models/ServiceProvider');
const TeleConsultation = require('../models/TeleConsultation');
const ErrorResponse = require('../utils/errorResponse');
const { claimSlot, releaseSlot } = require('../services/slots');

exports.requestConsultation = async (req, res, next) => {
    try {
        const { vet, animalType, symptoms, date, timeSlot } = req.body;
        if (![vet, animalType, symptoms, date, timeSlot].every(v => typeof v === 'string' && v.trim())) {
            return next(new ErrorResponse('Vet, animal type, symptoms, date and time slot are required', 400));
        }

        // Shares slots with in-clinic bookings, so neither can double-book
        const provider = await claimSlot({ user: vet, serviceType: 'vet' }, date, timeSlot);
        if (!provider) {
            const exists = await ServiceProvider.exists({ user: vet, serviceType: 'vet' });
            return next(exists
                ? new ErrorResponse('The requested time slot is no longer available.', 400)
                : new ErrorResponse('Veterinarian profile not found', 404));
        }

        let consult;
        try {
            consult = await TeleConsultation.create({
                citizen: req.user.id,
                vet,
                animalType,
                symptoms,
                date,
                timeSlot
            });
        } catch (err) {
            await releaseSlot(provider._id, date, timeSlot);
            throw err;
        }

        res.status(201).json({ success: true, data: consult });
    } catch (err) {
        next(err);
    }
};

exports.getConsultations = async (req, res, next) => {
    try {
        const query = req.user.role === 'citizen' ? { citizen: req.user.id } : { vet: req.user.id };

        const consults = await TeleConsultation.find(query)
            .populate('citizen', 'name email')
            .populate('vet', 'name');

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

        const { status, meetingLink, notes } = req.body;
        if (meetingLink !== undefined && meetingLink !== '') {
            if (typeof meetingLink !== 'string' || !/^https?:\/\//i.test(meetingLink)) {
                return next(new ErrorResponse('Meeting link must start with http:// or https://', 400));
            }
            consult.meetingLink = meetingLink;
        }

        consult.status = status || consult.status;
        // No link given when scheduling: create a free Jitsi video room for this consult
        if (consult.status === 'scheduled' && !consult.meetingLink) {
            consult.meetingLink = `https://meet.jit.si/JeevCare-${consult._id}`;
        }
        if (notes !== undefined) consult.notes = notes;

        await consult.save();
        res.status(200).json({ success: true, data: consult });
    } catch (err) {
        next(err);
    }
};

exports.getVets = async (req, res, next) => {
    try {
        const vetsProfiles = await ServiceProvider.find({
            serviceType: 'vet'
        }).populate('user', 'name email');

        // Only vets with open slots; the id returned is the vet's user id
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
