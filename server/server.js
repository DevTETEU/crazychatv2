import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://crazy-chat-client.onrender.com'
    : 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true
}));

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? 'https://crazy-chat-client.onrender.com'
      : 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store active users and their socket connections
const activeUsers = new Map();
// Store users waiting for matches
const waitingUsers = new Map();
// Store active matches
const activeMatches = new Map();

function findMatch(user) {
  for (const [waitingUserId, waitingUser] of waitingUsers) {
    if (waitingUserId === user.socketId) continue; // Skip self-matching
    if (activeMatches.has(waitingUserId)) continue; // Skip users already in a match
    
    // Check if genders match preferences
    const userPrefsMatch = waitingUser.preferences.gender.includes(user.gender);
    const waitingUserPrefsMatch = user.preferences.gender.includes(waitingUser.gender);

    if (userPrefsMatch && waitingUserPrefsMatch) {
      waitingUsers.delete(waitingUserId);
      // Record the match
      activeMatches.set(user.socketId, waitingUserId);
      activeMatches.set(waitingUserId, user.socketId);
      return waitingUser;
    }
  }
  return null;
}

function cleanupUser(socketId) {
  // Remove from active users
  activeUsers.delete(socketId);
  
  // Remove from waiting users
  waitingUsers.delete(socketId);
  
  // Handle active matches
  if (activeMatches.has(socketId)) {
    const partnerId = activeMatches.get(socketId);
    // Remove both users from matches
    activeMatches.delete(socketId);
    activeMatches.delete(partnerId);
    // Notify partner
    io.to(partnerId).emit('userDisconnected', socketId);
  }
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register', (userData) => {
    // Clean up any existing matches for this user
    cleanupUser(socket.id);
    
    console.log('User registering:', userData.name);
    const user = { ...userData, socketId: socket.id };
    activeUsers.set(socket.id, user);

    // Try to find a match
    const match = findMatch(user);
    if (match) {
      console.log(`Match found: ${user.name} <-> ${match.name}`);
      // Notify both users about the match
      io.to(socket.id).emit('matched', match);
      io.to(match.socketId).emit('matched', user);
    } else {
      console.log(`No match found for ${user.name}, adding to waiting list`);
      // Add to waiting list
      waitingUsers.set(socket.id, user);
    }
  });

  // WebRTC Signaling
  socket.on('offer', ({ offer, to }) => {
    if (activeMatches.get(socket.id) === to) {
      socket.to(to).emit('offer', { offer, from: socket.id });
    }
  });

  socket.on('answer', ({ answer, to }) => {
    if (activeMatches.get(socket.id) === to) {
      socket.to(to).emit('answer', { answer, from: socket.id });
    }
  });

  socket.on('ice-candidate', ({ candidate, to }) => {
    if (activeMatches.get(socket.id) === to) {
      socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
    }
  });

  socket.on('message', (data) => {
    const { to, message } = data;
    // Only send message if users are matched
    if (activeMatches.get(socket.id) === to) {
      io.to(to).emit('message', {
        id: uuidv4(),
        senderId: socket.id,
        content: message,
        timestamp: Date.now()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    cleanupUser(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
