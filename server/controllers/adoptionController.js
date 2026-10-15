const AdoptionProfile = require('../models/AdoptionProfile');
const AdoptionApplication = require('../models/AdoptionApplication');
const ErrorResponse = require('../utils/errorResponse');

// Copy only the listed keys from user input (status, provider, applicant are server-managed)
const pick = (obj, keys) => keys.reduce((out, k) => (obj[k] !== undefined ? { ...out, [k]: obj[k] } : out), {});
const PROFILE_FIELDS = ['name', 'species', 'breed', 'ageMonths', 'description', 'healthStatus'];
const APPLICATION_FIELDS = ['applicationType', 'experience', 'housingType', 'reason'];

exports.createProfile = async (req, res, next) => {
    try {
        const profile = await AdoptionProfile.create({ ...pick(req.body, PROFILE_FIELDS), provider: req.user.id });
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
        if (profile.status !== 'available') {
            return next(new ErrorResponse(`${profile.name} has already found a home`, 400));
        }
        if (await AdoptionApplication.exists({ pet: profile._id, applicant: req.user.id })) {
            return next(new ErrorResponse('You have already applied for this pet', 409));
        }

        const application = await AdoptionApplication.create({
            ...pick(req.body, APPLICATION_FIELDS),
            pet: req.params.id,
            applicant: req.user.id
        });
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

        const { status } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return next(new ErrorResponse('Status must be approved or rejected', 400));
        }
        if (application.status !== 'pending') {
            return next(new ErrorResponse(`This application was already ${application.status}`, 400));
        }

        if (status === 'approved') {
            // Only one approval per pet: claim the pet while it is still available
            const newStatus = application.applicationType === 'adopt' ? 'adopted' : 'fostered';
            const pet = await AdoptionProfile.findOneAndUpdate(
                { _id: application.pet._id, status: 'available' },
                { status: newStatus }
            );
            if (!pet) return next(new ErrorResponse(`${application.pet.name} has already found a home`, 400));

            // Everyone else who applied for this pet gets a clear answer
            await AdoptionApplication.updateMany(
                { pet: application.pet._id, _id: { $ne: application._id }, status: 'pending' },
                { status: 'rejected' }
            );
        }

        application.status = status;
        await application.save();

        res.status(200).json({ success: true, data: application });
    } catch (err) {
        next(err);
    }
};
