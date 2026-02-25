import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000');

export default function VideoRoom({ roomId }) {
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef({});
  const peerConnections = useRef({});
  const localStream = useRef(null);
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [joined, setJoined] = useState(false);

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    const startLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Could not access camera/mic:', err);
      }
    };

    startLocalStream();

    socket.on('user_joined_call', async ({ userId }) => {
      setParticipants(prev => [...new Set([...prev, userId])]);
      await createPeerConnection(userId, true);
    });

    socket.on('signal', async ({ from, signal }) => {
      if (signal.type === 'offer') {
        await createPeerConnection(from, false);
        await peerConnections.current[from].setRemoteDescription(signal);
        const answer = await peerConnections.current[from].createAnswer();
        await peerConnections.current[from].setLocalDescription(answer);
        socket.emit('signal', { to: from, signal: answer });
      } else if (signal.type === 'answer') {
        await peerConnections.current[from]?.setRemoteDescription(signal);
      } else if (signal.candidate) {
        await peerConnections.current[from]?.addIceCandidate(signal);
      }
    });

    socket.on('user_left_call', ({ userId }) => {
      setParticipants(prev => prev.filter(id => id !== userId));
      if (peerConnections.current[userId]) {
        peerConnections.current[userId].close();
        delete peerConnections.current[userId];
      }
    });

    return () => {
      localStream.current?.getTracks().forEach(t => t.stop());
      Object.values(peerConnections.current).forEach(pc => pc.close());
      socket.off('user_joined_call');
      socket.off('signal');
      socket.off('user_left_call');
    };
  }, [roomId]);

  const createPeerConnection = async (userId, isInitiator) => {
    const pc = new RTCPeerConnection(iceServers);
    peerConnections.current[userId] = pc;

    localStream.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStream.current);
    });

    pc.ontrack = (event) => {
      const remoteVideo = document.getElementById(`remote-${userId}`);
      if (remoteVideo) {
        remoteVideo.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal', { to: userId, signal: event.candidate });
      }
    };

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('signal', { to: userId, signal: offer });
    }

    return pc;
  };

  const joinRoom = () => {
    socket.emit('join_video_room', roomId);
    setJoined(true);
  };

  const toggleMute = () => {
    localStream.current?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    localStream.current?.getVideoTracks().forEach(t => { t.enabled = isVideoOff; });
    setIsVideoOff(!isVideoOff);
  };

  const leaveRoom = () => {
    socket.emit('leave_video_room', roomId);
    localStream.current?.getTracks().forEach(t => t.stop());
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    setParticipants([]);
    setJoined(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-black rounded-xl overflow-hidden">
      {/* Video grid */}
      <div className="flex-1 grid grid-cols-2 gap-1 p-1">
        {/* Local video */}
        <div className="relative rounded-lg overflow-hidden bg-gray-900">
          {isVideoOff ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-2xl text-gray-400">👤</span>
              </div>
            </div>
          ) : (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          )}
          <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/60 rounded text-xs text-white">
            You {isMuted && '🔇'}
          </div>
        </div>

        {/* Remote videos */}
        {participants.map(userId => (
          <div key={userId} className="relative rounded-lg overflow-hidden bg-gray-900">
            <video
              id={`remote-${userId}`}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/60 rounded text-xs text-white">
              User {userId.slice(-4)}
            </div>
          </div>
        ))}

        {participants.length === 0 && joined && (
          <div className="flex items-center justify-center bg-gray-900 rounded-lg text-gray-500 text-sm">
            Waiting for others...
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3 py-3 bg-gray-900">
        {!joined ? (
          <button
            onClick={joinRoom}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-full text-white text-sm font-medium transition-colors"
          >
            Join Video Call
          </button>
        ) : (
          <>
            <button
              onClick={toggleMute}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors ${isMuted ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🎙️'}
            </button>
            <button
              onClick={toggleVideo}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors ${isVideoOff ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              title={isVideoOff ? 'Turn on video' : 'Turn off video'}
            >
              {isVideoOff ? '📵' : '📹'}
            </button>
            <button
              onClick={leaveRoom}
              className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-colors"
              title="Leave call"
            >
              📵
            </button>
          </>
        )}
      </div>
    </div>
  );
}
