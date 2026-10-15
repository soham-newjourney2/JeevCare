// Resets the demo data: `npm run seed`.
// Clears every JeevCare collection in MONGO_URI (other collections are left alone)
// and creates a small story set in Mumbai with cases at every stage.
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const CitizenProfile = require('../models/CitizenProfile');
const NGOProfile = require('../models/NGOProfile');
const ServiceProvider = require('../models/ServiceProvider');
const AuthorityProfile = require('../models/AuthorityProfile');
const Incident = require('../models/Incident');
const Assignment = require('../models/Assignment');
const Booking = require('../models/Booking');
const TeleConsultation = require('../models/TeleConsultation');
const AdoptionProfile = require('../models/AdoptionProfile');
const AdoptionApplication = require('../models/AdoptionApplication');
const Campaign = require('../models/Campaign');
const Donation = require('../models/Donation');
const AuditLog = require('../models/AuditLog');

const PASSWORD = 'password123';
const point = (lng, lat) => ({ type: 'Point', coordinates: [lng, lat] });
const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000);

// 'YYYY-MM-DD' for today + n days, in local time (the format the slot pages use)
const day = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function seed() {
    await connectDB();
    console.log('[SEED] Connected. Clearing JeevCare collections...');

    const models = [User, CitizenProfile, NGOProfile, ServiceProvider, AuthorityProfile, Incident, Assignment,
        Booking, TeleConsultation, AdoptionProfile, AdoptionApplication, Campaign, Donation, AuditLog];
    for (const model of models) {
        await model.deleteMany({});
        await model.syncIndexes();
    }

    const user = (name, email, role) => User.create({ name, email, password: PASSWORD, role });

    // --- People -----------------------------------------------------------
    const admin = await user('City Admin', 'admin@jeevcare.gov', 'authority');
    await AuthorityProfile.create({ user: admin._id, department: 'Animal Welfare Department', ward: 'Mumbai Central' });

    const john = await user('John Doe', 'john@example.com', 'citizen');
    await CitizenProfile.create({ user: john._id, validReports: 3, trustScore: 30, badges: ['First Responder'] });

    const priya = await user('Priya Sharma', 'priya@example.com', 'citizen');
    await CitizenProfile.create({ user: priya._id, validReports: 1, trustScore: 10, badges: ['First Responder'] });

    const paws = await user('Paws Rescue Mumbai', 'ngo@pawsrescue.org', 'ngo');
    await NGOProfile.create({ user: paws._id, organizationName: 'Paws Rescue Mumbai', registrationNumber: 'MH/NGO/2019/0412', location: point(72.8777, 19.0760) });

    const street = await user('StreetCare Foundation', 'help@streetcare.org', 'ngo');
    await NGOProfile.create({ user: street._id, organizationName: 'StreetCare Foundation', registrationNumber: 'MH/NGO/2016/0188', location: point(72.8296, 19.0596) });

    const vet = await user('Dr. Anil Smith', 'vet@smith.com', 'service_provider');
    const vetProfile = await ServiceProvider.create({
        user: vet._id,
        businessName: 'Smith Animal Hospital',
        serviceType: 'vet',
        location: point(72.8697, 19.1136),
        rating: 4.7,
        availableSlots: [1, 2, 3].flatMap(n => ['10:00', '11:30', '15:00', '17:00'].map(time => ({ date: day(n), time })))
    });

    const shelter = await user('Happy Tails Shelter', 'shelter@happytails.org', 'service_provider');
    await ServiceProvider.create({ user: shelter._id, businessName: 'Happy Tails Shelter', serviceType: 'shelter', location: point(72.8561, 19.0176), rating: 4.5 });

    // --- Incidents at each stage of the rescue lifecycle --------------------
    const incident = (data) => Incident.create({ concernType: 'Injured/Accident', ...data });
    const assign = (inc, ngo, status, timeline) => Assignment.create({
        incident: inc._id, ngo: ngo._id, status, assignedAt: inc.createdAt,
        timeline: timeline.map(([s, note]) => ({ status: s, note }))
    });

    // 1. Just reported and offered to Paws Rescue: waiting in their case pool
    const injuredDog = await incident({
        reporter: john._id, animalType: 'Dog', description: 'Brown stray limping badly near the bus stop, back leg looks broken.',
        location: point(72.8790, 19.0772), urgencyFlag: true, status: 'assigned', createdAt: hoursAgo(1)
    });
    await assign(injuredDog, paws, 'pending_acceptance', [['pending_acceptance', 'Case auto-routed to NGO']]);

    // 2. Accepted and team on the way
    const trappedCat = await incident({
        reporter: priya._id, animalType: 'Cat', concernType: 'Trapped/Stuck', description: 'Kitten stuck inside a storm drain, crying for hours.',
        location: point(72.8805, 19.0745), status: 'team_dispatched', createdAt: hoursAgo(5)
    });
    await assign(trappedCat, paws, 'team_dispatched', [
        ['pending_acceptance', 'Case auto-routed to NGO'], ['accepted', 'NGO accepted the case'], ['team_dispatched', 'Team dispatched. ETA: 20 mins.']
    ]);

    // 3. Resolved by StreetCare
    const sickCow = await incident({
        reporter: john._id, animalType: 'Cow/Cattle', concernType: 'Sick/Disease', description: 'Cow lying by the road, very weak, not eating.',
        location: point(72.8310, 19.0610), status: 'resolved', createdAt: hoursAgo(30)
    });
    await assign(sickCow, street, 'resolved', [
        ['pending_acceptance', 'Case auto-routed to NGO'], ['accepted', 'NGO accepted the case'],
        ['on_site', 'Team reached the location'], ['resolved', 'Treated for dehydration and moved to a shelter']
    ]);

    // 4. Anonymous report nobody has claimed yet: in the open pool for nearby NGOs
    await incident({
        animalType: 'Bird', concernType: 'Injured/Accident', description: 'Pigeon with a damaged wing on the station footbridge.',
        location: point(72.8420, 19.0680), status: 'reported', createdAt: hoursAgo(2)
    });

    // 5. Flagged as a false report by the authority
    const fake = await incident({
        reporter: priya._id, animalType: 'Dog', concernType: 'Aggressive', description: 'Test report, please ignore.',
        location: point(72.8550, 19.0900), status: 'false_report', createdAt: hoursAgo(48)
    });
    await AuditLog.create({ action: 'MARK_FALSE_REPORT', performedBy: admin._id, targetModel: 'Incident', targetId: fake._id });

    await NGOProfile.updateOne({ user: paws._id }, { activeCasesCount: 1 });

    // --- Vet bookings and tele-triage ---------------------------------------
    const [bookedSlot, consultSlot] = vetProfile.availableSlots.slice(0, 2);
    await ServiceProvider.updateOne({ _id: vetProfile._id }, { $pull: { availableSlots: { _id: { $in: [bookedSlot._id, consultSlot._id] } } } });
    await Booking.create({
        citizen: john._id, provider: vet._id, serviceType: 'vet', date: bookedSlot.date, timeSlot: bookedSlot.time,
        status: 'confirmed', notes: 'Annual vaccination for my dog Sheru'
    });
    await TeleConsultation.create({
        citizen: priya._id, vet: vet._id, animalType: 'Cat', symptoms: 'Rescued kitten sneezing and has watery eyes',
        date: consultSlot.date, timeSlot: consultSlot.time, status: 'requested'
    });

    // --- Adoption ------------------------------------------------------------
    const pet = (data) => AdoptionProfile.create({ provider: shelter._id, ...data });
    const bruno = await pet({ name: 'Bruno', species: 'Dog', breed: 'Indie', ageMonths: 14, healthStatus: 'Healthy',
        description: 'Playful and gentle, loves long walks. Fully vaccinated and neutered.' });
    await pet({ name: 'Misty', species: 'Cat', breed: 'Domestic Shorthair', ageMonths: 8, healthStatus: 'Healthy',
        description: 'Calm lap cat rescued from a construction site. Litter trained.' });
    await pet({ name: 'Coco', species: 'Dog', breed: 'Indie mix', ageMonths: 30, healthStatus: 'Recovering',
        description: 'Recovering from a leg injury, very affectionate. Needs a quiet home.' });
    await AdoptionApplication.create({
        pet: bruno._id, applicant: priya._id, applicationType: 'adopt', experience: 'Grew up with two dogs',
        housingType: 'Apartment', reason: 'We have time for daily walks and want to give him a home.'
    });

    // --- Fundraising (simulated payments) -------------------------------------
    const surgery = await Campaign.create({
        ngo: paws._id, relatedCase: trappedCat._id, title: 'Emergency care for the drain kitten',
        description: 'Vet treatment, medicines and two weeks of foster care for the kitten rescued from the storm drain.',
        targetAmount: 15000, currentAmount: 6500
    });
    await Campaign.create({
        ngo: street._id, title: 'Monsoon shelter for street animals',
        description: 'Waterproof shelters and food for 40 street dogs before the monsoon.',
        targetAmount: 50000, currentAmount: 21000
    });
    await Donation.create({ campaign: surgery._id, citizen: john._id, amount: 500, status: 'successful', transactionId: 'DEMO_SEED00001' });

    console.log('[SEED] Demo data ready. Every account uses the password "password123":');
    console.table([
        { role: 'Citizen', email: 'john@example.com' },
        { role: 'Citizen', email: 'priya@example.com' },
        { role: 'Rescue NGO', email: 'ngo@pawsrescue.org' },
        { role: 'Rescue NGO', email: 'help@streetcare.org' },
        { role: 'Vet', email: 'vet@smith.com' },
        { role: 'Shelter', email: 'shelter@happytails.org' },
        { role: 'Authority', email: 'admin@jeevcare.gov' }
    ]);
}

seed()
    .catch(err => {
        console.error('[SEED ERROR]', err);
        process.exitCode = 1;
    })
    .finally(() => mongoose.connection.close());
