import { io } from 'socket.io-client';
import { useStore } from '../store/useStore';

const SOCKET_URL = import.meta.env.PROD 
  ? 'https://crazy-chat-server.onrender.com' 
  : 'http://localhost:3000';

export const socket = io(SOCKET_URL);

socket.on('connect', () => {
  useStore.getState().setIsConnected(true);
});

socket.on('disconnect', () => {
  useStore.getState().setIsConnected(false);
  useStore.getState().setCurrentPartner(null);
});

socket.on('matched', (partner) => {
  useStore.getState().setCurrentPartner(partner);
});

socket.on('message', (message) => {
  useStore.getState().addMessage(message);
});

socket.on('userDisconnected', (userId) => {
  const currentPartner = useStore.getState().currentPartner;
  if (currentPartner?.socketId === userId) {
    useStore.getState().setCurrentPartner(null);
    useStore.getState().clearChat();
  }
});

export const initializeSocket = (user) => {
  socket.emit('register', user);
};