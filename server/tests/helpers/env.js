// Runs before every test file (see "jest.setupFiles" in package.json).
// Tests create many accounts from one IP, so the rate limits are lifted here;
// tests/rate-limit.test.js lowers them again to check the limiter itself.
process.env.RATE_LIMIT_MAX = '100000';
process.env.AUTH_RATE_LIMIT_MAX = '100000';
