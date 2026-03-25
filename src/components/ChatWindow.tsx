import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Message, UserProfile } from '../types';
import { formatTime, cn } from '../lib/utils';
import { Send, ArrowLeft, MoreVertical, Smile, Paperclip, Mic, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatWindowProps {
  chatId: string;
  currentUserId: string;
  onBack: () => void;
}

export default function ChatWindow({ chatId, currentUserId, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOtherUser = async () => {
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        const participants = chatSnap.data().participants as string[];
        const otherUserId = participants.find(id => id !== currentUserId);
        if (otherUserId) {
          const userRef = doc(db, 'users', otherUserId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setOtherUser(userSnap.data() as UserProfile);
          }
        }
      }
    };

    fetchOtherUser();
  }, [chatId, currentUserId]);

  useEffect(() => {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(messageData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const messageText = inputText.trim();
    setInputText('');

    try {
      const messageData = {
        chatId,
        senderId: currentUserId,
        text: messageText,
        timestamp: serverTimestamp(),
        type: 'text'
      };

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      
      // Update last message in chat
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: {
          text: messageText,
          timestamp: new Date().toISOString(),
          senderId: currentUserId
        }
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#0b141a]">
      {/* Header */}
      <header className="flex h-16 items-center justify-between bg-[#202c33] px-4 py-2">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden text-[#aebac1] hover:text-white">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="h-10 w-10 overflow-hidden rounded-full bg-[#3b4a54]">
            {otherUser?.photoURL ? (
              <img src={otherUser.photoURL} alt={otherUser.displayName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white">
                {otherUser?.displayName?.[0] || '?'}
              </div>
            )}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate font-medium text-[#e9edef]">
              {otherUser?.displayName || otherUser?.phoneNumber || 'Loading...'}
            </span>
            <span className="text-xs text-[#8696a0]">
              {otherUser?.status || 'Online'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-5 text-[#aebac1]">
          <button className="transition-colors hover:text-white">
            <MoreVertical className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat p-4 custom-scrollbar">
        <div className="flex flex-col gap-2">
          {messages.map((msg) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={msg.id}
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-1.5 text-sm shadow-sm",
                msg.senderId === currentUserId 
                  ? "self-end bg-[#005c4b] text-[#e9edef] rounded-tr-none" 
                  : "self-start bg-[#202c33] text-[#e9edef] rounded-tl-none"
              )}
            >
              <div className="flex flex-col">
                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                <div className="mt-1 flex items-center justify-end gap-1">
                  <span className="text-[10px] opacity-60">
                    {msg.timestamp ? formatTime(msg.timestamp) : ''}
                  </span>
                  {msg.senderId === currentUserId && (
                    <CheckCheck className="h-3 w-3 text-[#53bdeb]" />
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <footer className="bg-[#202c33] px-4 py-2">
        <form onSubmit={handleSendMessage} className="flex items-center gap-4">
          <div className="flex gap-4 text-[#8696a0]">
            <button type="button" className="hover:text-white">
              <Smile className="h-6 w-6" />
            </button>
            <button type="button" className="hover:text-white">
              <Paperclip className="h-6 w-6" />
            </button>
          </div>
          
          <input
            type="text"
            placeholder="Type a message"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 rounded-lg bg-[#2a3942] py-2.5 px-4 text-[#e9edef] outline-none placeholder:text-[#8696a0]"
          />
          
          <button 
            type="submit" 
            disabled={!inputText.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-white transition-transform hover:scale-105 disabled:opacity-50"
          >
            {inputText.trim() ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        </form>
      </footer>
    </div>
  );
}
