// server.js - Signaling Microservice using Node.js, Express, and Socket.IO

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    allowEIO3: true // For compatibility with older clients if needed
});

app.use(cors());
app.use(express.json()); // Just in case for any POST requests

// Simple health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('Server is healthy');
});

// Rooms handling
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id} from ${socket.handshake.address}`);

    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`${socket.id} joined room: ${roomId}`);

        socket.to(roomId).emit('userJoined', socket.id);

        const room = io.sockets.adapter.rooms.get(roomId);
        const existingUsers = Array.from(room || []).filter(id => id !== socket.id);
        socket.emit('existingUsers', existingUsers);
        console.log(`Existing users sent to ${socket.id}: ${existingUsers}`);
    });

    socket.on('offer', ({ to, offer }) => {
        console.log(`Offer from ${socket.id} to ${to}`);
        io.to(to).emit('offer', { from: socket.id, offer });
    });

    socket.on('answer', ({ to, answer }) => {
        console.log(`Answer from ${socket.id} to ${to}`);
        io.to(to).emit('answer', { from: socket.id, answer });
    });

    socket.on('candidate', ({ to, candidate }) => {
        console.log(`Candidate from ${socket.id} to ${to}`);
        io.to(to).emit('candidate', { from: socket.id, candidate });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        for (const roomId of socket.rooms) {
            if (roomId !== socket.id) {
                socket.to(roomId).emit('userLeft', socket.id);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}. Health check: http://localhost:${PORT}/health`);
});
