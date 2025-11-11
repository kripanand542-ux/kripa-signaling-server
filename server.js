// server.js

// Import necessary libraries
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// Initialize Express app and create an HTTP server
const app = express();
const server = http.createServer(app);

// Use CORS to allow connections from any origin.
// This is important for an Android WebView which might not have a standard web origin.
app.use(cors());

// Set up Socket.IO with a lenient CORS policy to accept all connections
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"]
  }
});

// Render provides a PORT environment variable. We use that, or 3001 as a fallback.
const PORT = process.env.PORT || 3001;

// A simple health-check route to see if the server is running
app.get('/', (req, res) => {
  res.send('Kripa Signaling Server is active and running!');
});

// This is where all the real-time magic happens
io.on('connection', (socket) => {
  console.log(`User connected with ID: ${socket.id}`);

  // Event for a user joining a specific call room
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId); // The user joins the specified room
    
    // Broadcast to other users in the room that a new user has connected
    socket.to(roomId).emit('user-connected', userId);
    console.log(`User ${userId} joined room ${roomId}`);

    // When a user disconnects, let others in the room know
    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId);
      console.log(`User ${userId} disconnected from room ${roomId}`);
    });
  });

  // Relay the WebRTC "offer" signal from the caller to the target user
  socket.on('offer', (payload) => {
    io.to(payload.target).emit('offer', { sdp: payload.sdp, sender: payload.sender });
  });

  // Relay the WebRTC "answer" signal from the receiver back to the original caller
  socket.on('answer', (payload) => {
    io.to(payload.target).emit('answer', { sdp: payload.sdp, sender: payload.sender });
  });

  // Relay ICE candidates between peers to help them establish a direct connection
  socket.on('ice-candidate', (payload) => {
    io.to(payload.target).emit('ice-candidate', { candidate: payload.candidate, sender: payload.sender });
  });
});

// Start the server and make it listen for connections
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});