const AdoptionProfile = require('../models/AdoptionProfile');
const AdoptionApplication = require('../models/AdoptionApplication');
const ErrorResponse = require('../utils/errorResponse');

exports.createProfile = async (req, res, next) => {
    try {
        req.body.provider = req.user.id;
        const profile = await AdoptionProfile.create(req.body);
        res.status(201).json({ success: true, data: profile });
    } catch (err) {
        next(err);
    }
};

exports.getProfiles = async (req, res, next) => {
    try {
        const query = {};
        if (!req.query.provider) {
            query.status = 'available';
        } else {
            query.provider = req.query.provider;
        }

        if (req.query.species) query.species = req.query.species;

        const profiles = await AdoptionProfile.find(query).populate('provider', 'name email');
        res.status(200).json({ success: true, count: profiles.length, data: profiles });
    } catch (err) {
        next(err);
    }
};

exports.getProfile = async (req, res, next) => {
    try {
        const profile = await AdoptionProfile.findById(req.params.id).populate('provider', 'name email');
        if (!profile) return next(new ErrorResponse('Profile not found', 404));
        res.status(200).json({ success: true, data: profile });
    } catch (err) {
        next(err);
    }
};

exports.applyForAdoption = async (req, res, next) => {
    try {
        const profile = await AdoptionProfile.findById(req.params.id);
        if (!profile) return next(new ErrorResponse('Profile not found', 404));

        req.body.pet = req.params.id;
        req.body.applicant = req.user.id;

        const application = await AdoptionApplication.create(req.body);
        res.status(201).json({ success: true, data: application });
    } catch (err) {
        next(err);
    }
};

exports.getNgoApplications = async (req, res, next) => {
    try {
        const pets = await AdoptionProfile.find({ provider: req.user.id }).select('_id');
        const petIds = pets.map(p => p._id);

        const applications = await AdoptionApplication.find({ pet: { $in: petIds } })
            .populate('pet', 'name species')
            .populate('applicant', 'name email phone');

        res.status(200).json({ success: true, count: applications.length, data: applications });
    } catch (err) {
        next(err);
    }
};

exports.updateApplicationStatus = async (req, res, next) => {
    try {
        const application = await AdoptionApplication.findById(req.params.id).populate('pet');
        if (!application) return next(new ErrorResponse('Application not found', 404));

        if (application.pet.provider.toString() !== req.user.id) {
            return next(new ErrorResponse('Not authorized to update this application', 403));
        }

        application.status = req.body.status;
        await application.save();

        if (req.body.status === 'approved') {
            const newStatus = application.applicationType === 'adopt' ? 'adopted' : 'fostered';
            await AdoptionProfile.findByIdAndUpdate(application.pet._id, { status: newStatus });
        }

        res.status(200).json({ success: true, data: application });
    } catch (err) {
        next(err);
    }
};
