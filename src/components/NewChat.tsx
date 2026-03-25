import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { Search, X, UserPlus, Phone, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface NewChatProps {
  currentUserId: string;
  onClose: () => void;
  onChatCreated: (chatId: string) => void;
}

export default function NewChat({ currentUserId, onClose, onChatCreated }: NewChatProps) {
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone.trim()) return;

    setLoading(true);
    setError('');
    setSearchResults([]);

    try {
      const q = query(
        collection(db, 'users'),
        where('phoneNumber', '==', searchPhone.trim())
      );
      const querySnapshot = await getDocs(q);
      const results: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as UserProfile;
        if (data.uid !== currentUserId) {
          results.push(data);
        }
      });
      
      if (results.length === 0) {
        setError('No user found with this phone number.');
      } else {
        setSearchResults(results);
      }
    } catch (err) {
      console.error("Search error:", err);
      setError('Failed to search for user.');
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (otherUser: UserProfile) => {
    setLoading(true);
    try {
      // Check if chat already exists
      const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', currentUserId)
      );
      const querySnapshot = await getDocs(q);
      let existingChatId = null;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.participants.includes(otherUser.uid) && data.type === 'direct') {
          existingChatId = doc.id;
        }
      });

      if (existingChatId) {
        onChatCreated(existingChatId);
        return;
      }

      // Create new chat
      const newChatRef = await addDoc(collection(db, 'chats'), {
        participants: [currentUserId, otherUser.uid],
        type: 'direct',
        lastMessage: {
          text: 'Start of conversation',
          timestamp: new Date().toISOString(),
          senderId: currentUserId
        }
      });
      
      // Update with ID
      await setDoc(doc(db, 'chats', newChatRef.id), { id: newChatRef.id }, { merge: true });
      
      onChatCreated(newChatRef.id);
    } catch (err) {
      console.error("Error starting chat:", err);
      setError('Failed to start chat.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="absolute inset-0 z-50 flex flex-col bg-[#111b21]"
    >
      <header className="flex h-24 items-end bg-[#202c33] px-4 pb-4">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="text-[#e9edef] hover:text-[#00a884]">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h2 className="text-xl font-medium text-[#e9edef]">New Chat</h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8696a0]" />
            <input
              type="tel"
              placeholder="Search phone number (e.g., +1234567890)"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="w-full rounded-lg bg-[#202c33] py-2.5 pl-10 pr-4 text-[#e9edef] outline-none placeholder:text-[#8696a0] focus:ring-1 focus:ring-[#00a884]"
            />
          </div>
          <button type="submit" className="hidden">Search</button>
        </form>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00a884] border-t-transparent"></div>
          </div>
        )}

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <div className="space-y-2">
          {searchResults.map((user) => (
            <button
              key={user.uid}
              onClick={() => startChat(user)}
              className="flex w-full items-center gap-4 rounded-lg p-3 transition-colors hover:bg-[#202c33]"
            >
              <div className="h-12 w-12 overflow-hidden rounded-full bg-[#3b4a54]">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white">
                    {user.displayName?.[0] || '?'}
                  </div>
                )}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-medium text-[#e9edef]">{user.displayName || user.phoneNumber}</span>
                <span className="text-xs text-[#8696a0]">{user.status || 'Hey there! I am using ChatWave.'}</span>
              </div>
              <UserPlus className="ml-auto h-5 w-5 text-[#00a884]" />
            </button>
          ))}
        </div>

        {!loading && searchResults.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[#8696a0]">
            <Phone className="mb-4 h-12 w-12 opacity-20" />
            <p>Search for friends by their phone number to start chatting.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
