export interface User {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  preferences: {
    gender: ('male' | 'female' | 'other')[];
  };
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: number;
}