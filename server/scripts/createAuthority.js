// Creates an authority account (authorities cannot sign up through the website).
// Usage:
//   npm run create-authority -- --name "City Admin" --email admin@city.gov --password "s3cret-pass" --department "Animal Welfare" [--ward "Ward A"]
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const mongoose = require('mongoose');
const User = require('../models/User');
const AuthorityProfile = require('../models/AuthorityProfile');

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) {
    if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[i + 1];
}

const missing = ['name', 'email', 'password', 'department'].filter(k => !args[k]);
if (missing.length) {
    console.error(`Missing: ${missing.map(k => '--' + k).join(', ')}`);
    console.error('Usage: npm run create-authority -- --name "City Admin" --email admin@city.gov --password "s3cret-pass" --department "Animal Welfare" [--ward "Ward A"]');
    process.exit(1);
}
if (args.password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
}

(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    try {
        if (await User.findOne({ email: args.email })) {
            throw new Error(`A user with email ${args.email} already exists`);
        }
        const user = await User.create({ name: args.name, email: args.email, password: args.password, role: 'authority' });
        await AuthorityProfile.create({ user: user._id, department: args.department, ward: args.ward });
        console.log(`Authority account created for ${args.email}`);
    } catch (err) {
        console.error(`Failed: ${err.message}`);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
})();
