// Test database helpers. Tests always use MONGO_URI_TEST (never MONGO_URI) and refuse to
// run against a database whose name does not contain "test", because they delete data.
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');

const TEST_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/jeevcare_test';

const databaseName = (uri) => uri.split('/').pop().split('?')[0];

async function connectTestDb() {
    const name = databaseName(TEST_URI);
    if (!/test/i.test(name)) {
        throw new Error(`Refusing to run tests against database "${name}": its name must contain "test".`);
    }
    await mongoose.connect(TEST_URI);

    // Empty every collection, then make indexes match the current schemas
    // (geo queries need the 2dsphere indexes; changed index options need rebuilding)
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map(c => c.deleteMany({})));
    await Promise.all(Object.values(mongoose.models).map(m => m.syncIndexes()));
}

async function disconnectTestDb() {
    await mongoose.connection.close();
}

module.exports = { connectTestDb, disconnectTestDb };
