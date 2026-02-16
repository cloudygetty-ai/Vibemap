'use client';

import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000');

export default function VideoRoom({ roomId }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: true,
      });

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      socket.emit('join_video_room', roomId);

      socket.on('user_joined_call', async () => {
        const pc = createPeer(stream);
        peerRef.current = pc;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('signal', { roomId, signal: offer });
      });

      socket.on('signal', async ({ signal }) => {
        if (signal.type === 'offer') {
          const pc = createPeer(stream);
          peerRef.current = pc;
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('signal', { roomId, signal: answer });
        } else if (signal.type === 'answer') {
          await peerRef.current?.setRemoteDescription(
            new RTCSessionDescription(signal)
          );
        } else if (signal.candidate) {
          await peerRef.current?.addIceCandidate(
            new RTCIceCandidate(signal)
          );
        }
      });
    }

    function createPeer(stream) {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('signal', { roomId, signal: e.candidate });
        }
      };

      pc.ontrack = (e) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
          setConnected(true);
        }
      };

      return pc;
    }

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      peerRef.current?.close();
      socket.off('user_joined_call');
      socket.off('signal');
    };
  }, [roomId]);

  return (
    <div className="relative w-full h-full">
      {/* Remote video (full) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover rounded-xl bg-black"
      />

      {/* Local video (picture-in-picture) */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute bottom-4 right-4 w-32 h-24 object-cover rounded-lg border-2 border-white/20 shadow-lg"
      />

      {!connected && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="glass-panel px-6 py-3 rounded-2xl">
            <p className="text-white/60 text-sm">Waiting for others to join...</p>
          </div>
        </div>
      )}
    </div>
  );
}
