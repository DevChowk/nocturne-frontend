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
  const [peerMicEnabled, setPeerMicEnabled] = useState(true);
  const [peerCameraEnabled, setPeerCameraEnabled] = useState(true);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  // Mirror of toggle state so callbacks can read the latest values without stale closures
  const stateRef = useRef({ mic: true, camera: true });

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
    // Reset peer state — new match starts fresh
    setPeerMicEnabled(true);
    setPeerCameraEnabled(true);
  }, []);

  const toggleMic = useCallback(() => {
    const next = !stateRef.current.mic;
    stateRef.current.mic = next;
    setMicEnabled(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = next; });
    if (socket && roomId) {
      socket.emit('media_state', {
        roomId,
        micEnabled: next,
        cameraEnabled: stateRef.current.camera,
      });
    }
  }, [socket, roomId]);

  const toggleCamera = useCallback(() => {
    const next = !stateRef.current.camera;
    stateRef.current.camera = next;
    setCameraEnabled(next);
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = next; });
    if (socket && roomId) {
      socket.emit('media_state', {
        roomId,
        micEnabled: stateRef.current.mic,
        cameraEnabled: next,
      });
    }
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket || !roomId || !role) return;

    let cancelled = false;

    // Listen for peer's media-state updates (registered synchronously so it's
    // ready before any peer message can arrive).
    const onPeerMediaState = ({ micEnabled: m, cameraEnabled: c }) => {
      setPeerMicEnabled(m);
      setPeerCameraEnabled(c);
    };
    socket.on('media_state', onPeerMediaState);

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
      stream.getAudioTracks().forEach((t) => { t.enabled = stateRef.current.mic; });
      stream.getVideoTracks().forEach((t) => { t.enabled = stateRef.current.camera; });
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

      // Tell the peer our current mic/camera state. Both sides do this so
      // the other side knows immediately, regardless of who connected first.
      socket.emit('media_state', {
        roomId,
        micEnabled: stateRef.current.mic,
        cameraEnabled: stateRef.current.camera,
      });
    };

    start().catch((err) => console.error('[WebRTC] start error:', err));

    return () => {
      cancelled = true;
      socket.off('offer');
      socket.off('answer');
      socket.off('ice_candidate');
      socket.off('media_state', onPeerMediaState);
      cleanup();
    };
  }, [socket, roomId, role, cleanup]);

  return {
    localStream,
    remoteStream,
    cleanup,
    micEnabled,
    cameraEnabled,
    toggleMic,
    toggleCamera,
    peerMicEnabled,
    peerCameraEnabled,
  };
}
