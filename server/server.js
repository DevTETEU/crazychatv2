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

function findMatch(user) {
  for (const [waitingUserId, waitingUser] of waitingUsers) {
    if (waitingUserId === user.socketId) continue;
    
    const userPrefsMatch = waitingUser.preferences.gender.includes(user.gender);
    const waitingUserPrefsMatch = user.preferences.gender.includes(waitingUser.gender);

    if (userPrefsMatch && waitingUserPrefsMatch) {
      waitingUsers.delete(waitingUserId);
      return waitingUser;
    }
  }
  return null;
}

function broadcastActiveUsers() {
  io.emit('activeUsers', activeUsers.size);
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register', (userData) => {
    console.log('User registering:', userData.name);
    const user = { ...userData, socketId: socket.id };
    activeUsers.set(socket.id, user);
    broadcastActiveUsers();

    const match = findMatch(user);
    if (match) {
      console.log(`Match found: ${user.name} <-> ${match.name}`);
      io.to(socket.id).emit('matched', match);
      io.to(match.socketId).emit('matched', user);
    } else {
      console.log(`No match found for ${user.name}, adding to waiting list`);
      waitingUsers.set(socket.id, user);
    }
  });

  socket.on('findNewPartner', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
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

  // WebRTC Signaling
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
    broadcastActiveUsers();
    io.emit('userDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
