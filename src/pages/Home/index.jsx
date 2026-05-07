import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useLocalMedia } from '../../hooks/useLocalMedia';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useSettings } from '../../hooks/useSettings';
import OnboardingModal from '../../components/OnboardingModal';
import LobbyView from './LobbyView';
import VideoCallView from './VideoCallView';

// Short two-tone chime via Web Audio (no asset). Browsers gate AudioContext
// behind a user gesture; on initial app load there's none, so the first ping
// after refresh may be silent. Subsequent matches (same session) play fine.
function playMatchTone() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const beep = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.18, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur);
    };
    beep(880, 0, 0.18);
    beep(1320, 0.12, 0.22);
  } catch {
    // ignore — audio is best-effort
  }
}

export default function HomePage() {
  const { user, token, logout, needsOnboarding } = useAuth();
  const { socket, isConnected, error: socketError } = useSocket(token);
  const { settings } = useSettings();
  const [status, setStatus] = useState('idle');
  const [matchInfo, setMatchInfo] = useState(null);
  const [swapped, setSwapped] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  // Per-match friend state. Resets to 'none' on each new match.
  // Values: 'none' | 'sent' | 'received' | 'accepted'
  const [friendStatus, setFriendStatus] = useState('none');
  const isInCall = status === 'matched' && matchInfo;

  const {
    stream: localStream,
    error: mediaError,
    devices,
    micEnabled,
    cameraEnabled,
    toggleMic,
    toggleCamera,
  } = useLocalMedia({
    videoDeviceId: settings.videoDeviceId,
    audioDeviceId: settings.audioDeviceId,
  });

  const {
    remoteStream,
    remoteConnected,
    peerMicEnabled,
    peerCameraEnabled,
  } = useWebRTC({
    socket,
    roomId: matchInfo?.roomId,
    role: matchInfo?.role,
    localStream,
    micEnabled,
    cameraEnabled,
  });

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatEndRef = useRef(null);
  // Mirror of current matchInfo so socket-listener closures (registered once
  // per `socket`) can read the latest peer ID without re-subscribing.
  const matchInfoRef = useRef(null);
  useEffect(() => { matchInfoRef.current = matchInfo; }, [matchInfo]);

  // Re-bind srcObject whenever the underlying stream changes OR the DOM
  // element behind the ref changes (LobbyView ↔ VideoCallView transition,
  // PIP swap, etc.). isInCall + swapped force the effect to run on those
  // transitions; the equality guards avoid redundant assignments.
  useEffect(() => {
    if (localVideoRef.current && localStream && localVideoRef.current.srcObject !== localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isInCall, swapped]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && remoteVideoRef.current.srcObject !== remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isInCall, swapped]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Apply reduce-motion class on <html> based on user setting (with OS fallback).
  useEffect(() => {
    const osPrefers = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const should = settings.reduceMotion === null ? osPrefers : settings.reduceMotion;
    document.documentElement.classList.toggle('reduce-motion', should);
  }, [settings.reduceMotion]);

  // Tab-title alert when a match arrives while the tab is in the background.
  useEffect(() => {
    if (status !== 'matched') return;
    if (!document.hidden) return;
    const original = document.title;
    document.title = '✨ Match found! — Nocturne';
    const onVisible = () => {
      if (!document.hidden) {
        document.title = original;
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.title = original;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [status]);

  useEffect(() => {
    if (!socket) return;
    const onWaiting = () => setStatus('waiting');
    const onMatchFound = (data) => {
      setStatus('matched');
      setMatchInfo({
        roomId: data.roomId,
        role: data.role,
        peerUserId: data.peerUserId,
        peerUsername: data.peerUsername,
        peerDisplayName: data.peerDisplayName,
        peerCountry: data.peerCountry,
      });
      setMessages([]);
      setSwapped(false);
      setFriendStatus('none');
      if (settings.matchSound) playMatchTone();
    };
    const onLeftQueue = () => { setStatus('idle'); setMatchInfo(null); };
    const onPeerDisconnected = () => { setStatus('peer_left'); setMatchInfo(null); setMessages([]); };
    const onCallEnded = () => { setStatus('peer_left'); setMatchInfo(null); setMessages([]); };
    const onChatMessage = (data) => setMessages(prev => [...prev, { message: data.message, from: data.from, timestamp: data.timestamp, mine: false }]);
    // Peer hit Add Friend during the call. If we're matched with them, light
    // up the in-call CTA. Outside a call this is harmless (the badge in the
    // profile menu refreshes via /me on the next mount).
    const onFriendRequestReceived = (data) => {
      const fromId = data?.user?.id;
      if (fromId && matchInfoRef.current?.peerUserId === fromId) {
        // Don't downgrade if we already accepted/sent.
        setFriendStatus((prev) => (prev === 'accepted' || prev === 'sent') ? prev : 'received');
      }
    };
    const onFriendAccepted = (data) => {
      const peerId = data?.user?.id;
      if (peerId && matchInfoRef.current?.peerUserId === peerId) {
        setFriendStatus('accepted');
      }
    };

    socket.on('waiting', onWaiting);
    socket.on('match_found', onMatchFound);
    socket.on('left_queue', onLeftQueue);
    socket.on('peer_disconnected', onPeerDisconnected);
    socket.on('call_ended', onCallEnded);
    socket.on('chat_message', onChatMessage);
    socket.on('friend_request_received', onFriendRequestReceived);
    socket.on('friend_accepted', onFriendAccepted);
    return () => {
      socket.off('waiting', onWaiting);
      socket.off('match_found', onMatchFound);
      socket.off('left_queue', onLeftQueue);
      socket.off('peer_disconnected', onPeerDisconnected);
      socket.off('call_ended', onCallEnded);
      socket.off('chat_message', onChatMessage);
      socket.off('friend_request_received', onFriendRequestReceived);
      socket.off('friend_accepted', onFriendAccepted);
    };
  }, [socket, settings.matchSound]);

  const findMatch = useCallback(() => { socket?.emit('join_queue'); setStatus('waiting'); }, [socket]);
  const cancel = useCallback(() => { socket?.emit('leave_queue'); }, [socket]);
  const skip = useCallback(() => {
    if (matchInfo?.roomId) socket?.emit('end_call', { roomId: matchInfo.roomId });
    setMatchInfo(null); setMessages([]);
    socket?.emit('join_queue'); setStatus('waiting');
  }, [socket, matchInfo]);
  const endCall = useCallback(() => {
    if (matchInfo?.roomId) socket?.emit('end_call', { roomId: matchInfo.roomId });
    setMatchInfo(null); setMessages([]); setStatus('idle');
  }, [socket, matchInfo]);
  const sendMessage = useCallback((e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !matchInfo?.roomId || !socket) return;
    socket.emit('chat_message', { roomId: matchInfo.roomId, message: text });
    setMessages(prev => [...prev, { message: text, from: user.id, timestamp: new Date().toISOString(), mine: true }]);
    setChatInput('');
  }, [socket, chatInput, matchInfo, user]);

  // Keyboard shortcuts — only active in-call. Skip when typing in chat or other inputs.
  useEffect(() => {
    if (!isInCall) return;
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'n':
          e.preventDefault();
          skip();
          break;
        case 'escape':
          e.preventDefault();
          endCall();
          break;
        case 'm':
          e.preventDefault();
          toggleMic();
          break;
        case 'v':
          e.preventDefault();
          toggleCamera();
          break;
        default:
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isInCall, skip, endCall, toggleMic, toggleCamera]);

  // Forced onboarding gate. When the user has no username yet, render the
  // lobby behind a non-dismissable OnboardingModal so they can't proceed
  // without picking a username + DOB. Re-renders normally once the modal
  // finishes (needsOnboarding becomes false after the PATCH).
  const onboardingGate = needsOnboarding ? <OnboardingModal /> : null;

  if (isInCall) {
    return <>{onboardingGate}<VideoCallView
      user={user}
      swapped={swapped}
      setSwapped={setSwapped}
      localVideoRef={localVideoRef}
      remoteVideoRef={remoteVideoRef}
      messages={messages}
      chatInput={chatInput}
      setChatInput={setChatInput}
      chatEndRef={chatEndRef}
      sendMessage={sendMessage}
      skip={skip}
      endCall={endCall}
      micEnabled={micEnabled}
      cameraEnabled={cameraEnabled}
      toggleMic={toggleMic}
      toggleCamera={toggleCamera}
      peerMicEnabled={peerMicEnabled}
      peerCameraEnabled={peerCameraEnabled}
      remoteConnected={remoteConnected}
      roomId={matchInfo?.roomId}
      peerUserId={matchInfo?.peerUserId}
      peerUsername={matchInfo?.peerUsername}
      peerDisplayName={matchInfo?.peerDisplayName}
      peerCountry={matchInfo?.peerCountry}
      mirrorLocal={settings.mirrorLocal}
      friendStatus={friendStatus}
      onFriendStatusChange={setFriendStatus}
    /></>;
  }

  return <>{onboardingGate}<LobbyView
    user={user}
    isConnected={isConnected}
    socketError={socketError}
    status={status}
    findMatch={findMatch}
    cancel={cancel}
    logout={logout}
    localStream={localStream}
    mediaError={mediaError}
    micEnabled={micEnabled}
    cameraEnabled={cameraEnabled}
    toggleMic={toggleMic}
    toggleCamera={toggleCamera}
    localVideoRef={localVideoRef}
    mirrorLocal={settings.mirrorLocal}
    devices={devices}
  /></>;
}
