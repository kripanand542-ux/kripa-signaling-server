// server.js (Corrected version for Kripa Calls App)
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;

// This object will store phone numbers and their unique socket IDs
const users = {};

app.get('/', (req, res) => res.send('Kripa Calls Signaling Server is Active'));

io.on("connection", (socket) => {
    console.log('A user connected:', socket.id);

    // Listen for the 'register' event from the app
    socket.on('register', (number) => {
        if (!number) return;
        users[number] = socket.id;
        socket.number = number; // Store the number on the socket object itself for later
        console.log(`Registered: ${number} -> ${socket.id}`);
        socket.emit('register-success', number);
    });

    // Listen for chat messages and forward them
    socket.on('send-chat-message', (data) => {
        // data structure: { to, from, type, content }
        const targetSocketId = users[data.to];
        if (targetSocketId) {
            io.to(targetSocketId).emit('receive-chat-message', data);
            console.log(`Message from ${data.from} to ${data.to}`);
        }
    });

    // Listen for a call request and forward the offer
    socket.on('call-request', (data) => {
        // data structure: { from, to, offer }
        const targetSocketId = users[data.to];
        if (targetSocketId) {
            io.to(targetSocketId).emit('call-made', { from: data.from, offer: data.offer });
            console.log(`Call request from ${data.from} to ${data.to}`);
        }
    });

    // Listen for the answer to a call and forward it
    socket.on('answer-call', (data) => {
        // data structure: { to, answer }
        const targetSocketId = users[data.to];
        if (targetSocketId) {
            io.to(targetSocketId).emit('answer-received', { from: socket.number, answer: data.answer });
        }
    });

    // Listen for ICE candidates and forward them
    socket.on('ice-candidate', (data) => {
        // data structure: { to, candidate }
        const targetSocketId = users[data.to];
        if (targetSocketId) {
            io.to(targetSocketId).emit('ice-candidate', { from: socket.number, candidate: data.candidate });
        }
    });

    // Listen for the end of a call and forward the signal
    socket.on('end-call', (data) => {
        const targetSocketId = users[data.to];
        if (targetSocketId) {
            io.to(targetSocketId).emit('call-ended', { from: socket.number });
        }
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        if (socket.number && users[socket.number]) {
            console.log('User disconnected:', socket.number);
            delete users[socket.number]; // Remove user from the list
        }
    });
});

http.listen(PORT, () => console.log('Signaling server running on port', PORT));