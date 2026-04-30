import { useEffect, useRef, useState, useCallback } from 'react';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useWebRTC(socket, roomId, role) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const toggleMic = useCallback(() => {
    setMicEnabled((prev) => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = next; });
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraEnabled((prev) => {
      const next = !prev;
      localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = next; });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!socket || !roomId || !role) return;

    let cancelled = false;

    const start = async () => {
      // Get camera + mic
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      // Apply current toggle state to fresh tracks so the user's
      // mic/camera preference persists across matches in a session.
      stream.getAudioTracks().forEach((t) => { t.enabled = micEnabled; });
      stream.getVideoTracks().forEach((t) => { t.enabled = cameraEnabled; });
      setLocalStream(stream);

      // Create peer connection
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      // Add local tracks to connection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Collect remote tracks
      const remote = new MediaStream();
      setRemoteStream(remote);

      pc.ontrack = (e) => {
        e.streams[0].getTracks().forEach((track) => remote.addTrack(track));
        setRemoteStream(new MediaStream(remote.getTracks()));
      };

      // Trickle ICE
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('ice_candidate', { roomId, candidate: e.candidate });
        }
      };

      // Signaling listeners
      socket.on('offer', async ({ offer }) => {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { roomId, answer });
      });

      socket.on('answer', async ({ answer }) => {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on('ice_candidate', async ({ candidate }) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[WebRTC] ICE error:', err);
        }
      });

      // Initiator creates offer
      if (role === 'initiator') {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { roomId, offer });
      }
    };

    start().catch((err) => console.error('[WebRTC] start error:', err));

    return () => {
      cancelled = true;
      socket.off('offer');
      socket.off('answer');
      socket.off('ice_candidate');
      cleanup();
    };
  // micEnabled/cameraEnabled are intentionally excluded — toggles during a
  // live call mutate tracks directly via the callbacks above, and we don't
  // want a state change to tear down the peer connection.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId, role, cleanup]);

  return {
    localStream,
    remoteStream,
    cleanup,
    micEnabled,
    cameraEnabled,
    toggleMic,
    toggleCamera,
  };
}
