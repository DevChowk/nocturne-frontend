import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useLocalMedia } from '../../hooks/useLocalMedia';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useSettings } from '../../hooks/useSettings';
import { useNsfwScanner } from '../../hooks/useNsfwScanner';
import { useFriends } from '../../hooks/useFriends';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import OnboardingModal from '../../components/OnboardingModal';
import AppHeader from '../../components/AppHeader';
import FriendsSidebar from '../../components/FriendsSidebar';
import ProfileModal from '../../components/ProfileModal';
import ProfileEditModal from '../../components/ProfileEditModal';
import LogoutConfirmModal from '../../components/LogoutConfirmModal';
import SettingsModal from '../../components/SettingsModal';
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
  // Why the last call ended — drives the message the lobby shows
  // afterwards. 'nsfw' surfaces the moderation-end message; 'peer_left'
  // (the default behavior) keeps the existing "Your match disconnected."
  const [lastEndReason, setLastEndReason] = useState(null);
  const [onlineCount, setOnlineCount] = useState(null);
  const { friends, loading: friendsLoading } = useFriends(socket);
  // Lifted from LobbyView so FriendsSidebar (always rendered) can also
  // trigger the profile menu, regardless of whether we're in the lobby
  // or in a call.
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const navigate = useNavigate();
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
  // Mirror of the friends list so the match_found handler (registered once
  // per socket) can read the latest list without re-subscribing.
  const friendsRef = useRef(friends);
  useEffect(() => { friendsRef.current = friends; }, [friends]);
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
    document.title = '✨ Match found! — Bump';
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
        peerInterests: Array.isArray(data.peerInterests) ? data.peerInterests : [],
      });
      setMessages([]);
      setSwapped(false);
      // Server-authoritative: backend includes `isFriend` in the match
      // payload (single indexed lookup at pair time), so we don't depend
      // on /api/friends having resolved before match_found arrives. We
      // still fall back to the local friends list when the flag is absent
      // (older server / dev environment).
      const alreadyFriend = typeof data.isFriend === 'boolean'
        ? data.isFriend
        : friendsRef.current.some((f) => String(f.user.id) === String(data.peerUserId));
      setFriendStatus(alreadyFriend ? 'accepted' : 'none');
      setLastEndReason(null);
      if (settings.matchSound) playMatchTone();
    };
    const onLeftQueue = () => { setStatus('idle'); setMatchInfo(null); };
    // Both handlers ignore stale events: if the event's roomId doesn't match
    // our current matchInfo (e.g. user already skipped to a new room), drop
    // it. Without this, a peer disconnect that races with our own skip
    // can yank us out of the freshly-joined queue back to 'peer_left'.
    const isStaleRoomEvent = (data) => {
      if (!data?.roomId) return false; // legacy / payloadless event — process
      return matchInfoRef.current?.roomId !== data.roomId;
    };
    const onPeerDisconnected = (data) => {
      if (isStaleRoomEvent(data)) return;
      setStatus('peer_left'); setMatchInfo(null); setMessages([]);
    };
    const onCallEnded = (data) => {
      if (isStaleRoomEvent(data)) return;
      setStatus('peer_left'); setMatchInfo(null); setMessages([]);
    };
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

    // Match-lost — the server says the room we thought we were in no longer
    // exists (e.g. backend restarted mid-call, in-memory activeRooms wiped).
    // Bounce to the peer-left state so the UI doesn't sit in a stale call.
    const onMatchLost = () => {
      setStatus('peer_left');
      setMatchInfo(null);
      setMessages([]);
    };

    // After any socket reconnect, if we still locally believe we're in a
    // call, ask the server whether the room is still alive. If not, the
    // server fires match_lost and we clean up.
    const onConnect = () => {
      const current = matchInfoRef.current;
      if (current?.roomId) {
        socket.emit('check_room', { roomId: current.roomId });
      }
    };

    const onOnlineCount = (data) => {
      if (typeof data?.count === 'number') setOnlineCount(data.count);
    };

    socket.on('waiting', onWaiting);
    socket.on('match_found', onMatchFound);
    socket.on('left_queue', onLeftQueue);
    socket.on('peer_disconnected', onPeerDisconnected);
    socket.on('call_ended', onCallEnded);
    socket.on('chat_message', onChatMessage);
    socket.on('friend_request_received', onFriendRequestReceived);
    socket.on('friend_accepted', onFriendAccepted);
    socket.on('match_lost', onMatchLost);
    socket.on('connect', onConnect);
    socket.on('online_count', onOnlineCount);
    return () => {
      socket.off('waiting', onWaiting);
      socket.off('match_found', onMatchFound);
      socket.off('left_queue', onLeftQueue);
      socket.off('peer_disconnected', onPeerDisconnected);
      socket.off('call_ended', onCallEnded);
      socket.off('chat_message', onChatMessage);
      socket.off('friend_request_received', onFriendRequestReceived);
      socket.off('friend_accepted', onFriendAccepted);
      socket.off('match_lost', onMatchLost);
      socket.off('connect', onConnect);
      socket.off('online_count', onOnlineCount);
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

  // Inbound NSFW scanner. Runs while in-call; when the peer's video trips
  // the threshold (debounced over two scans), end the call and file a
  // synthetic auto_nsfw report against the peer. Backend dedupes per
  // (reporter, roomId, 'auto_nsfw') so this can't repeat-trigger inside
  // the same call.
  const onNsfwFlag = useCallback(async () => {
    const info = matchInfoRef.current;
    if (!info?.roomId) return;
    // Fire-and-forget the report; don't block end-call on it.
    if (info.peerUserId) {
      api.post('/api/reports', {
        reportedUserId: info.peerUserId,
        roomId: info.roomId,
        reason: 'auto_nsfw',
      }).catch((err) => console.warn('[nsfw] report failed:', err.message));
    }
    setLastEndReason('nsfw');
    if (info.roomId) socket?.emit('end_call', { roomId: info.roomId });
    setMatchInfo(null);
    setMessages([]);
    setStatus('peer_left');
  }, [socket]);

  useNsfwScanner({
    videoRef: remoteVideoRef,
    enabled: isInCall && !!remoteConnected,
    onFlag: onNsfwFlag,
  });

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

  const mainView = isInCall ? (
    <VideoCallView
      user={user}
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
      peerInterests={matchInfo?.peerInterests}
      mirrorLocal={settings.mirrorLocal}
      friendStatus={friendStatus}
      onFriendStatusChange={setFriendStatus}
    />
  ) : (
    <LobbyView
      user={user}
      isConnected={isConnected}
      socketError={socketError}
      status={status}
      findMatch={findMatch}
      cancel={cancel}
      localStream={localStream}
      mediaError={mediaError}
      micEnabled={micEnabled}
      cameraEnabled={cameraEnabled}
      toggleMic={toggleMic}
      toggleCamera={toggleCamera}
      localVideoRef={localVideoRef}
      mirrorLocal={settings.mirrorLocal}
      lastEndReason={lastEndReason}
      onlineCount={onlineCount}
      onProfileClick={() => setShowProfile(true)}
    />
  );

  return (
    <>
      {onboardingGate}
      <div
        className="flex flex-col h-[100dvh] min-h-[100dvh] overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 12% 22%, rgba(186,158,255,0.18) 0%, transparent 45%),' +
            'radial-gradient(circle at 88% 78%, rgba(0,207,252,0.14) 0%, transparent 45%),' +
            '#0e0e0e',
        }}
      >
        <AppHeader
          user={user}
          isConnected={isConnected}
          onlineCount={onlineCount}
          onProfileClick={() => setShowProfile(true)}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {!isInCall && <FriendsSidebar friends={friends} loading={friendsLoading} />}
          {mainView}
        </div>
      </div>
      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onSettings={() => { setShowProfile(false); setShowSettings(true); }}
          onEditProfile={() => { setShowProfile(false); setShowProfileEdit(true); }}
          onLogout={() => { setShowProfile(false); setShowLogoutConfirm(true); }}
        />
      )}
      {showProfileEdit && (
        <ProfileEditModal onClose={() => setShowProfileEdit(false)} />
      )}
      {showLogoutConfirm && (
        <LogoutConfirmModal
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={() => { setShowLogoutConfirm(false); logout(); }}
        />
      )}
      {showSettings && (
        <SettingsModal devices={devices} onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}
