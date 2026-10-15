// Case lifecycle: accept, dispatch, on site, resolve, reject/re-route, claiming and false reports
const request = require('supertest');
const { connectTestDb, disconnectTestDb } = require('./helpers/db');
const app = require('../app');
const User = require('../models/User');
const AuthorityProfile = require('../models/AuthorityProfile');
const NGOProfile = require('../models/NGOProfile');
const Assignment = require('../models/Assignment');
const Incident = require('../models/Incident');

let seq = 0;
const register = async (role, extra = {}) => {
    seq += 1;
    const res = await request(app).post('/api/auth/register').send({
        name: `${role} ${seq}`, email: `life-${role}${seq}@example.com`, password: 'password123', role, ...extra
    });
    return { token: res.body.data.token, id: res.body.data._id };
};
const ngoAt = (coordinates) => register('ngo', { organizationName: `Rescue ${seq}`, location: { type: 'Point', coordinates } });
const auth = (t) => ({ Authorization: `Bearer ${t}` });

const report = (token, lng, lat, animalType = 'Dog') => {
    const r = request(app).post('/api/incidents').send({ animalType, concernType: 'Injured', latitude: lat, longitude: lng });
    return token ? r.set(auth(token)) : r;
};
const casesOf = async (ngo) => (await request(app).get('/api/ngo/cases').set(auth(ngo.token))).body.data;
const assignmentFor = async (ngo, incidentId) => (await casesOf(ngo)).find(c => !c.isVirtual && c.incident && c.incident._id === incidentId);
const status = (ngo, id, s) => request(app).patch(`/api/ngo/cases/${id}/status`).set(auth(ngo.token)).send({ status: s });
const workload = async (ngo) => (await NGOProfile.findOne({ user: ngo.id })).activeCasesCount;

beforeAll(connectTestDb);
afterAll(disconnectTestDb);

describe('full rescue lifecycle', () => {
    let ngo; let citizen; let incidentId; let assignmentId;

    beforeAll(async () => {
        ngo = await ngoAt([10.0, 10.0]);
        citizen = await register('citizen');
        incidentId = (await report(citizen.token, 10.001, 10.001)).body.data._id;
        assignmentId = (await assignmentFor(ngo, incidentId))._id;
    });

    it('accepts, dispatches, reaches the site and resolves (B-2)', async () => {
        expect((await request(app).patch(`/api/ngo/cases/${assignmentId}/accept`).set(auth(ngo.token))).statusCode).toBe(200);
        expect(await workload(ngo)).toBe(1);

        const d = await request(app).post(`/api/ngo/cases/${assignmentId}/dispatch`).set(auth(ngo.token)).send({ ETA: 15, teamMembers: ['Asha'] });
        expect(d.statusCode).toBe(200);
        expect(d.body.data.status).toBe('team_dispatched');
        expect(d.body.data.dispatch.etaMinutes).toBe(15);

        expect((await status(ngo, assignmentId, 'on_site')).statusCode).toBe(200);
        expect((await status(ngo, assignmentId, 'resolved')).statusCode).toBe(200);

        const detail = await request(app).get(`/api/incidents/${incidentId}`).set(auth(citizen.token));
        expect(detail.body.data.status).toBe('resolved');
        expect(await workload(ngo)).toBe(0);
    });

    it('rejects resolving the same case twice and credits the reporter once (B-6)', async () => {
        const again = await status(ngo, assignmentId, 'resolved');
        expect(again.statusCode).toBe(400);
        const me = await request(app).get('/api/community/me').set(auth(citizen.token));
        expect(me.body.data.validReports).toBe(1);
        expect(me.body.data.badges).toContain('First Responder');
        expect(await workload(ngo)).toBe(0);
    });

    it('rejects unknown or out-of-order statuses without changing anything (B-8)', async () => {
        expect((await status(ngo, assignmentId, 'bogus')).statusCode).toBe(400);
        expect((await status(ngo, assignmentId, 'on_site')).statusCode).toBe(400);
        const a = await assignmentFor(ngo, incidentId);
        expect(a.status).toBe('resolved');
    });

    it('counts resolved cases in NGO analytics (B-10)', async () => {
        const res = await request(app).get('/api/ngo/analytics').set(auth(ngo.token));
        expect(res.body.data.resolved).toBe(1);
        expect(res.body.data.active).toBe(0);
    });
});

describe('claiming and routing', () => {
    it('does not show a case assigned to one NGO in another NGO\'s pool (S-8)', async () => {
        const first = await ngoAt([20.0, 20.0]);
        const second = await ngoAt([20.05, 20.05]); // ~7 km away, inside the 15 km pool radius
        const res = await report(null, 20.001, 20.001);
        expect([first.id, second.id]).toContain(res.body.assignedTo);
        const other = res.body.assignedTo === first.id ? second : first;

        const pool = await casesOf(other);
        expect(pool.some(c => c.incident && c.incident._id === res.body.data._id)).toBe(false);
        const steal = await request(app).patch(`/api/ngo/cases/virtual_${res.body.data._id}/accept`).set(auth(other.token));
        expect(steal.statusCode).toBe(409);
    });

    it('lets exactly one NGO win when two claim an open case at once', async () => {
        const a = await ngoAt([-30.0, -30.0]);
        const b = await ngoAt([-30.05, -30.05]);
        // Put the case in the open pool: unassigned, status "reported"
        const inc = await report(null, -30.01, -30.01);
        await Assignment.deleteMany({ incident: inc.body.data._id });
        await Incident.updateOne({ _id: inc.body.data._id }, { status: 'reported' });

        const [ra, rb] = await Promise.all([a, b].map(n =>
            request(app).patch(`/api/ngo/cases/virtual_${inc.body.data._id}/accept`).set(auth(n.token))));
        expect([ra.statusCode, rb.statusCode].sort()).toEqual([200, 409]);
    });

    it('re-routes a rejected case to the next NGO (B-17)', async () => {
        const near = await ngoAt([40.0, 40.0]);
        const farther = await ngoAt([40.04, 40.04]);
        const inc = await report(null, 40.001, 40.001);
        const firstChoice = inc.body.assignedTo === near.id ? near : farther;
        const secondChoice = firstChoice === near ? farther : near;

        const a = await assignmentFor(firstChoice, inc.body.data._id);
        const rej = await request(app).patch(`/api/ngo/cases/${a._id}/reject`).set(auth(firstChoice.token));
        expect(rej.statusCode).toBe(200);
        expect(rej.body.message).toMatch(/another NGO/);

        const offered = await assignmentFor(secondChoice, inc.body.data._id);
        expect(offered.status).toBe('pending_acceptance');
    });
});

describe('false reports', () => {
    it('penalises the reporter only once', async () => {
        const authorityUser = await User.create({ name: 'Officer', email: 'officer-life@example.com', password: 'password123', role: 'authority' });
        await AuthorityProfile.create({ user: authorityUser._id, department: 'Animal Welfare' });
        const login = await request(app).post('/api/auth/login').send({ email: 'officer-life@example.com', password: 'password123' });
        const officer = login.body.data.token;

        const citizen = await register('citizen');
        const inc = await report(citizen.token, 60.0, 60.0, 'Cat');
        const first = await request(app).patch(`/api/authority/cases/${inc.body.data._id}/mark-false`).set(auth(officer));
        const second = await request(app).patch(`/api/authority/cases/${inc.body.data._id}/mark-false`).set(auth(officer));
        expect(first.statusCode).toBe(200);
        expect(second.statusCode).toBe(400);
        const me = await request(app).get('/api/community/me').set(auth(citizen.token));
        expect(me.body.data.falseReports).toBe(1);
    });
});

describe('coordinates (B-18)', () => {
    it('accepts 0 as a valid latitude/longitude', async () => {
        const res = await report(null, 0, 0, 'Bird');
        expect(res.statusCode).toBe(201);
    });

    it('rejects out-of-range coordinates with 400', async () => {
        const res = await report(null, 500, 500, 'Bird');
        expect(res.statusCode).toBe(400);
    });
});
