// Removes MongoDB operator keys ("$gt", "$regex", ...) and dotted keys from request
// bodies so user input can never change the shape of a database query.
const strip = (value) => {
    if (Array.isArray(value)) return value.map(strip);
    if (value && typeof value === 'object' && !(value instanceof Date)) {
        for (const key of Object.keys(value)) {
            if (key.startsWith('$') || key.includes('.')) {
                delete value[key];
            } else {
                value[key] = strip(value[key]);
            }
        }
    }
    return value;
};

const sanitizeBody = (req, res, next) => {
    if (req.body) strip(req.body);
    next();
};

module.exports = sanitizeBody;
