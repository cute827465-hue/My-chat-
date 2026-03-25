import { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { X, Camera, Check, ArrowLeft, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileProps {
  profile: UserProfile | null;
  onClose: () => void;
}

export default function Profile({ profile, onClose }: ProfileProps) {
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [status, setStatus] = useState(profile?.status || '');
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);

  const handleUpdate = async (field: 'displayName' | 'status', value: string) => {
    if (!profile) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, { [field]: value });
      if (field === 'displayName') setEditingName(false);
      if (field === 'status') setEditingStatus(false);
    } catch (err) {
      console.error("Update error:", err);
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
          <h2 className="text-xl font-medium text-[#e9edef]">Profile</h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-[#111b21]">
        <div className="flex flex-col items-center py-8">
          <div className="group relative h-48 w-48 overflow-hidden rounded-full bg-[#3b4a54] shadow-lg">
            <img src={profile?.photoURL} alt="Profile" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="mb-1 h-8 w-8 text-white" />
              <span className="text-xs font-medium text-white">CHANGE PROFILE PHOTO</span>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-8">
          <div className="space-y-4">
            <label className="text-sm font-medium text-[#00a884]">Your Name</label>
            <div className="flex items-center justify-between gap-4 border-b border-[#222d34] pb-2">
              {editingName ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-transparent text-lg text-[#e9edef] outline-none"
                  autoFocus
                />
              ) : (
                <span className="text-lg text-[#e9edef]">{displayName}</span>
              )}
              {editingName ? (
                <button onClick={() => handleUpdate('displayName', displayName)} className="text-[#00a884]">
                  <Check className="h-5 w-5" />
                </button>
              ) : (
                <button onClick={() => setEditingName(true)} className="text-[#8696a0] hover:text-white">
                  <Edit2 className="h-5 w-5" />
                </button>
              )}
            </div>
            <p className="text-xs text-[#8696a0]">
              This is not your username or pin. This name will be visible to your ChatWave contacts.
            </p>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-[#00a884]">About</label>
            <div className="flex items-center justify-between gap-4 border-b border-[#222d34] pb-2">
              {editingStatus ? (
                <input
                  type="text"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-transparent text-lg text-[#e9edef] outline-none"
                  autoFocus
                />
              ) : (
                <span className="text-lg text-[#e9edef]">{status}</span>
              )}
              {editingStatus ? (
                <button onClick={() => handleUpdate('status', status)} className="text-[#00a884]">
                  <Check className="h-5 w-5" />
                </button>
              ) : (
                <button onClick={() => setEditingStatus(true)} className="text-[#8696a0] hover:text-white">
                  <Edit2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-[#00a884]">Phone Number</label>
            <div className="flex items-center justify-between gap-4 border-b border-[#222d34] pb-2">
              <span className="text-lg text-[#e9edef]">{profile?.phoneNumber}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
