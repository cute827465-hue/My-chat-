import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, onSnapshot, updateDoc, addDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';

interface CallManagerProps {
  currentUserId: string;
  incomingCallId?: string | null;
  outgoingCallData?: { calleeId: string; type: 'voice' | 'video' } | null;
  onClose: () => void;
}

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

export default function CallManager({ currentUserId, incomingCallId, outgoingCallData, onClose }: CallManagerProps) {
  const [callStatus, setCallStatus] = useState<'ringing' | 'active' | 'ended'>('ringing');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const pc = useRef<RTCPeerConnection>(new RTCPeerConnection(servers));
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callIdRef = useRef<string | null>(incomingCallId || null);

  useEffect(() => {
    const setupStreams = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: outgoingCallData?.type === 'video' || (incomingCallId ? true : false),
          audio: true,
        });
        setLocalStream(stream);
        stream.getTracks().forEach((track) => pc.current.addTrack(track, stream));

        pc.current.ontrack = (event) => {
          setRemoteStream(event.streams[0]);
        };

        if (outgoingCallData) {
          await startCall(outgoingCallData.calleeId, outgoingCallData.type);
        } else if (incomingCallId) {
          await answerCall(incomingCallId);
        }
      } catch (err) {
        console.error("Error accessing media devices:", err);
        onClose();
      }
    };

    setupStreams();

    return () => {
      localStream?.getTracks().forEach(track => track.stop());
      pc.current.close();
      if (callIdRef.current) {
        updateDoc(doc(db, 'calls', callIdRef.current), { status: 'ended' });
      }
    };
  }, []);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const startCall = async (calleeId: string, type: 'voice' | 'video') => {
    const callDoc = doc(collection(db, 'calls'));
    callIdRef.current = callDoc.id;

    // Fetch other user profile
    const userSnap = await getDoc(doc(db, 'users', calleeId));
    if (userSnap.exists()) setOtherUser(userSnap.data() as UserProfile);

    const callerCandidates = collection(callDoc, 'callerCandidates');
    const calleeCandidates = collection(callDoc, 'calleeCandidates');

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(callerCandidates, event.candidate.toJSON());
      }
    };

    const offerDescription = await pc.current.createOffer();
    await pc.current.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await setDoc(callDoc, {
      id: callDoc.id,
      callerId: currentUserId,
      calleeId,
      type,
      status: 'ringing',
      offer,
      timestamp: serverTimestamp(),
    });

    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (!pc.current.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.current.setRemoteDescription(answerDescription);
        setCallStatus('active');
      }
      if (data?.status === 'ended') {
        onClose();
      }
    });

    onSnapshot(calleeCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          pc.current.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  };

  const answerCall = async (callId: string) => {
    const callDoc = doc(db, 'calls', callId);
    const callSnap = await getDoc(callDoc);
    const callData = callSnap.data();

    if (!callData) return;

    // Fetch other user profile
    const userSnap = await getDoc(doc(db, 'users', callData.callerId));
    if (userSnap.exists()) setOtherUser(userSnap.data() as UserProfile);

    const callerCandidates = collection(callDoc, 'callerCandidates');
    const calleeCandidates = collection(callDoc, 'calleeCandidates');

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(calleeCandidates, event.candidate.toJSON());
      }
    };

    const offerDescription = callData.offer;
    await pc.current.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await updateDoc(callDoc, { answer, status: 'active' });
    setCallStatus('active');

    onSnapshot(callerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          pc.current.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });

    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (data?.status === 'ended') {
        onClose();
      }
    });
  };

  const endCall = async () => {
    if (callIdRef.current) {
      await updateDoc(doc(db, 'calls', callIdRef.current), { status: 'ended' });
    }
    onClose();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
    >
      <div className="relative flex h-full w-full max-w-4xl flex-col items-center justify-center p-4 md:h-[80vh]">
        {/* Remote Video (Full Screen) */}
        <div className="relative h-full w-full overflow-hidden rounded-2xl bg-[#202c33]">
          {outgoingCallData?.type === 'video' || incomingCallId ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4">
              <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-[#00a884]">
                <img src={otherUser?.photoURL} alt="" className="h-full w-full object-cover" />
              </div>
              <h2 className="text-2xl font-semibold text-white">{otherUser?.displayName || 'User'}</h2>
              <p className="text-[#8696a0]">{callStatus === 'ringing' ? 'Ringing...' : 'Voice Call Active'}</p>
            </div>
          )}

          {/* Local Video (Picture in Picture) */}
          {(outgoingCallData?.type === 'video' || incomingCallId) && (
            <div className="absolute bottom-24 right-4 h-40 w-32 overflow-hidden rounded-xl border-2 border-[#00a884] bg-black shadow-xl md:bottom-28">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Call Controls */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6">
            <button
              onClick={toggleMute}
              className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
                isMuted ? 'bg-red-500 text-white' : 'bg-[#2a3942] text-[#aebac1] hover:bg-[#3b4a54]'
              }`}
            >
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>

            {(outgoingCallData?.type === 'video' || incomingCallId) && (
              <button
                onClick={toggleVideo}
                className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
                  isVideoOff ? 'bg-red-500 text-white' : 'bg-[#2a3942] text-[#aebac1] hover:bg-[#3b4a54]'
                }`}
              >
                {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
              </button>
            )}

            <button
              onClick={endCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white transition-all hover:bg-red-700"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Incoming Call Overlay */}
        {incomingCallId && callStatus === 'ringing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
            <div className="mb-6 h-24 w-24 overflow-hidden rounded-full border-4 border-[#00a884]">
              <img src={otherUser?.photoURL} alt="" className="h-full w-full object-cover" />
            </div>
            <h3 className="text-xl font-bold text-white">{otherUser?.displayName}</h3>
            <p className="mb-8 text-[#8696a0]">Incoming Call...</p>
            <div className="flex gap-8">
              <button
                onClick={endCall}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white"
              >
                <PhoneOff className="h-8 w-8" />
              </button>
              <button
                onClick={() => setCallStatus('active')}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[#00a884] text-white animate-pulse"
              >
                <Phone className="h-8 w-8" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
