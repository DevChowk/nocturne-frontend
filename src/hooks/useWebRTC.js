import { useEffect, useRef, useState } from 'react';

// STUN handles the easy 70–80% of NAT setups. Open Relay Project provides
// free TURN relays for symmetric-NAT users (mobile carriers, some routers,
// some corporate networks) who otherwise can't establish a peer connection
// at all. Public credentials — fine for low-volume; for production reliability
// at scale, swap in Twilio / Cloudflare Calls / self-hosted coturn.
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

// Lift the encoder's max bitrate above the WebRTC default (~1–1.5 Mbps for
// 720p). It's a CAP, not a floor — the encoder still adapts down on weak
// networks. Bumps perceived quality on healthy connections without affecting
// latency.
const MAX_VIDEO_BITRATE = 2_500_000; // 2.5 Mbps

// Connection-recovery tuning. `disconnected` is often a transient blip
// (subway, Wi-Fi handoff, captive portal) — give it a grace window before
// declaring failure so we don't trash an otherwise-recoverable call.
// After the window (or on a hard `failed` event), the initiator triggers
// an ICE restart: a fresh candidate exchange that keeps the media senders
// and tracks intact. Cap retries so a permanently broken link still
// terminates and frees the auto-rejoin path.
const ICE_DISCONNECT_GRACE_MS = 5000;
const MAX_ICE_RESTARTS = 3;

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
  // Captures the named signaling handlers so cleanup removes only this
  // connection's listeners (and not concurrent instances' during StrictMode).
  const handlerRefs = useRef(null);

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
    // Hoisted so the effect's cleanup can clear it without reaching into
    // start()'s closure. start() reassigns this when it arms the timer.
    let disconnectTimer = null;
    const clearDisconnectTimer = () => {
      if (disconnectTimer) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
      }
    };

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

      // Connection-recovery bookkeeping. `disconnectTimer` (hoisted to the
      // effect scope so cleanup can clear it) arms when ICE first reports
      // `disconnected`; it fires the restart if the state hasn't recovered
      // by then. `restartCount` caps how many times we try before giving
      // up. Only the initiator drives restarts to avoid both sides creating
      // offers simultaneously (glare).
      let restartCount = 0;
      let restartInFlight = false;
      const tryIceRestart = async () => {
        if (cancelled || restartInFlight || role !== 'initiator') return;
        if (restartCount >= MAX_ICE_RESTARTS) {
          console.warn('[WebRTC] ICE restart cap reached; giving up');
          return;
        }
        restartInFlight = true;
        restartCount += 1;
        console.log(`[WebRTC] triggering ICE restart (attempt ${restartCount}/${MAX_ICE_RESTARTS})`);
        try {
          const offer = await pc.createOffer({ iceRestart: true });
          if (cancelled) return;
          await pc.setLocalDescription(offer);
          socket.emit('offer', { roomId, offer });
        } catch (err) {
          console.error('[WebRTC] ICE restart failed:', err);
        } finally {
          restartInFlight = false;
        }
      };

      // ICE candidate buffer. Remote candidates can arrive before we've
      // called setRemoteDescription (the offer/answer exchange races
      // against the trickle ICE stream). Without buffering, addIceCandidate
      // throws and the connection silently degrades. Queue them, drain
      // after setRemoteDescription resolves.
      const pendingRemoteIce = [];
      let remoteDescriptionSet = false;
      const flushPendingIce = async () => {
        while (pendingRemoteIce.length) {
          const candidate = pendingRemoteIce.shift();
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error('[WebRTC] queued ICE error:', err);
          }
        }
      };

      // Add local tracks to connection
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      // Lift the video sender's bitrate cap. setParameters can throw on
      // older Safari / unusual browser builds; if it does, we just log and
      // keep going — the call still works at the default cap.
      try {
        const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (videoSender) {
          const params = videoSender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = MAX_VIDEO_BITRATE;
          await videoSender.setParameters(params);
        }
      } catch (err) {
        console.warn('[WebRTC] setParameters (bitrate cap) failed:', err.message);
      }

      // Recovery hooks. `disconnected` is recoverable — wait the grace
      // window before declaring failure. `failed` is terminal at the ICE
      // layer but a restart can revive it. `connected`/`completed` mean
      // we're healthy again; reset the restart budget so a fresh blip
      // doesn't start counting against an old one.
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log('[WebRTC] iceConnectionState →', state);
        if (state === 'connected' || state === 'completed') {
          clearDisconnectTimer();
          restartCount = 0;
        } else if (state === 'disconnected') {
          if (!disconnectTimer) {
            disconnectTimer = setTimeout(() => {
              disconnectTimer = null;
              const s = pcRef.current?.iceConnectionState;
              if (s === 'disconnected' || s === 'failed') tryIceRestart();
            }, ICE_DISCONNECT_GRACE_MS);
          }
        } else if (state === 'failed') {
          clearDisconnectTimer();
          tryIceRestart();
        }
      };

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

      // Signaling listeners — assigned to named refs so the cleanup
      // function below can `socket.off(event, handler)` and remove ONLY
      // this connection's listeners, not any concurrent useWebRTC instance
      // (e.g. during React StrictMode double-mount).
      const onOffer = async ({ offer }) => {
        // The initiator restarts ICE by sending a fresh offer; the receiver
        // accepts and answers. Clear any pending grace timer on this side
        // since the renegotiation supersedes whatever blip triggered it.
        clearDisconnectTimer();
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        remoteDescriptionSet = true;
        await flushPendingIce();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { roomId, answer });
      };
      const onAnswer = async ({ answer }) => {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        remoteDescriptionSet = true;
        await flushPendingIce();
      };
      const onIceCandidate = async ({ candidate }) => {
        if (!remoteDescriptionSet) {
          pendingRemoteIce.push(candidate);
          return;
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[WebRTC] ICE error:', err);
        }
      };
      socket.on('offer', onOffer);
      socket.on('answer', onAnswer);
      socket.on('ice_candidate', onIceCandidate);
      // Stash handler refs so the effect's cleanup can remove just these.
      handlerRefs.current = { onOffer, onAnswer, onIceCandidate };

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
      const refs = handlerRefs.current;
      if (refs) {
        socket.off('offer', refs.onOffer);
        socket.off('answer', refs.onAnswer);
        socket.off('ice_candidate', refs.onIceCandidate);
      }
      socket.off('media_state', onPeerMediaState);
      handlerRefs.current = null;
      // Drop the grace timer before closing the peer connection so a stale
      // fire after teardown doesn't try to send an offer on a dead socket
      // or a closed pc.
      clearDisconnectTimer();
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
