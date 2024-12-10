import { io } from 'socket.io-client';
import { useStore } from '../store/useStore';

const SOCKET_URL = import.meta.env.PROD 
  ? 'https://crazy-chat-server.onrender.com'
  : 'http://localhost:3000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('Connected to server');
  useStore.getState().setIsConnected(true);
  
  // Re-register user if exists
  const user = useStore.getState().user;
  if (user) {
    socket.emit('register', user);
  }
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  useStore.getState().setIsConnected(false);
  useStore.getState().setCurrentPartner(null);
  useStore.getState().clearChat();
});

socket.on('matched', (partner) => {
  console.log('Matched with partner:', partner);
  useStore.getState().setCurrentPartner(partner);
  useStore.getState().clearChat(); // Clear previous chat when new match is found
});

socket.on('message', (message) => {
  const currentPartner = useStore.getState().currentPartner;
  // Only accept messages if we have a current partner and the message is from them
  if (currentPartner && message.senderId === currentPartner.socketId) {
    useStore.getState().addMessage(message);
  }
});

socket.on('userDisconnected', (userId) => {
  const currentPartner = useStore.getState().currentPartner;
  if (currentPartner?.socketId === userId) {
    useStore.getState().setCurrentPartner(null);
    useStore.getState().clearChat();
    // Re-register to find new partner
    const user = useStore.getState().user;
    if (user) {
      socket.emit('register', user);
    }
  }
});

export const initializeSocket = (user) => {
  useStore.getState().clearChat(); // Clear any existing chat
  if (!socket.connected) {
    socket.connect();
  }
  socket.emit('register', user);
};

export const searchNewPartner = () => {
  const user = useStore.getState().user;
  if (user) {
    useStore.getState().clearChat();
    useStore.getState().setCurrentPartner(null);
    socket.emit('register', user);
  }
};
