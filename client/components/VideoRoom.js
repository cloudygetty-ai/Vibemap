import { useEffect, useRef, useState } from 'react';
import socket from '../lib/socket';

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export default function VideoRoom({ roomId }) {
  const localVideoRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const peerConnections = useRef({});
  const peerStreams = useRef({});       // userId → MediaStream
  const localStream = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    let mounted = true;

    function createPeerConnection(userId) {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current[userId] = pc;

      localStream.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current);
      });

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) socket.emit('rtc_ice_candidate', { to: userId, candidate });
      };

      pc.ontrack = ({ streams }) => {
        peerStreams.current[userId] = streams[0];
        setRemoteStreams((prev) => {
          const already = prev.find((s) => s.id === streams[0].id);
          return already ? prev : [...prev, streams[0]];
        });
      };

      return pc;
    }

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

      socket.on('user_left_call', ({ userId }) => {
        if (!mounted) return;
        const pc = peerConnections.current[userId];
        if (pc) { pc.close(); delete peerConnections.current[userId]; }
        const stream = peerStreams.current[userId];
        if (stream) {
          setRemoteStreams((prev) => prev.filter((s) => s.id !== stream.id));
          delete peerStreams.current[userId];
        }
      });
    }

    startMedia();

    return () => {
      mounted = false;
      socket.emit('leave_video_room', roomId);
      socket.off('user_joined_call');
      socket.off('rtc_offer');
      socket.off('rtc_answer');
      socket.off('rtc_ice_candidate');
      socket.off('user_left_call');
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      peerConnections.current = {};
      peerStreams.current = {};
      localStream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [roomId]);

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
