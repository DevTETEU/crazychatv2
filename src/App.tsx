import React from 'react';
import { UserProfile } from './components/UserProfile';
import { ChatInterface } from './components/ChatInterface';
import { useStore } from './store/useStore';

function App() {
  const user = useStore((state) => state.user);

  return (
    <div className="min-h-screen bg-black">
      {!user ? <UserProfile /> : <ChatInterface />}
    </div>
  );
}

export default App;