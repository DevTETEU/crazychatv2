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

const activeUsers = new Map();
const waitingUsers = new Map();
const activeMatches = new Map();

function findMatch(user) {
  for (const [waitingUserId, waitingUser] of waitingUsers.entries()) {
    if (waitingUserId === user.socketId) continue;
    if (activeMatches.has(waitingUserId)) continue;
    
    const userPrefsMatch = waitingUser.preferences.gender.includes(user.gender);
    const waitingUserPrefsMatch = user.preferences.gender.includes(waitingUser.gender);

    if (userPrefsMatch && waitingUserPrefsMatch) {
      waitingUsers.delete(waitingUserId);
      activeMatches.set(user.socketId, waitingUserId);
      activeMatches.set(waitingUserId, user.socketId);
      return waitingUser;
    }
  }
  return null;
}

function cleanupUser(socketId) {
  if (activeMatches.has(socketId)) {
    const partnerId = activeMatches.get(socketId);
    activeMatches.delete(socketId);
    activeMatches.delete(partnerId);
    io.to(partnerId).emit('userDisconnected', socketId);
  }
  
  activeUsers.delete(socketId);
  waitingUsers.delete(socketId);
}

function logState() {
  console.log('\nCurrent State:');
  console.log('Active Users:', Array.from(activeUsers.keys()));
  console.log('Waiting Users:', Array.from(waitingUsers.keys()));
  console.log('Active Matches:', Array.from(activeMatches.entries()));
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register', (userData) => {
    cleanupUser(socket.id);
    
    const user = { ...userData, socketId: socket.id };
    activeUsers.set(socket.id, user);
    
    // Remove user from any existing matches
    if (activeMatches.has(socket.id)) {
      const oldPartnerId = activeMatches.get(socket.id);
      activeMatches.delete(socket.id);
      activeMatches.delete(oldPartnerId);
      io.to(oldPartnerId).emit('userDisconnected', socket.id);
    }
    
    const match = findMatch(user);
    if (match) {
      console.log(`Match found: ${user.name} <-> ${match.name}`);
      io.to(socket.id).emit('matched', match);
      io.to(match.socketId).emit('matched', user);
    } else {
      console.log(`No match found for ${user.name}, adding to waiting list`);
      waitingUsers.set(socket.id, user);
    }
    
    logState();
  });

  socket.on('leave_chat', () => {
    cleanupUser(socket.id);
    logState();
  });

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
    logState();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
