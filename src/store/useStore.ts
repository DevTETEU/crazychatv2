import { create } from 'zustand';
import { User, Message } from '../types';

interface ChatStore {
  user: User | null;
  messages: Message[];
  isConnected: boolean;
  currentPartner: User | null;
  setUser: (user: User) => void;
  addMessage: (message: Message) => void;
  setIsConnected: (status: boolean) => void;
  setCurrentPartner: (partner: User | null) => void;
  clearChat: () => void;
}

export const useStore = create<ChatStore>((set) => ({
  user: null,
  messages: [],
  isConnected: false,
  currentPartner: null,
  setUser: (user) => set({ user }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setIsConnected: (status) => set({ isConnected: status }),
  setCurrentPartner: (partner) => set({ currentPartner: partner }),
  clearChat: () => set({ messages: [], currentPartner: null }),
}));