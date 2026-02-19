import { useEffect, useRef, useState } from 'react';
import socket from '../lib/socket';

export default function VideoRoom({ roomId }) {
  const localVideoRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const peerConnections = useRef({});
  const localStream = useRef(null);

  const iceServers = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  };

  useEffect(() => {
    if (!roomId) return;

    let mounted = true;

    async function startMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Media access denied:', err);
        return;
      }

      socket.emit('join_video_room', roomId);

      socket.on('user_joined_call', async ({ userId }) => {
        if (!mounted) return;
        const pc = createPeerConnection(userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('rtc_offer', { to: userId, offer });
      });

      socket.on('rtc_offer', async ({ from, offer }) => {
        if (!mounted) return;
        const pc = createPeerConnection(from);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('rtc_answer', { to: from, answer });
      });

      socket.on('rtc_answer', async ({ from, answer }) => {
        if (!mounted) return;
        const pc = peerConnections.current[from];
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on('rtc_ice_candidate', ({ from, candidate }) => {
        if (!mounted) return;
        const pc = peerConnections.current[from];
        if (pc) pc.addIceCandidate(new RTCIceCandidate(candidate));
      });
    }

    startMedia();

    return () => {
      mounted = false;
      socket.off('user_joined_call');
      socket.off('rtc_offer');
      socket.off('rtc_answer');
      socket.off('rtc_ice_candidate');
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      peerConnections.current = {};
      localStream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [roomId]);

  function createPeerConnection(userId) {
    const pc = new RTCPeerConnection(iceServers);
    peerConnections.current[userId] = pc;

    localStream.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStream.current);
    });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit('rtc_ice_candidate', { to: userId, candidate });
      }
    };

    pc.ontrack = ({ streams }) => {
      setRemoteStreams((prev) => {
        const already = prev.find((s) => s.id === streams[0].id);
        return already ? prev : [...prev, streams[0]];
      });
    };

    return pc;
  }

  return (
    <div className="relative w-full h-full flex flex-wrap gap-2 overflow-auto">
      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className="w-32 h-24 rounded-lg bg-gray-800 object-cover border border-white/10"
      />
      {remoteStreams.map((stream) => (
        <RemoteVideo key={stream.id} stream={stream} />
      ))}
    </div>
  );
}

function RemoteVideo({ stream }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      className="w-32 h-24 rounded-lg bg-gray-800 object-cover border border-white/10"
    />
  );
}
