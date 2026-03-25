export interface UserProfile {
  uid: string;
  phoneNumber: string;
  displayName?: string;
  photoURL?: string;
  status?: string;
  lastSeen?: string;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    timestamp: string;
    senderId: string;
  };
  type: 'direct' | 'group';
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: string;
  type: 'text' | 'image';
}
