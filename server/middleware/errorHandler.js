const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    if (err.statusCode) statusCode = err.statusCode;
    if (err.name === 'MulterError') statusCode = 400; // e.g. file over the 5MB limit
    // Bad input (failed schema validation, malformed ObjectId) is the client's error
    if (err.name === 'ValidationError' || err.name === 'CastError') statusCode = 400;
    // Unique index hit, e.g. the same email registering twice at the same moment
    if (err.code === 11000) {
        statusCode = 409;
        err.message = 'This already exists';
    }

    const isDev = process.env.NODE_ENV === 'development';
    if (statusCode >= 500) console.error(err);

    res.status(statusCode).json({
        success: false,
        message: statusCode >= 500 && !isDev ? 'Server Error' : err.message || 'Server Error',
        ...(isDev && { stack: err.stack }),
    });
};

const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

module.exports = { errorHandler, notFound };
