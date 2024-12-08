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
  },
  pingTimeout: 10000,
  pingInterval: 5000
});

// Store active users and their socket connections
const activeUsers = new Map();
// Store users waiting for matches
const waitingUsers = new Map();
// Store active chat pairs to prevent multiple connections
const activePairs = new Map();

function getActiveUsersCount() {
  return activeUsers.size;
}

function isUserInChat(socketId) {
  return activePairs.has(socketId) || Array.from(activePairs.values()).includes(socketId);
}

function findMatch(user) {
  for (const [waitingUserId, waitingUser] of waitingUsers) {
    // Skip if either user is already in a chat
    if (isUserInChat(waitingUserId) || isUserInChat(user.socketId)) {
      continue;
    }
    
    // Skip self-matching
    if (waitingUserId === user.socketId) continue;
    
    // Check if genders match preferences
    const userPrefsMatch = waitingUser.preferences.gender.includes(user.gender);
    const waitingUserPrefsMatch = user.preferences.gender.includes(waitingUser.gender);

    if (userPrefsMatch && waitingUserPrefsMatch) {
      // Create chat pair
      activePairs.set(user.socketId, waitingUserId);
      waitingUsers.delete(waitingUserId);
      return waitingUser;
    }
  }
  return null;
}

function removeFromChat(socketId) {
  // Remove from active pairs
  if (activePairs.has(socketId)) {
    const partnerId = activePairs.get(socketId);
    activePairs.delete(socketId);
    return partnerId;
  }
  
  // Check if user is a partner in any pair
  for (const [userId, partnerId] of activePairs) {
    if (partnerId === socketId) {
      activePairs.delete(userId);
      return userId;
    }
  }
  return null;
}

function broadcastActiveUsers() {
  const count = getActiveUsersCount();
  io.emit('activeUsers', count);
}

// Periodic cleanup
setInterval(() => {
  for (const [socketId, user] of activeUsers) {
    if (!io.sockets.sockets.get(socketId)) {
      console.log('Cleaning up disconnected user:', socketId);
      activeUsers.delete(socketId);
      waitingUsers.delete(socketId);
      removeFromChat(socketId);
    }
  }
  broadcastActiveUsers();
}, 30000);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  broadcastActiveUsers();

  socket.on('register', (userData) => {
    console.log('User registering:', userData.name);
    const user = { 
      ...userData, 
      socketId: socket.id,
      joinedAt: Date.now()
    };
    
    activeUsers.set(socket.id, user);
    
    // Only try to match if user isn't already in a chat
    if (!isUserInChat(socket.id)) {
      const match = findMatch(user);
      if (match) {
        console.log(`Match found: ${user.name} <-> ${match.name}`);
        io.to(socket.id).emit('matched', match);
        io.to(match.socketId).emit('matched', user);
      } else {
        console.log(`No match found for ${user.name}, adding to waiting list`);
        waitingUsers.set(socket.id, user);
      }
    }
  });

  socket.on('findNewPartner', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      // Remove from current chat if any
      const oldPartnerId = removeFromChat(socket.id);
      if (oldPartnerId) {
        io.to(oldPartnerId).emit('userDisconnected', socket.id);
      }
      
      // Try to find new match
      const match = findMatch(user);
      if (match) {
        io.to(socket.id).emit('matched', match);
        io.to(match.socketId).emit('matched', user);
      } else {
        waitingUsers.set(socket.id, user);
      }
    }
  });

  socket.on('leaveChat', (partnerId) => {
    removeFromChat(socket.id);
    io.to(partnerId).emit('userDisconnected', socket.id);
  });

  socket.on('offer', ({ offer, to }) => {
    // Only send offer if users are paired
    if (activePairs.get(socket.id) === to || activePairs.get(to) === socket.id) {
      socket.to(to).emit('offer', { offer, from: socket.id });
    }
  });

  socket.on('answer', ({ answer, to }) => {
    // Only send answer if users are paired
    if (activePairs.get(socket.id) === to || activePairs.get(to) === socket.id) {
      socket.to(to).emit('answer', { answer, from: socket.id });
    }
  });

  socket.on('ice-candidate', ({ candidate, to }) => {
    // Only send ICE candidates if users are paired
    if (activePairs.get(socket.id) === to || activePairs.get(to) === socket.id) {
      socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
    }
  });

  socket.on('message', (data) => {
    const { to, message } = data;
    // Only send messages if users are paired
    if (activePairs.get(socket.id) === to || activePairs.get(to) === socket.id) {
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
    const partnerId = removeFromChat(socket.id);
    if (partnerId) {
      io.to(partnerId).emit('userDisconnected', socket.id);
    }
    activeUsers.delete(socket.id);
    waitingUsers.delete(socket.id);
    broadcastActiveUsers();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
