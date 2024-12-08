import React from 'react';
import { Users } from 'lucide-react';
import { useStore } from '../store/useStore';

export const UserCounter: React.FC = () => {
  const activeUsers = useStore((state) => state.activeUsersCount);

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-yellow-400 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg z-50">
      <Users className="w-5 h-5" />
      <span className="font-semibold">{activeUsers} online</span>
    </div>
  );
};
