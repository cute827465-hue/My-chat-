import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { Chat, UserProfile } from '../types';
import { formatTime } from '../lib/utils';
import { Check, CheckCheck, MessageSquare } from 'lucide-react';

interface ChatListProps {
  currentUserId: string;
  onSelectChat: (id: string) => void;
  selectedChatId: string | null;
}

interface ChatWithProfile extends Chat {
  profile?: UserProfile;
}

export default function ChatList({ currentUserId, onSelectChat, selectedChatId }: ChatListProps) {
  const [chats, setChats] = useState<ChatWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUserId),
      orderBy('lastMessage.timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatData: ChatWithProfile[] = [];
      
      for (const change of snapshot.docs) {
        const data = change.data() as Chat;
        const otherUserId = data.participants.find(id => id !== currentUserId);
        
        if (otherUserId) {
          const userRef = doc(db, 'users', otherUserId);
          const userSnap = await getDoc(userRef);
          const profile = userSnap.exists() ? (userSnap.data() as UserProfile) : undefined;
          chatData.push({ ...data, profile });
        } else {
          chatData.push(data);
        }
      }
      
      setChats(chatData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching chats:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00a884] border-t-transparent"></div>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <MessageSquare className="mb-4 h-12 w-12 text-[#3b4a54]" />
        <p className="text-[#8696a0]">No chats yet. Start a new conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {chats.map((chat) => (
        <button
          key={chat.id}
          onClick={() => onSelectChat(chat.id)}
          className={`flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-[#202c33] ${
            selectedChatId === chat.id ? 'bg-[#2a3942]' : ''
          }`}
        >
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#3b4a54]">
            {chat.profile?.photoURL ? (
              <img src={chat.profile.photoURL} alt={chat.profile.displayName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white">
                {chat.profile?.displayName?.[0] || '?'}
              </div>
            )}
          </div>
          
          <div className="flex flex-1 flex-col overflow-hidden border-b border-[#222d34] pb-3 text-left">
            <div className="flex items-center justify-between">
              <span className="truncate font-medium text-[#e9edef]">
                {chat.profile?.displayName || chat.profile?.phoneNumber || 'Unknown User'}
              </span>
              <span className="text-xs text-[#8696a0]">
                {chat.lastMessage?.timestamp ? formatTime(chat.lastMessage.timestamp) : ''}
              </span>
            </div>
            
            <div className="flex items-center gap-1 overflow-hidden">
              {chat.lastMessage?.senderId === currentUserId && (
                <CheckCheck className="h-4 w-4 shrink-0 text-[#53bdeb]" />
              )}
              <p className="truncate text-sm text-[#8696a0]">
                {chat.lastMessage?.text || 'No messages yet'}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
