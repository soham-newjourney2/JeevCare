// Origins allowed to call the API / sockets from another domain, from CORS_ORIGINS
// (comma-separated). Empty means same-origin only, which is all the bundled frontend needs.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

module.exports = { origin: allowedOrigins.length ? allowedOrigins : false };
