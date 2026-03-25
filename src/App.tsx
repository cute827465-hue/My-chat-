import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import Login from './components/Login';
import MainApp from './components/MainApp';
import { UserProfile } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Sync user profile
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const newProfile: UserProfile = {
            uid: currentUser.uid,
            phoneNumber: currentUser.phoneNumber || '',
            displayName: currentUser.displayName || 'User',
            photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`,
            status: 'Hey there! I am using ChatWave.',
            lastSeen: new Date().toISOString(),
          };
          await setDoc(userRef, {
            ...newProfile,
            lastSeen: serverTimestamp(),
          });
          setProfile(newProfile);
        } else {
          setProfile(userSnap.data() as UserProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#111b21] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00a884] border-t-transparent"></div>
          <p className="text-sm font-medium opacity-70">Loading ChatWave...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#111b21] text-[#e9edef]">
      {user ? <MainApp user={user} profile={profile} /> : <Login />}
    </div>
  );
}
