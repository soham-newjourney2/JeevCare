// Regression tests for the Phase 0 security fixes (S-1 privilege escalation, S-2 XSS, S-3 mass assignment, S-4 query injection, S-5 sockets, S-6 uploads, S-7 privacy)
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const http = require('http');
const request = require('supertest');
const { Server } = require('socket.io');
const { io: ioClient } = require('socket.io-client');
const { connectTestDb, disconnectTestDb } = require('./helpers/db');
const app = require('../app');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const UPLOADS = path.join(__dirname, '../uploads');

let seq = 0;
const register = async (role, extra = {}) => {
    seq += 1;
    const res = await request(app).post('/api/auth/register').send({
        name: `${role} ${seq}`, email: `${role}${seq}@example.com`, password: 'password123', role, ...extra
    });
    return { res, token: res.body.data && res.body.data.token, id: res.body.data && res.body.data._id };
};
const ngoAt = (coordinates) => register('ngo', { organizationName: 'Rescue', location: { type: 'Point', coordinates } });

beforeAll(connectTestDb);
afterAll(disconnectTestDb);

describe('S-1 authority accounts', () => {
    it('cannot be created through public sign-up', async () => {
        const { res } = await register('authority', { department: 'x' });
        expect(res.statusCode).toBe(403);
    });

    it('rejects unknown roles with 400', async () => {
        const { res } = await register('superadmin');
        expect(res.statusCode).toBe(400);
    });
});

describe('S-3 mass assignment', () => {
    it('ignores trustScore and badges sent at sign-up', async () => {
        const { token } = await register('citizen', { trustScore: 9999, validReports: 50, badges: ['Guardian Angel'] });
        const me = await request(app).get('/api/community/me').set('Authorization', `Bearer ${token}`);
        expect(me.body.data.trustScore).toBe(0);
        expect(me.body.data.validReports).toBe(0);
        expect(me.body.data.badges).toEqual([]);
    });

    it('does not let an applicant set the adoption application status', async () => {
        const shelter = await register('service_provider', { businessName: 'Shelter', serviceType: 'shelter', location: { type: 'Point', coordinates: [72.8, 19.0] } });
        const pet = await request(app).post('/api/adoptions').set('Authorization', `Bearer ${shelter.token}`)
            .send({ name: 'Bruno', species: 'Dog', description: 'Friendly', status: 'adopted' });
        expect(pet.body.data.status).toBe('available');

        const citizen = await register('citizen');
        const app1 = await request(app).post(`/api/adoptions/${pet.body.data._id}/apply`).set('Authorization', `Bearer ${citizen.token}`)
            .send({ applicationType: 'adopt', experience: 'Yes', housingType: 'House', reason: 'Love dogs', status: 'approved' });
        expect(app1.statusCode).toBe(201);
        expect(app1.body.data.status).toBe('pending');
    });
});

describe('S-4 query operator injection', () => {
    it('rejects operator objects in login credentials', async () => {
        await register('citizen');
        const res = await request(app).post('/api/auth/login').send({ email: { $regex: '.*' }, password: 'password123' });
        expect(res.statusCode).toBe(400);
    });

    it('strips $-prefixed keys from JSON bodies', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
        expect(res.statusCode).toBe(400);
        expect(res.body.data).toBeUndefined();
    });
});

describe('S-2 HTML escaping helpers (public/assets/js/api.js)', () => {
    const sandbox = { window: { location: { origin: 'http://localhost' } }, localStorage: {}, URL };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../public/assets/js/api.js'), 'utf8'), sandbox);
    const { escapeHtml, safeUrl } = sandbox.window;

    it('escapes markup and quotes', () => {
        expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
        expect(escapeHtml("it's")).toBe('it&#39;s');
        expect(escapeHtml(null)).toBe('');
    });

    it('only allows http(s) links', () => {
        expect(safeUrl('javascript:alert(1)')).toBe('#');
        expect(safeUrl('https://meet.example/abc')).toBe('https://meet.example/abc');
    });
});

describe('S-6 / B-1 image uploads', () => {
    const created = [];
    afterAll(() => created.forEach(f => fs.rmSync(path.join(UPLOADS, path.basename(f)), { force: true })));

    const report = (file, type, name) => request(app).post('/api/incidents')
        .field('animalType', 'Dog').field('concernType', 'Injured').field('latitude', '10.0').field('longitude', '10.0')
        .attach('image', file, { filename: name, contentType: type });

    it('stores a real PNG and serves it', async () => {
        const res = await report(PNG, 'image/png', 'dog.png');
        expect(res.statusCode).toBe(201);
        created.push(res.body.data.imageUrl);
        expect(res.body.data.imageUrl).toMatch(/\.png$/);
        const img = await request(app).get(res.body.data.imageUrl);
        expect(img.statusCode).toBe(200);
        expect(img.headers['content-type']).toBe('image/png');
    });

    it('rejects HTML disguised as an image and deletes it', async () => {
        const before = fs.readdirSync(UPLOADS).length;
        const res = await report(Buffer.from('<script>alert(1)</script>'), 'image/png', 'evil.html');
        expect(res.statusCode).toBe(400);
        expect(fs.readdirSync(UPLOADS).length).toBe(before);
    });

    it('rejects non-image types', async () => {
        const res = await report(Buffer.from('<p>hi</p>'), 'text/html', 'page.html');
        expect(res.statusCode).toBe(400);
    });
});

describe('S-7 privacy', () => {
    let incidentId; let reporter; let otherCitizen; let assignedNgo; let otherNgo;

    beforeAll(async () => {
        assignedNgo = await ngoAt([30.0, 30.0]);
        otherNgo = await ngoAt([-60.0, -30.0]);
        reporter = await register('citizen');
        otherCitizen = await register('citizen');
        const res = await request(app).post('/api/incidents').set('Authorization', `Bearer ${reporter.token}`)
            .send({ animalType: 'Cat', concernType: 'Trapped', latitude: 30.001, longitude: 30.001 });
        incidentId = res.body.data._id;
        expect(res.body.assignedTo).toBe(assignedNgo.id);
    });

    const get = (token) => {
        const r = request(app).get(`/api/incidents/${incidentId}`);
        return token ? r.set('Authorization', `Bearer ${token}`) : r;
    };

    it('requires login for incident details', async () => expect((await get()).statusCode).toBe(401));
    it('shows the reporter their incident', async () => expect((await get(reporter.token)).statusCode).toBe(200));
    it('shows the assigned NGO the incident', async () => expect((await get(assignedNgo.token)).statusCode).toBe(200));
    it('hides it from other citizens', async () => expect((await get(otherCitizen.token)).statusCode).toBe(404));
    it('hides it from unrelated NGOs', async () => expect((await get(otherNgo.token)).statusCode).toBe(404));

    it('does not list consultations to NGOs', async () => {
        const res = await request(app).get('/api/teleconsult').set('Authorization', `Bearer ${assignedNgo.token}`);
        expect(res.statusCode).toBe(403);
    });
});

describe('S-5 socket authentication', () => {
    let server; let port; const clients = [];

    beforeAll(async () => {
        server = http.createServer(app);
        const io = new Server(server);
        app.set('io', io);
        require('../sockets')(io);
        await new Promise(resolve => server.listen(0, resolve));
        port = server.address().port;
    });

    afterAll(async () => {
        clients.forEach(c => c.close());
        app.set('io', undefined);
        await new Promise(resolve => server.close(resolve));
    });

    const connect = (token) => new Promise((resolve) => {
        const c = ioClient(`http://127.0.0.1:${port}`, { auth: token ? { token } : {}, transports: ['websocket'], reconnection: false });
        clients.push(c);
        c.on('connect', () => resolve({ c, ok: true }));
        c.on('connect_error', (err) => resolve({ c, ok: false, err: err.message }));
    });

    it('refuses connections without a valid token', async () => {
        expect((await connect()).ok).toBe(false);
        expect((await connect('not.a.jwt')).ok).toBe(false);
    });

    it('delivers case alerts only to the assigned NGO', async () => {
        const mine = await ngoAt([50.0, 50.0]);
        const other = await ngoAt([-50.0, -50.0]);
        const a = await connect(mine.token);
        const b = await connect(other.token);
        expect(a.ok && b.ok).toBe(true);

        // A client asking to join another NGO's room must be ignored
        b.c.emit('join_ngo_room', mine.id);

        const received = new Promise(resolve => a.c.once('case_assigned', resolve));
        let leaked = false;
        b.c.on('case_assigned', () => { leaked = true; });

        await request(app).post('/api/incidents').send({ animalType: 'Dog', concernType: 'Injured', latitude: 50.001, longitude: 50.001 });
        const payload = await received;
        expect(payload.animalType).toBe('Dog');
        await new Promise(r => setTimeout(r, 300));
        expect(leaked).toBe(false);
    });
});

describe('S-12 / S-13 / B-19 configuration', () => {
    it('does not send CORS headers to unknown origins', async () => {
        const res = await request(app).get('/api/health').set('Origin', 'https://evil.example');
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('returns 400 without a stack trace for invalid input', async () => {
        const res = await request(app).get('/api/adoptions/not-an-id');
        expect(res.statusCode).toBe(400);
        expect(res.body.stack).toBeUndefined();
    });
});
