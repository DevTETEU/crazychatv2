import { create } from 'zustand';
import { User, Message } from '../types';

interface ChatStore {
  user: User | null;
  messages: Message[];
  isConnected: boolean;
  currentPartner: User | null;
  activeUsersCount: number;
  setUser: (user: User) => void;
  addMessage: (message: Message) => void;
  setIsConnected: (status: boolean) => void;
  setCurrentPartner: (partner: User | null) => void;
  setActiveUsersCount: (count: number) => void;
  clearChat: () => void;
  startNewSearch: () => void;
}

export const useStore = create<ChatStore>((set) => ({
  user: null,
  messages: [],
  isConnected: false,
  currentPartner: null,
  activeUsersCount: 0,
  setUser: (user) => set({ user }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setIsConnected: (status) => set({ isConnected: status }),
  setCurrentPartner: (partner) => set({ currentPartner: partner }),
  setActiveUsersCount: (count) => set({ activeUsersCount: count }),
  clearChat: () => set({ messages: [], currentPartner: null }),
  startNewSearch: () => set((state) => ({
    messages: [],
    currentPartner: null,
  })),
}));
