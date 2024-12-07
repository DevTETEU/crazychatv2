import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { User } from '../types';
import { UserCircle2 } from 'lucide-react';

export const UserProfile: React.FC = () => {
  const setUser = useStore((state) => state.setUser);
  const [formData, setFormData] = useState({
    name: '',
    gender: 'male',
    preferences: {
      gender: ['female'],
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
    };
    setUser(user);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-yellow-400 p-8 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-center mb-6">
          <UserCircle2 className="w-16 h-16 text-black" />
        </div>
        <h2 className="text-3xl font-bold text-black text-center mb-6">
          Crazy CHAT
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-black font-semibold mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full p-2 rounded border-2 border-black focus:outline-none focus:border-black"
              required
            />
          </div>
          <div>
            <label className="block text-black font-semibold mb-2">
              Your Gender
            </label>
            <select
              value={formData.gender}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  gender: e.target.value as 'male' | 'female' | 'other',
                })
              }
              className="w-full p-2 rounded border-2 border-black focus:outline-none focus:border-black"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-black font-semibold mb-2">
              Looking for
            </label>
            <div className="space-y-2">
              {['male', 'female', 'other'].map((gender) => (
                <label key={gender} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.preferences.gender.includes(gender)}
                    onChange={(e) => {
                      const newGenders = e.target.checked
                        ? [...formData.preferences.gender, gender]
                        : formData.preferences.gender.filter((g) => g !== gender);
                      setFormData({
                        ...formData,
                        preferences: { ...formData.preferences, gender: newGenders },
                      });
                    }}
                    className="mr-2"
                  />
                  <span className="capitalize">{gender}</span>
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-black text-yellow-400 py-2 px-4 rounded font-bold hover:bg-gray-800 transition-colors"
          >
            Start Chatting
          </button>
        </form>
      </div>
    </div>
  );
};