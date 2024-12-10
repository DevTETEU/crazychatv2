import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { MessageSquare, Send, Video, UserCircle2 } from 'lucide-react';
import { VideoChat } from './VideoChat';
import { socket, searchNewPartner } from '../services/socket';
import clsx from 'clsx';

export const ChatInterface: React.FC = () => {
  const [message, setMessage] = useState('');
  const [showVideo, setShowVideo] = useState(false);
  const { user, currentPartner, messages, addMessage } = useStore();

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentPartner) return;

    const newMessage = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: user!.id,
      content: message,
      timestamp: Date.now(),
    };

    // Add message locally
    addMessage(newMessage);

    // Send message to server
    socket.emit('message', {
      to: currentPartner.socketId,
      message: message
    });

    setMessage('');
  };

  const handleNewSearch = () => {
    setShowVideo(false);
    searchNewPartner();
  };

  return (
    <div className="min-h-screen bg-black flex">
      <div className="flex-1 flex flex-col max-w-6xl mx-auto p-4">
        <div className="bg-yellow-400 p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <UserCircle2 className="w-10 h-10" />
            <div>
              <h2 className="font-bold text-black">
                {currentPartner?.name || 'Finding partner...'}
              </h2>
              <p className="text-sm text-gray-700">
                {currentPartner ? 'Online' : 'Searching...'}
              </p>
            </div>
          </div>
          <div className="flex space-x-4">
            {currentPartner && (
              <>
                <button 
                  onClick={() => setShowVideo(!showVideo)}
                  className="p-2 hover:bg-yellow-500 rounded-full"
                >
                  <Video className="w-6 h-6" />
                </button>
                <button
                  onClick={handleNewSearch}
                  className="bg-black text-yellow-400 px-4 py-2 rounded-lg hover:bg-gray-800"
                >
                  New Search
                </button>
              </>
            )}
          </div>
        </div>

        {showVideo && currentPartner && <VideoChat />}

        <div className="flex-1 bg-gray-900 p-4 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={clsx(
                'max-w-[80%] p-3 rounded-lg',
                msg.senderId === user?.id
                  ? 'ml-auto bg-yellow-400 text-black'
                  : 'bg-gray-700 text-white'
              )}
            >
              {msg.content}
            </div>
          ))}
        </div>

        <form
          onSubmit={sendMessage}
          className="bg-yellow-400 p-4 rounded-b-lg flex items-center space-x-4"
        >
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-2 rounded border-2 border-black focus:outline-none focus:border-black"
            disabled={!currentPartner}
          />
          <button
            type="submit"
            className="bg-black text-yellow-400 p-2 rounded-full hover:bg-gray-800"
            disabled={!currentPartner}
          >
            <Send className="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  );
};
