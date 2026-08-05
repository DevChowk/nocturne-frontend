import { useState, useEffect } from 'react';
import { countryFlag, countryName } from '../../constants/locale';
import ReportModal from '../../components/ReportModal';
import EmojiPicker from '../../components/EmojiPicker';
import MobileLiveChat from '../../components/MobileLiveChat';
import CallControlsBar from '../../components/CallControlsBar';
import { FRIEND_STYLE, FRIEND_ICON, FRIEND_LABEL } from '../../constants/friendStatus';
import api from '../../api/axios';

const BANNER_AUTO_DISMISS_MS = 20000;

const fmtDuration = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Round action button that lives ON the stranger's video panel. Add-friend
// and report belong here rather than in the control bar because they're
// about *them*, not about the call (Design Book, in-call note 04).
function PanelActionButton({ icon, label, onClick, disabled, style }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex items-center justify-center rounded-full transition-transform active:scale-95 disabled:cursor-default"
      style={{ width: 40, height: 40, ...style }}
    >
      <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20 }}>{icon}</span>
    </button>
  );
}

export default function VideoCallView({ user, localVideoRef, remoteVideoRef, messages, chatInput, setChatInput, chatEndRef, sendMessage, skip, endCall, micEnabled, cameraEnabled, toggleMic, toggleCamera, peerMicEnabled, peerCameraEnabled, remoteConnected, roomId, peerUserId, peerUsername, peerDisplayName, peerCountry, peerInterests, mirrorLocal, friendStatus, onFriendStatusChange, chatCollapsed, onChatToggle, unreadChat, isGuest, peerIsGuest }) {
  const [showReport, setShowReport] = useState(false);
  const [friendBusy, setFriendBusy] = useState(false);
  const [chatEmojiOpen, setChatEmojiOpen] = useState(false);
  // Banner is shown when peer requested first AND user hasn't dismissed it
  // for this match. friendStatus resets on new match → banner re-arms.
  const [bannerDismissed, setBannerDismissed] = useState(false);
  useEffect(() => { setBannerDismissed(false); }, [peerUserId]);

  // LIVE 0:37 — elapsed call time, restarted per room.
  const [callSeconds, setCallSeconds] = useState(0);
  useEffect(() => {
    setCallSeconds(0);
    const startedAt = Date.now();
    const id = setInterval(() => setCallSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [roomId]);

  // Distinguishes S2 Connecting (never had media yet) from S4 Reconnecting
  // (had it, lost it). Same overlay geometry, different copy and urgency —
  // "bad line" is a lie on the first two seconds of a fresh match.
  const [everConnected, setEverConnected] = useState(false);
  useEffect(() => { setEverConnected(false); }, [roomId]);
  useEffect(() => { if (remoteConnected) setEverConnected(true); }, [remoteConnected]);
  const isReconnecting = !remoteConnected && everConnected;

  // Auto-dismiss the banner after a while so it doesn't camp forever during
  // a call. Request stays pending — user can act later from /friends.
  useEffect(() => {
    if (friendStatus !== 'received' || bannerDismissed) return;
    const t = setTimeout(() => setBannerDismissed(true), BANNER_AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [friendStatus, bannerDismissed]);

  const showFriendBanner = friendStatus === 'received' && !bannerDismissed && !!peerUserId;

  const handleAddFriend = async () => {
    if (!peerUserId || friendBusy || friendStatus === 'accepted' || friendStatus === 'sent') return;
    setFriendBusy(true);
    try {
      const { data } = await api.post(`/api/friends/${peerUserId}/request`);
      // 'pending' if peer hasn't tapped yet; 'accepted' if mutual.
      onFriendStatusChange?.(data.status === 'accepted' ? 'accepted' : 'sent');
    } catch {
      // Silent failure — keep the button tappable so user can retry.
    } finally {
      setFriendBusy(false);
    }
  };

  const handleAcceptFriend = async () => {
    if (!peerUserId || friendBusy) return;
    setFriendBusy(true);
    try {
      await api.post(`/api/friends/${peerUserId}/accept`);
      onFriendStatusChange?.('accepted');
    } catch {
      // ignore — request still pending if it fails
    } finally {
      setFriendBusy(false);
    }
  };

  const handleDeclineFriend = async () => {
    if (!peerUserId || friendBusy) return;
    setFriendBusy(true);
    try {
      await api.delete(`/api/friends/${peerUserId}`);
      onFriendStatusChange?.('none');
      // Banner hides automatically because friendStatus is no longer 'received'.
    } catch {
      // ignore
    } finally {
      setFriendBusy(false);
    }
  };

  const peerInitial = (peerDisplayName?.[0] || peerUsername?.[0] || '?').toUpperCase();
  const username = user?.username || user?.email?.split('@')[0] || 'You';
  const initial = username[0]?.toUpperCase() ?? '?';
  // Peer label: prefer displayName, then @username, then 'Stranger' fallback.
  const peerLabel = peerDisplayName || (peerUsername ? `@${peerUsername}` : 'Stranger');

  return (
    <div className="text-on-background font-body flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
      {/* Main */}
      <main className="flex-1 min-h-0 flex flex-col md:flex-row md:items-stretch px-2 md:px-4 gap-2 md:gap-4 relative overflow-hidden">
        {/* Friend-request banner. Compact pill, shown only when peer
            hit Add Friend first. Floats above the video stage; auto-
            dismisses after 20s if user does nothing. */}
        {showFriendBanner && (
          <div
            role="alert"
            className="absolute top-2 md:top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-1.5 py-1 rounded-full backdrop-blur-md border border-on-surface/10 shadow-lg max-w-[92vw]"
            style={{ background: 'rgb(var(--color-surface-low-rgb) / 0.85)' }}
          >
            <div
              className="flex-shrink-0 flex items-center justify-center rounded-full font-bold font-headline bg-primary text-on-primary"
              style={{ width: 26, height: 26, fontSize: 12 }}
              aria-hidden="true"
            >
              {peerInitial}
            </div>
            <span className="text-xs text-on-surface font-semibold truncate max-w-[110px] sm:max-w-[180px]">
              {peerLabel} <span className="font-normal text-on-surface-variant">wants to be friends</span>
            </span>
            <button
              type="button"
              onClick={handleAcceptFriend}
              disabled={friendBusy}
              aria-label="Accept friend request"
              title="Accept"
              className="flex items-center justify-center rounded-full transition-transform active:scale-90 disabled:opacity-50"
              style={{ width: 28, height: 28, background: 'rgba(63,82,255,0.18)', color: '#3F52FF' }}
            >
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>check</span>
            </button>
            <button
              type="button"
              onClick={handleDeclineFriend}
              disabled={friendBusy}
              aria-label="Decline friend request"
              title="Decline"
              className="flex items-center justify-center rounded-full transition-transform active:scale-90 disabled:opacity-50"
              style={{ width: 28, height: 28, background: 'rgba(255,79,79,0.22)', color: '#FF4F4F' }}
            >
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>close</span>
            </button>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss for now"
              title="Dismiss"
              className="flex-shrink-0 flex items-center justify-center text-on-surface-variant/70 hover:text-on-surface-variant ml-0.5"
              style={{ width: 20, height: 20 }}
            >
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 14 }}>close_small</span>
            </button>
          </div>
        )}

        {/* Video stage — two equal 50/50 panels: the stranger above you on
            mobile, to your left on desktop (Design Book in-call note 01).
            Never picture-in-picture. */}
        <div className="flex-1 relative flex flex-col md:flex-row gap-2 md:gap-4 min-w-0 min-h-0">
          {/* Remote (stranger) panel */}
          <div className="video-stage relative flex-1 min-w-0 min-h-0 rounded-xl overflow-hidden" style={{ border: '2px solid rgb(var(--color-rule-rgb))' }}>
            <video
              ref={remoteVideoRef}
              className="w-full h-full object-cover transition-opacity duration-300"
              // S4: the last frame freezes at 40% while the ICE restart runs,
              // so you can still see you were talking to someone.
              style={remoteConnected ? undefined : { opacity: 0.4 }}
              autoPlay playsInline
            />
            {!peerCameraEnabled && remoteConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-container-high px-6 text-center">
                <div className="flex items-center justify-center rounded-full bg-tertiary text-white shadow-lg" style={{ boxShadow: '0 8px 30px rgba(255,79,79,0.35)' }}>
                  <span className="material-symbols-outlined p-5 md:p-6" aria-hidden="true" style={{ fontSize: 36 }}>videocam_off</span>
                </div>
                <p className="font-headline font-semibold text-on-surface text-sm md:text-base">{peerLabel} turned off camera</p>
              </div>
            )}
            {!peerMicEnabled && remoteConnected && (
              <div className="chip-video absolute bottom-3 left-3 md:bottom-6 md:left-6 z-10">
                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 12 }}>mic_off</span>
                <span>Muted</span>
              </div>
            )}

            {/* S2 Connecting / S4 Reconnecting. The overlay never hides the
                frame — it dims it — and the coral hairline drains across the
                5s grace window instead of spinning. No toast on recovery:
                the overlay just lifts and the call continues. */}
            {!remoteConnected && (
              <div
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-6 text-center"
                style={{ background: 'rgba(11,11,16,0.45)' }}
              >
                {isReconnecting && (
                  <div className="absolute top-0 left-0 right-0 overflow-hidden" style={{ height: 3 }}>
                    <div
                      key={roomId}
                      className="hairline-drain w-full h-full"
                      style={{ background: '#FF4F4F' }}
                    />
                  </div>
                )}
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 56, height: 56,
                    background: isReconnecting ? '#FF4F4F' : '#FFD400',
                    color: '#14000A',
                    boxShadow: isReconnecting ? '0 4px 26px rgba(255,79,79,0.35)' : '0 4px 26px rgba(255,212,0,0.35)',
                  }}
                >
                  <span className="material-symbols-outlined animate-pulse text-[28px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {isReconnecting ? 'cell_tower' : 'sensors'}
                  </span>
                </div>
                <h3 className="font-headline text-white text-lg" style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {isReconnecting ? 'Hang on — bad line' : 'Connecting…'}
                </h3>
                {isReconnecting && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={endCall}
                      className="font-headline"
                      style={{
                        background: '#FF4F4F', color: '#14000A', borderRadius: 10,
                        padding: '7px 16px', fontWeight: 800, fontSize: 13,
                      }}
                    >
                      End
                    </button>
                    <button
                      type="button"
                      onClick={skip}
                      className="font-headline"
                      style={{
                        border: '2px solid #F7F4EE', color: '#F7F4EE', borderRadius: 10,
                        padding: '6px 16px', fontWeight: 800, fontSize: 13,
                      }}
                    >
                      Skip
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="absolute inset-0 video-gradient-overlay pointer-events-none"></div>

            {/* Safety + friend actions live on the stranger's panel, not in
                the control bar — they are about them. */}
            <div className="absolute bottom-3 right-3 md:bottom-6 md:right-6 z-10 flex items-center gap-2">
              {!isGuest && !peerIsGuest && peerUserId && (
                <PanelActionButton
                  icon={FRIEND_ICON[friendStatus] || FRIEND_ICON.none}
                  label={FRIEND_LABEL[friendStatus] || FRIEND_LABEL.none}
                  onClick={handleAddFriend}
                  disabled={friendBusy || friendStatus === 'accepted' || friendStatus === 'sent'}
                  style={FRIEND_STYLE[friendStatus] || FRIEND_STYLE.none}
                />
              )}
              <PanelActionButton
                icon="flag"
                label="Report stranger"
                onClick={() => setShowReport(true)}
                style={{ background: '#FF4F4F', color: '#14000A', boxShadow: '0 4px 18px rgba(255,79,79,0.3)' }}
              />
            </div>
            {/* Brand mark — same top-right placement as the local panel so
                both feeds carry consistent branding. */}
            <div className="absolute top-3 right-3 md:top-6 md:right-6 opacity-65 pointer-events-none select-none">
              {/* Video content is always visually dark, so use the dark-mode
                  lockup regardless of app theme. */}
              <img src="/logo-lockup-dark.svg" alt="" aria-hidden="true" className="h-4 md:h-5 w-auto" />
            </div>
            {/* LIVE + identity chips, top-left. Mono, uppercase, data only. */}
            <div className="absolute top-3 left-3 md:top-6 md:left-6 z-10 flex items-center gap-1.5 flex-wrap max-w-[70%]">
              <span className="chip-video tabular-nums">
                <span className="chip-dot" style={{ background: '#3F52FF' }} />
                Live {fmtDuration(callSeconds)}
              </span>
              <span className="chip-video max-w-[160px] overflow-hidden text-ellipsis">{peerLabel}</span>
              {peerCountry && (
                <span className="chip-video" title={countryName(peerCountry)}>
                  <span aria-hidden="true" style={{ letterSpacing: 0 }}>{countryFlag(peerCountry)}</span>
                  <span>{peerCountry}</span>
                </span>
              )}
            </div>
          </div>

          {/* Local (self) panel */}
          <div className="video-stage-alt relative flex-1 min-w-0 min-h-0 rounded-xl overflow-hidden" style={{ border: '2px solid rgb(var(--color-rule-rgb))' }}>
            <video
              ref={localVideoRef}
              className="w-full h-full object-cover"
              style={mirrorLocal ? { transform: 'scaleX(-1)' } : undefined}
              autoPlay playsInline muted
            />
            {!cameraEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-container-high">
                <div className="flex flex-col items-center gap-3 text-center px-6">
                  <div
                    className="flex items-center justify-center rounded-full font-bold font-headline w-24 h-24 text-4xl md:w-[120px] md:h-[120px] md:text-5xl bg-primary text-on-primary"
                    style={{ boxShadow: '0 8px 30px rgba(255,212,0,0.35)' }}
                  >
                    {initial}
                  </div>
                  <p className="hidden md:block text-on-surface-variant font-label text-xs uppercase tracking-widest">Camera Off</p>
                </div>
              </div>
            )}
            <div className="absolute inset-0 video-gradient-overlay pointer-events-none"></div>
            {/* Brand mark — top-right of the local panel. Matches the
                stranger-panel watermark style (40% opacity, non-interactive). */}
            <div className="absolute top-3 right-3 md:top-6 md:right-6 opacity-65 pointer-events-none select-none">
              {/* Video content is always visually dark, so use the dark-mode
                  lockup regardless of app theme. */}
              <img src="/logo-lockup-dark.svg" alt="" aria-hidden="true" className="h-4 md:h-5 w-auto" />
            </div>
            {/* YOU — same chip vocabulary and corner as the stranger panel. */}
            <div className="absolute top-3 left-3 md:top-6 md:left-6 z-10">
              <span className="chip-video">You</span>
            </div>
          </div>

          {/* Phone-only live chat overlay — fading messages on the right
              edge of the video stage. Gated by the same chatCollapsed flag
              as the input bar so the chat button toggles both surfaces
              together; collapsed = no input AND no message overlay. */}
          {!chatCollapsed && <MobileLiveChat messages={messages} peerLabel={peerLabel} />}
        </div>

        {/* Phone-only chat input bar — inline, sits just below the user's
            panel and above the bottom nav. Toggled by the chat button in
            the bottom controls; the live-chat overlay above stays visible
            regardless so incoming messages are never missed. */}
        {!chatCollapsed && (
          <form className="md:hidden flex-shrink-0 relative flex items-center" onSubmit={sendMessage}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="say something…"
              autoComplete="off"
              className="w-full bg-black/40 backdrop-blur-md border border-on-surface/10 rounded-full py-2 pl-4 pr-11 text-sm text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <button
              type="submit"
              aria-label="Send"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center p-1.5 text-primary hover:scale-110 transition-transform"
            >
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 22 }}>send</span>
            </button>
          </form>
        )}

        {/* Desktop chat panel — docked to the right of the stage and ruled
            off with the 2px layout rule, exactly like the friends rail in
            the lobby. Phones get the MobileLiveChat overlay instead. It
            scrolls inside itself; the page never does. */}
        <aside
          className={`hidden md:flex relative flex-shrink-0 min-h-0 transition-[width] duration-300 ease-out ${
            chatCollapsed ? 'w-0' : 'w-full md:w-[240px] lg:w-[280px]'
          }`}
          style={chatCollapsed ? undefined : { borderLeft: '2px solid rgb(var(--color-rule-rgb))' }}
          aria-hidden={chatCollapsed}
        >
          {!chatCollapsed && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="px-4 py-3" style={{ borderBottom: '2px solid rgb(var(--color-rule-rgb))' }}>
                <span
                  className="font-mono uppercase text-on-surface-variant"
                  style={{ fontSize: 11, letterSpacing: '0.16em' }}
                >
                  Chat
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 && (
                  <p className="text-on-surface-variant text-sm text-center mt-4 font-label">No messages yet. Say hi!</p>
                )}
                {messages.reduce((blocks, msg) => {
                  // Collapse consecutive messages from the same sender into one
                  // block so the YOU / @peer label only shows once per run.
                  const last = blocks[blocks.length - 1];
                  if (last && last.mine === msg.mine) last.messages.push(msg);
                  else blocks.push({ mine: msg.mine, messages: [msg] });
                  return blocks;
                }, []).map((block, b) => (
                  <div key={b} className={`flex flex-col gap-1 ${block.mine ? 'items-end' : ''}`}>
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                      {block.mine ? 'You' : peerLabel}
                    </span>
                    {block.messages.map((msg, m) => (
                      <div
                        key={m}
                        className="max-w-[75%] text-[13px] leading-snug [overflow-wrap:anywhere]"
                        style={{
                          padding: '8px 12px',
                          background: block.mine
                            ? 'rgb(var(--color-primary-rgb))'
                            : 'rgb(var(--color-surface-high-rgb))',
                          color: block.mine ? '#14000A' : 'rgb(var(--color-on-surface-rgb))',
                          borderRadius: block.mine ? '11px 11px 3px 11px' : '11px 11px 11px 3px',
                        }}
                      >
                        {msg.message}
                      </div>
                    ))}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3" style={{ borderTop: '2px solid rgb(var(--color-rule-rgb))' }}>
                <form className="relative flex items-center" onSubmit={sendMessage}>
                  {/* Pill, not a boxed field — the composer is chat furniture,
                      not a form input to be filled out. */}
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="say something…"
                    autoComplete="off"
                    className="w-full rounded-full py-2.5 pl-4 pr-20 text-[13px] text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary/40"
                    style={{ background: 'rgb(var(--color-surface-high-rgb))', border: 'none' }}
                  />
                  {/* Emoji picker — desktop only. */}
                  <button
                    type="button"
                    onClick={() => setChatEmojiOpen((o) => !o)}
                    aria-label="Pick emoji"
                    className="hidden md:inline-flex absolute right-10 top-1/2 -translate-y-1/2 items-center justify-center w-8 h-8 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/60 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">mood</span>
                  </button>
                  {chatEmojiOpen && (
                    <EmojiPicker
                      onPick={(emoji) => setChatInput((d) => d + emoji)}
                      onClose={() => setChatEmojiOpen(false)}
                      anchor="top"
                    />
                  )}
                  <button type="submit" aria-label="Send" className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center p-1.5 text-primary hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined" aria-hidden="true">send</span>
                  </button>
                </form>
              </div>
            </div>
          )}

        </aside>
      </main>

      {/* Control bar order per the Design Book: mic, camera, the Skip
          sticker in the middle, end, chat. Add-friend and report are NOT
          here — they sit on the stranger's panel. */}
      <CallControlsBar
        controls={[
          { type: 'mic', enabled: micEnabled, onClick: toggleMic },
          { type: 'cam', enabled: cameraEnabled, onClick: toggleCamera },
          { type: 'skip', onClick: skip },
          { type: 'stop', onClick: endCall, title: 'End call' },
          { type: 'chat', active: !chatCollapsed, unread: unreadChat, onClick: onChatToggle },
        ]}
      />

      {showReport && (
        <ReportModal
          onClose={() => setShowReport(false)}
          reportedUserId={peerUserId}
          roomId={roomId}
          onSubmitted={() => {
            // End the call immediately — user shouldn't have to keep
            // talking to someone they just flagged. The peer just sees a
            // normal "peer disconnected" so they can't tell they were
            // reported (deliberately silent feedback).
            endCall();
          }}
        />
      )}
    </div>
  );
}
