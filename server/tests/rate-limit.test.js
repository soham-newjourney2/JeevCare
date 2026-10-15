// The login/sign-up limiter blocks repeated attempts; normal API use stays unaffected
process.env.AUTH_RATE_LIMIT_MAX = '3';
const request = require('supertest');
const app = require('../app');
const { connectTestDb, disconnectTestDb } = require('./helpers/db');

beforeAll(connectTestDb);
afterAll(disconnectTestDb);

describe('rate limiting', () => {
    it('blocks the 4th login attempt within the window when the limit is 3', async () => {
        const attempt = () => request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'wrong-password' });
        const statuses = [];
        for (let i = 0; i < 4; i++) statuses.push((await attempt()).statusCode);
        expect(statuses[3]).toBe(429);
    });

    it('does not apply the login limit to other API routes', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toBe(200);
    });
});
