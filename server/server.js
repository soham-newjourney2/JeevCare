require('dotenv').config({ quiet: true });
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { Server } = require('socket.io');

connectDB();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        ...require('./config/cors'),
        methods: ['GET', 'POST']
    }
});
app.set('io', io);
require('./sockets')(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
