import { useState, useEffect } from 'react';
import { countryFlag, countryName } from '../../constants/locale';
import ReportModal from '../../components/ReportModal';
import EmojiPicker from '../../components/EmojiPicker';
import MobileLiveChat from '../../components/MobileLiveChat';
import CallControlsBar from '../../components/CallControlsBar';
import api from '../../api/axios';

const BANNER_AUTO_DISMISS_MS = 20000;

export default function VideoCallView({ user, localVideoRef, remoteVideoRef, messages, chatInput, setChatInput, chatEndRef, sendMessage, skip, endCall, micEnabled, cameraEnabled, toggleMic, toggleCamera, peerMicEnabled, peerCameraEnabled, remoteConnected, roomId, peerUserId, peerUsername, peerDisplayName, peerCountry, peerInterests, mirrorLocal, friendStatus, onFriendStatusChange, chatCollapsed, onChatToggle, unreadChat, isGuest, peerIsGuest }) {
  const [showReport, setShowReport] = useState(false);
  const [friendBusy, setFriendBusy] = useState(false);
  const [chatEmojiOpen, setChatEmojiOpen] = useState(false);
  // Banner is shown when peer requested first AND user hasn't dismissed it
  // for this match. friendStatus resets on new match → banner re-arms.
  const [bannerDismissed, setBannerDismissed] = useState(false);
  useEffect(() => { setBannerDismissed(false); }, [peerUserId]);

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

        {/* Video stage — two equal panels: stacked on mobile, side-by-side
            on desktop. `md:flex-row-reverse` keeps the DOM order (remote
            first) but renders the local panel on the LEFT on desktop, so
            "you" is always on the left and the stranger on the right. */}
        <div className="flex-1 relative flex flex-col md:flex-row-reverse gap-2 md:gap-4 min-w-0 min-h-0">
          {/* Remote (stranger) panel */}
          <div className="relative flex-1 min-w-0 min-h-0 bg-surface-container-low rounded-xl overflow-hidden" style={{ border: '1px solid rgb(var(--color-outline-variant-rgb) / 0.5)' }}>
            <video
              ref={remoteVideoRef}
              className="w-full h-full object-cover"
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
              <div className="absolute bottom-3 right-3 md:bottom-6 md:right-6 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md" style={{ background: 'rgba(255,79,79,0.6)' }}>
                <span className="material-symbols-outlined text-white" aria-hidden="true" style={{ fontSize: 16 }}>mic_off</span>
                <span className="text-white text-xs font-label uppercase tracking-wider">Muted</span>
              </div>
            )}
            {!remoteConnected && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-surface-container-low/90">
                <div className="flex items-center justify-center rounded-full w-14 h-14 md:w-20 md:h-20" style={{ background: 'rgb(var(--color-surface-high-rgb))', boxShadow: '0 0 40px rgba(255,212,0,0.25)' }}>
                  <span className="material-symbols-outlined text-primary animate-pulse text-[28px] md:text-[40px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>cell_tower</span>
                </div>
                <div className="text-center">
                  <h3 className="font-headline font-bold text-on-surface text-lg mb-1">Connecting...</h3>
                  <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest">Establishing secure link</p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowReport(true)}
              aria-label="Report stranger"
              title="Report"
              className="absolute top-4 left-4 z-10 flex items-center justify-center rounded-full backdrop-blur-md transition-colors hover:bg-error/30 active:scale-95"
              style={{ width: 36, height: 36, background: 'rgba(0,0,0,0.5)', color: '#FF4F4F' }}
            >
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>flag</span>
            </button>
            <div className="absolute inset-0 video-gradient-overlay pointer-events-none"></div>
            {/* Brand mark — same top-right placement as the local panel so
                both feeds carry consistent branding. */}
            <div className="absolute top-3 right-3 md:top-6 md:right-6 flex items-center gap-1 opacity-65 pointer-events-none select-none">
              <img src="/favicon.png" alt="" aria-hidden="true" className="w-4 h-4 md:w-5 md:h-5 rounded object-cover" />
              <span className="text-white font-bold tracking-tighter uppercase font-headline text-xs md:text-sm">Bumpp</span>
            </div>
            <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-headline font-bold text-xs md:text-base text-white">{peerLabel}</span>
                {peerCountry && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-label uppercase tracking-wider backdrop-blur-md"
                    title={countryName(peerCountry)}
                    style={{ background: 'rgba(63,82,255,0.18)', color: '#3F52FF' }}
                  >
                    <span aria-hidden="true">{countryFlag(peerCountry)}</span>
                    <span>{peerCountry}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Local (self) panel */}
          <div className="relative flex-1 min-w-0 min-h-0 bg-surface-container-high rounded-xl overflow-hidden" style={{ border: '1px solid rgb(var(--color-outline-variant-rgb) / 0.5)' }}>
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
            <div className="absolute top-3 right-3 md:top-6 md:right-6 flex items-center gap-1 opacity-65 pointer-events-none select-none">
              <img src="/favicon.png" alt="" aria-hidden="true" className="w-4 h-4 md:w-5 md:h-5 rounded object-cover" />
              <span className="text-white font-bold tracking-tighter uppercase font-headline text-xs md:text-sm">Bumpp</span>
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
              placeholder="Type a message..."
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

        {/* Desktop chat sidebar — phones use the MobileLiveChat overlay
            instead. Collapsible via the floating chevron on its left edge;
            same UX as the friends sidebar in the lobby (state owned by
            HomePage so a future header button could drive it too).
            Structure mirrors FriendsSidebar: the outer <aside> is just a
            sized, relatively-positioned container without overflow clipping
            so the floating handle can extend past its left edge; the inner
            <div> is the rounded card that holds (and clips) the actual
            chat content. */}
        <aside
          className={`hidden md:flex relative flex-shrink-0 min-h-0 transition-[width] duration-300 ease-out ${
            chatCollapsed ? 'w-0' : 'w-full md:w-96 lg:w-[420px]'
          }`}
          aria-hidden={chatCollapsed}
        >
          {!chatCollapsed && (
            <div
              className="flex-1 min-h-0 flex flex-col rounded-xl overflow-hidden bg-surface-container-low/60 backdrop-blur-xl"
              style={{ border: '1px solid rgb(var(--color-outline-variant-rgb) / 0.5)' }}
            >
              <div className="p-4 border-b border-outline-variant/40">
                <span className="font-headline font-semibold text-primary">Live Chat</span>
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
                    <span className={`text-[10px] font-bold uppercase tracking-tighter ${block.mine ? 'text-primary-fixed' : 'text-secondary'}`}>
                      {block.mine ? 'You' : peerLabel}
                    </span>
                    {block.messages.map((msg, m) => (
                      <div
                        key={m}
                        className={`p-3 max-w-[90%] text-sm text-on-surface leading-relaxed break-words [overflow-wrap:anywhere] ${
                          block.mine
                            ? 'bg-primary/10 border border-primary/20 rounded-tl-xl rounded-br-xl rounded-bl-xl'
                            : 'bg-surface-container-highest rounded-tr-xl rounded-br-xl rounded-bl-xl'
                        }`}
                      >
                        {msg.message}
                      </div>
                    ))}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 bg-surface-container-high/40">
                <form className="relative flex items-center" onSubmit={sendMessage}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    autoComplete="off"
                    className="w-full bg-surface-container-highest border-none rounded-lg py-3 pl-4 pr-20 md:pr-20 text-sm text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-1 focus:ring-secondary/30 transition-all"
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

      <CallControlsBar
        controls={[
          { type: 'next', onClick: skip },
          { type: 'mic', enabled: micEnabled, onClick: toggleMic },
          { type: 'cam', enabled: cameraEnabled, onClick: toggleCamera },
          // Friend button is hidden when either side is a guest — guests
          // can't have friends, and there's no point letting a registered
          // user "add" a guest whose session is throwaway.
          ...(isGuest || peerIsGuest
            ? []
            : [{ type: 'friend', status: friendStatus, busy: friendBusy, onClick: handleAddFriend }]
          ),
          { type: 'stop', onClick: endCall, title: 'End call' },
          { type: 'chat', active: !chatCollapsed, unread: unreadChat, onClick: onChatToggle },
        ]}
      />

      {/* Ambient glows */}
      <div className="fixed top-1/4 -left-32 w-64 h-64 rounded-full blur-[120px] pointer-events-none" style={{background:'rgba(255,212,0,0.1)'}}></div>
      <div className="fixed bottom-1/4 -right-32 w-96 h-96 rounded-full blur-[150px] pointer-events-none" style={{background:'rgba(63,82,255,0.05)'}}></div>

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
