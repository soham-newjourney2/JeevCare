module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });

        // Event for joining an NGO specific room
        socket.on('join_ngo_room', (ngoId) => {
            socket.join(`ngo_${ngoId}`);
            console.log(`Socket ${socket.id} joined room: ngo_${ngoId}`);
        });

        // Event for joining Citizen specific room
        socket.on('join_citizen_room', (citizenId) => {
            socket.join(`citizen_${citizenId}`);
            console.log(`Socket ${socket.id} joined room: citizen_${citizenId}`);
        });
    });
};
