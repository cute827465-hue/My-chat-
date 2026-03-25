import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, Chat } from '../types';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import NewChat from './NewChat';
import Profile from './Profile';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Users, Phone, MoreVertical, Search, LogOut } from 'lucide-react';
import { auth } from '../firebase';

interface MainAppProps {
  user: User;
  profile: UserProfile | null;
}

export default function MainApp({ user, profile }: MainAppProps) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => auth.signOut();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#111b21]">
      {/* Sidebar / Chat List */}
      <div className={`${isMobile && selectedChatId ? 'hidden' : 'flex'} w-full flex-col border-r border-[#222d34] md:w-[30%] lg:w-[25%] min-w-[350px]`}>
        {/* Header */}
        <header className="flex h-16 items-center justify-between bg-[#202c33] px-4 py-2">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowProfile(true)} className="h-10 w-10 overflow-hidden rounded-full transition-opacity hover:opacity-80">
              <img src={profile?.photoURL} alt="Profile" className="h-full w-full object-cover" />
            </button>
          </div>
          <div className="flex items-center gap-5 text-[#aebac1]">
            <button onClick={() => setShowNewChat(true)} className="transition-colors hover:text-white">
              <MessageSquare className="h-6 w-6" />
            </button>
            <button onClick={handleLogout} className="transition-colors hover:text-white">
              <LogOut className="h-6 w-6" />
            </button>
          </div>
        </header>

        {/* Search */}
        <div className="bg-[#111b21] p-2">
          <div className="flex items-center gap-4 rounded-lg bg-[#202c33] px-4 py-1.5">
            <Search className="h-5 w-5 text-[#8696a0]" />
            <input
              type="text"
              placeholder="Search or start new chat"
              className="w-full bg-transparent text-sm text-[#e9edef] outline-none placeholder:text-[#8696a0]"
            />
          </div>
        </div>

        {/* Chat List Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ChatList 
            currentUserId={user.uid} 
            onSelectChat={(id) => setSelectedChatId(id)} 
            selectedChatId={selectedChatId}
          />
        </div>
      </div>

      {/* Main Chat Window */}
      <div className={`${isMobile && !selectedChatId ? 'hidden' : 'flex'} flex-1 flex-col bg-[#0b141a]`}>
        {selectedChatId ? (
          <ChatWindow 
            chatId={selectedChatId} 
            currentUserId={user.uid} 
            onBack={() => setSelectedChatId(null)} 
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center p-8">
            <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-[#202c33]">
              <MessageSquare className="h-16 w-16 text-[#8696a0]" />
            </div>
            <h2 className="text-3xl font-light text-[#e9edef]">ChatWave Web</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#8696a0]">
              Send and receive messages without keeping your phone online.
              Use ChatWave on up to 4 linked devices and 1 phone at the same time.
            </p>
            <div className="mt-auto flex items-center gap-2 text-xs text-[#667781]">
              <Phone className="h-3 w-3" />
              End-to-end encrypted
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showNewChat && (
          <NewChat 
            currentUserId={user.uid} 
            onClose={() => setShowNewChat(false)} 
            onChatCreated={(id) => {
              setSelectedChatId(id);
              setShowNewChat(false);
            }}
          />
        )}
        {showProfile && (
          <Profile 
            profile={profile} 
            onClose={() => setShowProfile(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
