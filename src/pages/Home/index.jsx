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
import GuestLimitModal from '../../components/GuestLimitModal';
import LogoutConfirmModal from '../../components/LogoutConfirmModal';
import SettingsModal from '../../components/SettingsModal';
import LobbyView from './LobbyView';
import VideoCallView from './VideoCallView';

// Inbound NSFW moderation toggle. OFF by default — the scanner is a heavy
// dependency (tfjs + nsfwjs model) and the auto-end + auto-report flow has
// caused unwanted call drops. Set VITE_NSFW_SCAN_ENABLED=true to re-enable
// the runtime check + auto-end-call behavior unchanged.
const NSFW_SCAN_ENABLED = import.meta.env.VITE_NSFW_SCAN_ENABLED === 'true';

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
  const { user, token, logout, needsOnboarding, isGuest } = useAuth();
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
  // Set when the server tells a guest they've hit their match cap. Drives
  // the "Sign up to keep chatting" modal that replaces the lobby CTA.
  const [guestLimitInfo, setGuestLimitInfo] = useState(null);
  // Guests have no friends — passing a null socket disables the hook so
  // it doesn't try to hit /api/friends (which 403s for guests).
  const { friends, loading: friendsLoading } = useFriends(isGuest ? null : socket);
  const navigate = useNavigate();
  // Sidebar collapse state — owned here so both the sidebar's chevron AND
  // the header's friends button can toggle it. Persisted across sessions.
  const [friendsCollapsed, setFriendsCollapsed] = useState(() => {
    try { return localStorage.getItem('bump.friendsSidebarCollapsed') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('bump.friendsSidebarCollapsed', friendsCollapsed ? '1' : '0'); } catch { /* private mode */ }
  }, [friendsCollapsed]);
  const toggleFriendsCollapsed = useCallback(() => setFriendsCollapsed((c) => !c), []);
  // Header's friends button does different things by viewport: on desktop
  // it toggles the inline sidebar; on mobile (where the sidebar doesn't
  // render at all) it jumps to the full /friends page instead. Checked at
  // click time so it stays correct across orientation changes.
  const handleFriendsHeaderClick = useCallback(() => {
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
    if (isDesktop) setFriendsCollapsed((c) => !c);
    else navigate('/friends');
  }, [navigate]);

  // In-call chat panel collapse state.
  // - Mobile: always starts collapsed (input hidden). Toggles are session-
  //   only — we deliberately don't persist mobile state so a previous "open"
  //   doesn't reappear on the next call/visit, and so it can't leak into
  //   the desktop preference.
  // - Desktop: reads/writes localStorage as before so the side panel
  //   remembers its open/closed preference across sessions.
  const isMobileViewport = () =>
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 767px)').matches;

  const [chatCollapsed, setChatCollapsed] = useState(() => {
    if (isMobileViewport()) return true;
    try { return localStorage.getItem('bump.chatCollapsed') === '1'; } catch { return false; }
  });
  // Unread badge on the chat-toggle button. Bumps on incoming peer
  // messages while chat is collapsed; clears as soon as the user opens
  // chat back up, and resets whenever the active match changes so a
  // stale badge from a previous peer doesn't leak into a new call.
  const [unreadChat, setUnreadChat] = useState(0);
  const chatCollapsedRef = useRef(chatCollapsed);
  useEffect(() => {
    chatCollapsedRef.current = chatCollapsed;
    if (!chatCollapsed) setUnreadChat(0);
  }, [chatCollapsed]);
  useEffect(() => { setUnreadChat(0); }, [matchInfo?.roomId]);
  useEffect(() => {
    if (isMobileViewport()) return;
    try { localStorage.setItem('bump.chatCollapsed', chatCollapsed ? '1' : '0'); } catch { /* private mode */ }
  }, [chatCollapsed]);
  const toggleChatCollapsed = useCallback(() => setChatCollapsed((c) => !c), []);
  // Lifted from LobbyView so FriendsSidebar (always rendered) can also
  // trigger the profile menu, regardless of whether we're in the lobby
  // or in a call.
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const isInCall = status === 'matched' && matchInfo;

  const {
    stream: localStream,
    error: mediaError,
    devices,
    micEnabled,
    cameraEnabled,
    toggleMic,
    toggleCamera,
    subscribeVideoTrack,
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
    subscribeVideoTrack,
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
  // Same trick for the last-end-reason — auto-rejoin checks this synchronously
  // when a peer-end event fires.
  const lastEndReasonRef = useRef(null);
  useEffect(() => { lastEndReasonRef.current = lastEndReason; }, [lastEndReason]);

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
    document.title = '✨ Match found! — Bumpp';
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
        peerIsGuest: !!data.peerIsGuest,
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
    // When the OTHER side ends/drops the call, automatically rejoin the
    // queue — the user doesn't have to tap "find a new match". Skipped if
    // an NSFW auto-end set lastEndReason; that path wants to surface its
    // message in the lobby instead of silently re-queueing.
    const autoRejoinAfterPeerEnd = () => {
      setMatchInfo(null);
      setMessages([]);
      if (lastEndReasonRef.current === 'nsfw') {
        setStatus('peer_left');
        return;
      }
      socket.emit('join_queue');
      setStatus('waiting');
    };
    const onPeerDisconnected = (data) => {
      if (isStaleRoomEvent(data)) return;
      autoRejoinAfterPeerEnd();
    };
    const onCallEnded = (data) => {
      if (isStaleRoomEvent(data)) return;
      autoRejoinAfterPeerEnd();
    };
    const onChatMessage = (data) => {
      setMessages(prev => [...prev, { message: data.message, from: data.from, timestamp: data.timestamp, mine: false }]);
      // Bump the unread badge on the chat button when chat is collapsed
      // (read via ref so this handler doesn't have to be rebuilt every
      // time chatCollapsed flips — closures get the stale value).
      if (chatCollapsedRef.current) setUnreadChat((n) => n + 1);
    };
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

    // Guest-only: server rejects the join_queue with this when the per-
    // session or per-day cap is exhausted. Bounce out of waiting and let
    // the lobby render the signup prompt instead.
    const onGuestLimitReached = (data) => {
      setStatus('idle');
      setGuestLimitInfo({
        message: data?.message || 'Sign up to keep chatting.',
        sessionMax: data?.sessionMax,
        dailyMax: data?.dailyMax,
      });
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
    socket.on('guest_limit_reached', onGuestLimitReached);
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
      socket.off('guest_limit_reached', onGuestLimitReached);
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

  // MOBILE ONLY: backgrounding the app (app switcher, screen lock) releases
  // camera/mic in useLocalMedia; without ending the call the peer would
  // stare at a frozen frame. End the call cleanly so the server re-queues
  // them. Desktop is intentionally excluded — tab-switching or minimising
  // is routine there and users expect the call to keep running.
  const callStateRef = useRef({ matchInfo: null, status: 'idle' });
  useEffect(() => { callStateRef.current = { matchInfo, status }; }, [matchInfo, status]);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isMobile = () =>
      typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 767px)').matches;
    const onHidden = () => {
      if (document.visibilityState !== 'hidden') return;
      if (!isMobile()) return;
      const { matchInfo: m, status: s } = callStateRef.current;
      if (m?.roomId) {
        socket?.emit('end_call', { roomId: m.roomId });
        setMatchInfo(null);
        setMessages([]);
        setStatus('idle');
      } else if (s === 'waiting') {
        socket?.emit('leave_queue');
        setStatus('idle');
      }
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, [socket]);
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
    enabled: NSFW_SCAN_ENABLED && isInCall && !!remoteConnected,
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
      chatCollapsed={chatCollapsed}
      onChatToggle={toggleChatCollapsed}
      unreadChat={unreadChat}
      isGuest={isGuest}
      peerIsGuest={matchInfo?.peerIsGuest}
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
            'radial-gradient(circle at 12% 22%, rgba(255,212,0,0.18) 0%, transparent 45%),' +
            'radial-gradient(circle at 88% 78%, rgba(63,82,255,0.14) 0%, transparent 45%),' +
            'rgb(var(--color-bg-rgb))',
        }}
      >
        <AppHeader
          user={user}
          isConnected={isConnected}
          isGuest={isGuest}
          onlineCount={onlineCount}
          onProfileClick={() => setShowProfile(true)}
          onFriendsToggle={!isGuest && !isInCall ? handleFriendsHeaderClick : null}
          friendsCollapsed={friendsCollapsed}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {!isGuest && !isInCall && (
            <FriendsSidebar
              friends={friends}
              loading={friendsLoading}
              collapsed={friendsCollapsed}
            />
          )}
          {mainView}
        </div>
      </div>
      {showProfile && (
        <ProfileModal
          user={user}
          isGuest={isGuest}
          onClose={() => setShowProfile(false)}
          onSettings={() => { setShowProfile(false); setShowSettings(true); }}
          onEditProfile={() => { setShowProfile(false); setShowProfileEdit(true); }}
          onLogout={() => { setShowProfile(false); setShowLogoutConfirm(true); }}
        />
      )}
      {showProfileEdit && (
        <ProfileEditModal onClose={() => setShowProfileEdit(false)} />
      )}
      {guestLimitInfo && (
        <GuestLimitModal
          info={guestLimitInfo}
          onClose={() => setGuestLimitInfo(null)}
        />
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
