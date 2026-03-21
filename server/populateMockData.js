require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const CitizenProfile = require('./models/CitizenProfile');
const NGOProfile = require('./models/NGOProfile');
const ServiceProvider = require('./models/ServiceProvider');
const Incident = require('./models/Incident');
const Booking = require('./models/Booking');
const connectDB = require('./config/db');

async function seedData() {
    console.log("[SEED] Connecting to DB...");
    try {
        await connectDB();
        console.log("[SEED] Connected. Wiping targeted collections...");

        await User.deleteMany({});
        await CitizenProfile.deleteMany({});
        await NGOProfile.deleteMany({});
        await ServiceProvider.deleteMany({});
        await Incident.deleteMany({});
        await Booking.deleteMany({});

        // 1. Create Authority
        console.log("[SEED] Creating Authority...");
        const authUser = await User.create({
            name: "City Admin",
            email: "admin@jeevcare.gov",
            password: "password123",
            role: "authority"
        });

        // 2. Create Citizen
        console.log("[SEED] Creating Citizen...");
        const citizenUser = await User.create({
            name: "John Doe",
            email: "john@example.com",
            password: "password123",
            role: "citizen"
        });
        await CitizenProfile.create({
            user: citizenUser._id,
            phoneNumber: "1234567890"
        });

        // 3. Create Service Provider
        console.log("[SEED] Creating Service Provider...");
        const providerUser = await User.create({
            name: "Dr. Smith Vet",
            email: "vet@smith.com",
            password: "password123",
            role: "service_provider"
        });
        await ServiceProvider.create({
            user: providerUser._id,
            businessName: "Smith Animal Hospital",
            serviceType: "vet",
            isVerified: true,
            location: { type: "Point", coordinates: [72.87, 19.07] }
        });

        // 4. Create Mock Incidents
        console.log("[SEED] Creating Incidents...");
        await Incident.create([
            {
                reporter: citizenUser._id,
                animalType: "Dog",
                concernType: "Injured",
                description: "Stray dog hit by car",
                location: { type: "Point", coordinates: [72.87, 19.07] },
                status: "reported"
            },
            {
                reporter: citizenUser._id,
                animalType: "Cat",
                concernType: "Trapped",
                description: "Cat in a drain",
                location: { type: "Point", coordinates: [72.88, 19.08] },
                status: "in_progress"
            },
            {
                reporter: citizenUser._id,
                animalType: "Cow",
                concernType: "Sick",
                description: "Cow looks very weak",
                location: { type: "Point", coordinates: [72.89, 19.09] },
                status: "resolved"
            }
        ]);

        // 5. Create Mock Bookings
        console.log("[SEED] Creating Bookings...");
        await Booking.create([
            {
                citizen: citizenUser._id,
                provider: providerUser._id,
                serviceType: "veterinarian",
                date: new Date(Date.now() + 86400000), // Tomorrow
                timeSlot: "10:00 AM",
                status: "pending",
                notes: "Vaccination needed"
            },
            {
                citizen: citizenUser._id,
                provider: providerUser._id,
                serviceType: "veterinarian",
                date: new Date(Date.now() + 172800000), // Day after tomorrow
                timeSlot: "02:00 PM",
                status: "confirmed",
                notes: "Routine checkup"
            }
        ]);

        console.log("[SEED] Success! Mock data populated.");

    } catch (err) {
        console.error("[SEED ERROR]", err);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

seedData();
