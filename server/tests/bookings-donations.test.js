// Slot booking, tele-consults and donations under concurrent requests
const request = require('supertest');
const { connectTestDb, disconnectTestDb } = require('./helpers/db');
const app = require('../app');
const Booking = require('../models/Booking');
const Donation = require('../models/Donation');

let seq = 0;
const register = async (role, extra = {}) => {
    seq += 1;
    const res = await request(app).post('/api/auth/register').send({
        name: `${role} ${seq}`, email: `bd-${role}${seq}@example.com`, password: 'password123', role, ...extra
    });
    return { token: res.body.data.token, id: res.body.data._id };
};
const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(connectTestDb);
afterAll(disconnectTestDb);

describe('vet slots (B-5)', () => {
    let vet; let providerId; const citizens = [];

    beforeAll(async () => {
        vet = await register('service_provider', { businessName: 'Smith Animal Hospital', serviceType: 'vet', location: { type: 'Point', coordinates: [72.8, 19.0] } });
        for (let i = 0; i < 4; i++) citizens.push(await register('citizen'));
        await request(app).post('/api/services/slots').set(auth(vet.token)).send({ date: '2030-01-10', time: '10:00' });
        await request(app).post('/api/services/slots').set(auth(vet.token)).send({ date: '2030-01-10', time: '11:00' });
        providerId = (await request(app).get('/api/services')).body.data.find(p => p.user._id === vet.id)._id;
    });

    it('lets only one of several simultaneous bookings take a slot', async () => {
        const results = await Promise.all(citizens.map(c => request(app).post('/api/services/book').set(auth(c.token))
            .send({ providerId, serviceType: 'vet', date: '2030-01-10', timeSlot: '10:00' })));
        expect(results.filter(r => r.statusCode === 201)).toHaveLength(1);
        expect(results.filter(r => r.statusCode === 400)).toHaveLength(3);
        expect(await Booking.countDocuments({ timeSlot: '10:00', date: new Date('2030-01-10') })).toBe(1);
    });

    it('shares slots between bookings and tele-consults', async () => {
        const consult = await request(app).post('/api/teleconsult').set(auth(citizens[0].token))
            .send({ vet: vet.id, animalType: 'Dog', symptoms: 'Limping', date: '2030-01-10', timeSlot: '11:00' });
        expect(consult.statusCode).toBe(201);
        const booking = await request(app).post('/api/services/book').set(auth(citizens[1].token))
            .send({ providerId, serviceType: 'vet', date: '2030-01-10', timeSlot: '11:00' });
        expect(booking.statusCode).toBe(400);
    });

    it('creates a video room when a consult is scheduled without a link', async () => {
        const list = await request(app).get('/api/teleconsult').set(auth(vet.token));
        const id = list.body.data[0]._id;
        const res = await request(app).patch(`/api/teleconsult/${id}/status`).set(auth(vet.token)).send({ status: 'scheduled' });
        expect(res.body.data.meetingLink).toMatch(/^https:\/\/meet\.jit\.si\/JeevCare-/);
        const bad = await request(app).patch(`/api/teleconsult/${id}/status`).set(auth(vet.token)).send({ meetingLink: 'javascript:alert(1)' });
        expect(bad.statusCode).toBe(400);
    });

    it('shows the clinic name on the citizen\'s appointments', async () => {
        const winner = (await Booking.findOne({ timeSlot: '10:00' })).citizen.toString();
        const citizen = citizens.find(c => c.id === winner);
        const res = await request(app).get('/api/services/my-patient-bookings').set(auth(citizen.token));
        expect(res.body.data[0].provider.profile.businessName).toBe('Smith Animal Hospital');
    });
});

describe('donations (B-3, B-4)', () => {
    let ngo; let citizen;
    const createCampaign = async (targetAmount) => (await request(app).post('/api/donations').set(auth(ngo.token))
        .send({ title: 'Surgery for Bruno', description: 'Leg surgery', targetAmount })).body.data._id;
    const donate = (campaignId, amount) => request(app).post('/api/donations/donate').set(auth(citizen.token)).send({ campaignId, amount });
    const total = async (id) => (await request(app).get('/api/donations').set(auth(ngo.token))).body.data.find(c => c._id === id);

    beforeAll(async () => {
        ngo = await register('ngo', { organizationName: 'Paws', location: { type: 'Point', coordinates: [72.8, 19.0] } });
        citizen = await register('citizen');
    });

    it('adds an amount sent as text as a number', async () => {
        const id = await createCampaign(100000);
        await donate(id, 100);
        const res = await donate(id, '50');
        expect(res.body.data.newTotal).toBe(150);
    });

    it('rejects invalid amounts', async () => {
        const id = await createCampaign(100000);
        for (const amount of [0, -5, 'abc', null]) {
            expect((await donate(id, amount)).statusCode).toBe(400);
        }
    });

    it('keeps every rupee when donations arrive at the same time', async () => {
        const id = await createCampaign(100000);
        await Promise.all(Array.from({ length: 10 }, () => donate(id, 10)));
        expect((await total(id)).currentAmount).toBe(100);
        expect(await Donation.countDocuments({ campaign: id })).toBe(10);
    });

    it('completes the campaign at its target and refuses further donations', async () => {
        const id = await createCampaign(100);
        await donate(id, 100);
        expect((await total(id)).status).toBe('completed');
        expect((await donate(id, 10)).statusCode).toBe(400);
    });

    it('validates new campaigns', async () => {
        const res = await request(app).post('/api/donations').set(auth(ngo.token)).send({ title: 'x', description: 'y', targetAmount: 'lots' });
        expect(res.statusCode).toBe(400);
    });
});
