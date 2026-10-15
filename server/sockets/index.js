const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = (io) => {
    // Clients connect with the login token: io({ auth: { token } })
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth && socket.handshake.auth.token;
            if (!token) return next(new Error('Not authorized'));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('_id role');
            if (!user) return next(new Error('Not authorized'));

            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Not authorized'));
        }
    });

    io.on('connection', (socket) => {
        const { _id, role } = socket.user;

        // Rooms come from the verified user, never from the client
        if (role === 'ngo') socket.join(`ngo_${_id}`);
        if (role === 'citizen') socket.join(`citizen_${_id}`);
    });
};
