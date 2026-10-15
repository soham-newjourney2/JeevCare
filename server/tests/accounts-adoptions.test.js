// Accounts (sign-up clean-up, email rules, password hook) and adoption rules
const request = require('supertest');
const { connectTestDb, disconnectTestDb } = require('./helpers/db');
const app = require('../app');
const User = require('../models/User');

const auth = (t) => ({ Authorization: `Bearer ${t}` });
let seq = 0;
const register = async (role, extra = {}) => {
    seq += 1;
    const res = await request(app).post('/api/auth/register').send({
        name: `${role} ${seq}`, email: `acc-${role}${seq}@example.com`, password: 'password123', role, ...extra
    });
    return { res, token: res.body.data && res.body.data.token, id: res.body.data && res.body.data._id };
};

beforeAll(connectTestDb);
afterAll(disconnectTestDb);

describe('accounts', () => {
    it('accepts emails with longer domain endings (B-25)', async () => {
        const res = await request(app).post('/api/auth/register').send({ name: 'Rescue Info', email: 'help@paws.info', password: 'password123', role: 'citizen' });
        expect(res.statusCode).toBe(201);
    });

    it('treats email addresses case-insensitively', async () => {
        await request(app).post('/api/auth/register').send({ name: 'Mixed', email: 'Mixed.Case@Example.com', password: 'password123', role: 'citizen' });
        const login = await request(app).post('/api/auth/login').send({ email: 'mixed.case@example.com', password: 'password123' });
        expect(login.statusCode).toBe(200);
        const dup = await request(app).post('/api/auth/register').send({ name: 'Dup', email: 'MIXED.CASE@example.com', password: 'password123', role: 'citizen' });
        expect(dup.statusCode).toBe(400);
    });

    it('removes the account when the profile cannot be created, so sign-up can be retried (B-9)', async () => {
        const body = { name: 'No Location NGO', email: 'retry-ngo@example.com', password: 'password123', role: 'ngo', organizationName: 'Retry' };
        const first = await request(app).post('/api/auth/register').send(body);
        expect(first.statusCode).toBe(400);
        expect(await User.exists({ email: 'retry-ngo@example.com' })).toBeNull();
        const retry = await request(app).post('/api/auth/register').send({ ...body, location: { type: 'Point', coordinates: [72.8, 19.0] } });
        expect(retry.statusCode).toBe(201);
    });

    it('saves a user without re-hashing or crashing when the password is unchanged (B-7)', async () => {
        const user = await User.findOne({ email: 'help@paws.info' });
        user.name = 'Renamed';
        await expect(user.save()).resolves.toBeDefined();
        const login = await request(app).post('/api/auth/login').send({ email: 'help@paws.info', password: 'password123' });
        expect(login.statusCode).toBe(200);
    });
});

describe('adoptions (B-16)', () => {
    let shelter; let petId; const applicants = [];
    const apply = (who, type = 'adopt') => request(app).post(`/api/adoptions/${petId}/apply`).set(auth(who.token))
        .send({ applicationType: type, experience: 'Grew up with dogs', housingType: 'House', reason: 'We have a garden' });
    const decide = (appId, status) => request(app).patch(`/api/adoptions/applications/${appId}/status`).set(auth(shelter.token)).send({ status });

    beforeAll(async () => {
        shelter = await register('service_provider', { businessName: 'Happy Tails', serviceType: 'shelter', location: { type: 'Point', coordinates: [72.8, 19.0] } });
        for (let i = 0; i < 3; i++) applicants.push(await register('citizen'));
        petId = (await request(app).post('/api/adoptions').set(auth(shelter.token)).send({ name: 'Bruno', species: 'Dog', description: 'Friendly lab' })).body.data._id;
    });

    it('allows one application per person', async () => {
        expect((await apply(applicants[0])).statusCode).toBe(201);
        expect((await apply(applicants[0])).statusCode).toBe(409);
        expect((await apply(applicants[1])).statusCode).toBe(201);
    });

    it('approving one application rejects the others and closes the listing', async () => {
        const apps = (await request(app).get('/api/adoptions/provider/applications').set(auth(shelter.token))).body.data;
        const chosen = apps.find(a => a.applicant._id === applicants[0].id);
        expect((await decide(chosen._id, 'approved')).statusCode).toBe(200);

        const after = (await request(app).get('/api/adoptions/provider/applications').set(auth(shelter.token))).body.data;
        expect(after.find(a => a.applicant._id === applicants[1].id).status).toBe('rejected');
        expect((await request(app).get(`/api/adoptions/${petId}`)).body.data.status).toBe('adopted');
    });

    it('refuses applications for a pet that has found a home', async () => {
        expect((await apply(applicants[2])).statusCode).toBe(400);
    });

    it('rejects invalid or repeated decisions', async () => {
        const apps = (await request(app).get('/api/adoptions/provider/applications').set(auth(shelter.token))).body.data;
        expect((await decide(apps[0]._id, 'maybe')).statusCode).toBe(400);
        expect((await decide(apps[0]._id, 'rejected')).statusCode).toBe(400);
    });
});
