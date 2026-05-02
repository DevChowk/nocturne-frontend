import { useEffect, useRef, useState } from 'react';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Manages the RTCPeerConnection lifecycle for a matched call. The local
// stream + mic/camera state live in useLocalMedia (which persists across
// matches). This hook just consumes them, sets up signaling, and exposes
// the remote stream + peer's media state.
export function useWebRTC({ socket, roomId, role, localStream, micEnabled, cameraEnabled }) {
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [peerMicEnabled, setPeerMicEnabled] = useState(true);
  const [peerCameraEnabled, setPeerCameraEnabled] = useState(true);
  const pcRef = useRef(null);

  // Emit media_state when local toggles change (and we're in a call).
  useEffect(() => {
    if (!socket || !roomId) return;
    socket.emit('media_state', {
      roomId,
      micEnabled,
      cameraEnabled,
    });
  }, [socket, roomId, micEnabled, cameraEnabled]);

  useEffect(() => {
    if (!socket || !roomId || !role || !localStream) return;

    let cancelled = false;

    // Listen for peer's media-state updates synchronously so the listener
    // is ready before any peer message can arrive.
    const onPeerMediaState = ({ micEnabled: m, cameraEnabled: c }) => {
      setPeerMicEnabled(m);
      setPeerCameraEnabled(c);
    };
    socket.on('media_state', onPeerMediaState);

    const start = async () => {
      // Create peer connection
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      // Add local tracks to connection
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      // Collect remote tracks
      const remote = new MediaStream();
      setRemoteStream(remote);

      pc.ontrack = (e) => {
        e.streams[0].getTracks().forEach((track) => remote.addTrack(track));
        if (cancelled) return;
        setRemoteStream(new MediaStream(remote.getTracks()));
        setRemoteConnected(true);
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

      // Tell the peer our current mic/camera state. (The dedicated
      // emit-on-toggle effect above also re-emits whenever the local
      // toggle changes, so the peer always has the latest value.)
      socket.emit('media_state', {
        roomId,
        micEnabled,
        cameraEnabled,
      });
    };

    start().catch((err) => console.error('[WebRTC] start error:', err));

    return () => {
      cancelled = true;
      socket.off('offer');
      socket.off('answer');
      socket.off('ice_candidate');
      socket.off('media_state', onPeerMediaState);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      setRemoteStream(null);
      setRemoteConnected(false);
      setPeerMicEnabled(true);
      setPeerCameraEnabled(true);
    };
  // micEnabled/cameraEnabled are read inside start() only for the
  // initial-state emit; subsequent toggles are handled by the
  // dedicated emit-on-toggle effect above. Adding them as deps would
  // tear down and rebuild the peer connection on every toggle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId, role, localStream]);

  return {
    remoteStream,
    remoteConnected,
    peerMicEnabled,
    peerCameraEnabled,
  };
}
