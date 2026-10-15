const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Allowed image types and the extension they are saved with (never the client's file name)
const IMAGE_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
};

// File signatures used to confirm the content really is that image type
const SIGNATURES = {
    'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    'image/webp': (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
    'image/gif': (b) => ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('ascii'))
};

const badRequest = (message) => Object.assign(new Error(message), { statusCode: 400 });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
        cb(null, 'image-' + uniqueSuffix + IMAGE_TYPES[file.mimetype]);
    }
});

const fileFilter = (req, file, cb) => {
    if (IMAGE_TYPES[file.mimetype]) {
        cb(null, true);
    } else {
        cb(badRequest('Only JPEG, PNG, WebP or GIF images are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5 // 5MB limit
    },
    fileFilter: fileFilter
});

// Runs after multer: deletes the file and rejects the request if its bytes do not
// match the declared image type (e.g. an HTML file sent as image/png).
const verifyImage = (req, res, next) => {
    if (!req.file) return next();
    try {
        const fd = fs.openSync(req.file.path, 'r');
        const head = Buffer.alloc(12);
        fs.readSync(fd, head, 0, 12, 0);
        fs.closeSync(fd);
        if (SIGNATURES[req.file.mimetype](head)) return next();
    } catch (error) {
        // fall through to rejection
    }
    fs.unlink(req.file.path, () => {});
    next(badRequest('Uploaded file is not a valid image'));
};

module.exports = upload;
module.exports.verifyImage = verifyImage;
