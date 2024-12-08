import React from 'react';
import { UserProfile } from './components/UserProfile';
import { ChatInterface } from './components/ChatInterface';
import { UserCounter } from './components/UserCounter';
import { useStore } from './store/useStore';

function App() {
  const user = useStore((state) => state.user);

  return (
    <div className="min-h-screen bg-black">
      <UserCounter />
      {!user ? <UserProfile /> : <ChatInterface />}
    </div>
  );
}

export default App;
