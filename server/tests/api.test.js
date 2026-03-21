require('dotenv').config();
const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const connectDB = require('../config/db');

describe('JeevCare API Integration Tests', () => {
    let citizenToken;
    let ngoToken;
    let ngoId;

    beforeAll(async () => {
        await connectDB();
        // Clear collections to start fresh
        await mongoose.connection.collection('users').deleteMany({});
        await mongoose.connection.collection('incidents').deleteMany({});
        await mongoose.connection.collection('assignments').deleteMany({});
        await mongoose.connection.collection('ngoprofiles').deleteMany({});
        await mongoose.connection.collection('citizenprofiles').deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    it('should register a new citizen', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: "Test Citizen",
            email: "citizen1@test.com",
            password: "password123",
            role: "citizen"
        });
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.token).toBeDefined();
        citizenToken = res.body.data.token;
    });

    it('should register a new NGO and verify it', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: "Test NGO",
            email: "ngo1@test.com",
            password: "password123",
            role: "ngo",
            organizationName: "Test Rescue",
            location: {
                type: "Point",
                coordinates: [72.8777, 19.0760] // Mumbai coordinates
            }
        });
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.token).toBeDefined();
        ngoToken = res.body.data.token;
        ngoId = res.body.data._id;

        // Manually verify NGO bypassing the email verification logic (since we don't have email services yet)
        const NGOProfile = require('../models/NGOProfile');
        await NGOProfile.findOneAndUpdate({ user: ngoId }, { isVerified: true });
    });

    it('should report an incident and auto-route to verified NGO', async () => {
        const res = await request(app).post('/api/incidents')
            .set('Authorization', `Bearer ${citizenToken}`)
            .send({
                animalType: "Dog",
                concernType: "Injured",
                description: "Test animal issue description",
                longitude: 72.8779,
                latitude: 19.0762,
                urgencyFlag: true
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        // It should match the NGO we just created
        expect(res.body.assignedTo).toBeDefined();
        expect(res.body.assignedTo.toString()).toEqual(ngoId.toString());
    });

    it('should correctly flag a duplicate duplicate incident nearby', async () => {
        const res = await request(app).post('/api/incidents')
            .set('Authorization', `Bearer ${citizenToken}`)
            .send({
                animalType: "Dog", // Same animal
                concernType: "Accident", // Different concern, but within proximity
                description: "Another person reporting same dog",
                longitude: 72.8780, // Very close
                latitude: 19.0763,
                urgencyFlag: true
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('duplicate'); // Expecting the duplicate status to be triggered
    });

    it('should allow the assigned NGO to accept the case', async () => {
        // Fetch NGO cases
        const casesRes = await request(app).get('/api/ngo/cases')
            .set('Authorization', `Bearer ${ngoToken}`);

        expect(casesRes.statusCode).toBe(200);
        expect(casesRes.body.data.length).toBe(1); // One new case
        const assignmentId = casesRes.body.data[0]._id;

        // Accept case
        const acceptRes = await request(app).patch(`/api/ngo/cases/${assignmentId}/accept`)
            .set('Authorization', `Bearer ${ngoToken}`);

        expect(acceptRes.statusCode).toBe(200);
        expect(acceptRes.body.success).toBe(true);
        expect(acceptRes.body.data.status).toBe('accepted');
    });
});
