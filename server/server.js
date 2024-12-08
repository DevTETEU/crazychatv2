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
// Store user matching preferences
const userPreferences = new Map();

function getActiveUsersCount() {
  return activeUsers.size;
}

function findMatch(user) {
  const currentTime = Date.now();
  let bestMatch = null;
  let shortestWaitTime = Infinity;

  for (const [waitingUserId, waitingUser] of waitingUsers) {
    if (waitingUserId === user.socketId) continue;
    
    const userPrefsMatch = waitingUser.preferences.gender.includes(user.gender);
    const waitingUserPrefsMatch = user.preferences.gender.includes(waitingUser.gender);

    if (userPrefsMatch && waitingUserPrefsMatch) {
      const waitTime = currentTime - waitingUser.joinedAt;
      if (waitTime < shortestWaitTime) {
        shortestWaitTime = waitTime;
        bestMatch = waitingUser;
      }
    }
  }

  if (bestMatch) {
    waitingUsers.delete(bestMatch.socketId);
    return bestMatch;
  }
  return null;
}

function broadcastActiveUsers() {
  const count = getActiveUsersCount();
  io.emit('activeUsers', count);
  console.log('Active users:', count);
}

// Periodic cleanup of disconnected users
setInterval(() => {
  for (const [socketId, user] of activeUsers) {
    if (!io.sockets.sockets.get(socketId)) {
      console.log('Cleaning up disconnected user:', socketId);
      activeUsers.delete(socketId);
      waitingUsers.delete(socketId);
      userPreferences.delete(socketId);
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
    userPreferences.set(socket.id, user.preferences);
    broadcastActiveUsers();

    // Immediate match attempt
    const match = findMatch(user);
    if (match) {
      console.log(`Match found: ${user.name} <-> ${match.name}`);
      io.to(socket.id).emit('matched', match);
      io.to(match.socketId).emit('matched', user);
    } else {
      console.log(`No match found for ${user.name}, adding to waiting list`);
      waitingUsers.set(socket.id, user);
      
      // Retry matching after a short delay if no immediate match
      setTimeout(() => {
        if (waitingUsers.has(socket.id)) {
          const delayedMatch = findMatch(user);
          if (delayedMatch) {
            console.log(`Delayed match found for ${user.name}`);
            io.to(socket.id).emit('matched', delayedMatch);
            io.to(delayedMatch.socketId).emit('matched', user);
            waitingUsers.delete(socket.id);
          }
        }
      }, 2000);
    }
  });

  socket.on('findNewPartner', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      user.joinedAt = Date.now(); // Reset join time for fair matching
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
    io.to(partnerId).emit('userDisconnected', socket.id);
  });

  socket.on('offer', ({ offer, to }) => {
    socket.to(to).emit('offer', { offer, from: socket.id });
  });

  socket.on('answer', ({ answer, to }) => {
    socket.to(to).emit('answer', { answer, from: socket.id });
  });

  socket.on('ice-candidate', ({ candidate, to }) => {
    socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
  });

  socket.on('message', (data) => {
    const { to, message } = data;
    io.to(to).emit('message', {
      id: uuidv4(),
      senderId: socket.id,
      content: message,
      timestamp: Date.now()
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    activeUsers.delete(socket.id);
    waitingUsers.delete(socket.id);
    userPreferences.delete(socket.id);
    broadcastActiveUsers();
    io.emit('userDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
