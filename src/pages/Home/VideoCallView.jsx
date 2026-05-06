import { useState } from 'react';
import { GRADIENT } from '../../constants/theme';
import ReportModal from '../../components/ReportModal';
import api from '../../api/axios';

export default function VideoCallView({ user, swapped, setSwapped, localVideoRef, remoteVideoRef, messages, chatInput, setChatInput, chatEndRef, sendMessage, skip, endCall, micEnabled, cameraEnabled, toggleMic, toggleCamera, peerMicEnabled, peerCameraEnabled, remoteConnected, roomId, peerUserId, peerUsername, peerDisplayName, mirrorLocal, friendStatus, onFriendStatusChange }) {
  const [showReport, setShowReport] = useState(false);
  const [friendBusy, setFriendBusy] = useState(false);

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
  const username = user?.username || user?.email?.split('@')[0] || 'You';
  const initial = username[0]?.toUpperCase() ?? '?';
  // Peer label: prefer displayName, then @username, then 'Stranger' fallback.
  const peerLabel = peerDisplayName || (peerUsername ? `@${peerUsername}` : 'Stranger');
  // BIG slot shows local when swapped, remote otherwise. PIP is the inverse.
  // Avatar overlays follow the LOCAL camera-off state on whichever slot shows it.
  const showLocalAvatarOnBig = swapped && !cameraEnabled;
  const showLocalAvatarOnPip = !swapped && !cameraEnabled;
  // Peer (camera-off + mic-off) indicators follow the REMOTE feed.
  const showPeerCamOffOnBig = !swapped && !peerCameraEnabled && remoteConnected;
  const showPeerCamOffOnPip = swapped && !peerCameraEnabled && remoteConnected;
  const showPeerMicOffOnBig = !swapped && !peerMicEnabled && remoteConnected;
  const showPeerMicOffOnPip = swapped && !peerMicEnabled && remoteConnected;
  // Connecting overlay shows on whichever slot is currently displaying the REMOTE feed,
  // until the first remote track arrives.
  const showConnectingOnBig = !swapped && !remoteConnected;
  const showConnectingOnPip = swapped && !remoteConnected;

  return (
    <div className="bg-background text-on-background font-body h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-background flex items-center px-6 py-4 w-full z-40">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-2xl" style={{fontVariationSettings:"'FILL' 1"}}>bedroom_parent</span>
          <span className="text-xl font-bold tracking-tighter text-white uppercase font-headline">Nocturne</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col md:flex-row p-4 md:p-6 gap-6 relative overflow-hidden pb-24 md:pb-28">
        {/* Video stage */}
        <div className="flex-1 relative flex flex-col gap-4 min-w-0">
          {/* Remote (stranger) video - full */}
          <div className="relative w-full h-full bg-surface-container-low rounded-xl overflow-hidden group" style={{boxShadow:'0 0 20px rgba(139,92,246,0.3)'}}>
            <video
              ref={swapped ? localVideoRef : remoteVideoRef}
              className="w-full h-full object-cover"
              style={swapped && mirrorLocal ? { transform: 'scaleX(-1)' } : undefined}
              autoPlay playsInline
              muted={swapped}
            />
            {showLocalAvatarOnBig && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-container-high">
                <div className="flex items-center justify-center rounded-full font-bold font-headline"
                  style={{ width: 120, height: 120, fontSize: 48, background: 'rgba(186,158,255,0.15)', color: '#ba9eff', boxShadow: '0 0 40px rgba(186,158,255,0.15)' }}>
                  {initial}
                </div>
              </div>
            )}
            {showPeerCamOffOnBig && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-container-high px-6 text-center">
                <div className="flex items-center justify-center rounded-full" style={{ background: 'rgba(255,110,132,0.15)', color: '#ff6e84' }}>
                  <span className="material-symbols-outlined p-5 md:p-6" aria-hidden="true" style={{ fontSize: 36 }}>videocam_off</span>
                </div>
                <p className="font-headline font-semibold text-white text-sm md:text-base">{peerLabel} turned off camera</p>
              </div>
            )}
            {showPeerMicOffOnBig && (
              <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md" style={{ background: 'rgba(167,1,56,0.6)' }}>
                <span className="material-symbols-outlined text-white" aria-hidden="true" style={{ fontSize: 16 }}>mic_off</span>
                <span className="text-white text-xs font-label uppercase tracking-wider">Muted</span>
              </div>
            )}
            {showConnectingOnBig && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-surface-container-low/90">
                <div className="flex items-center justify-center rounded-full" style={{ width: 80, height: 80, background: '#20201f', boxShadow: '0 0 40px rgba(139,92,246,0.25)' }}>
                  <span className="material-symbols-outlined text-primary animate-pulse" aria-hidden="true" style={{ fontSize: 40, fontVariationSettings: "'FILL' 1" }}>cell_tower</span>
                </div>
                <div className="text-center">
                  <h3 className="font-headline font-bold text-white text-lg mb-1">Connecting...</h3>
                  <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest">Establishing secure link</p>
                </div>
              </div>
            )}
            {/* Report button — top left of remote slot */}
            {!swapped && (
              <button
                type="button"
                onClick={() => setShowReport(true)}
                aria-label="Report stranger"
                title="Report"
                className="absolute top-4 left-4 z-10 flex items-center justify-center rounded-full backdrop-blur-md transition-colors hover:bg-error/30 active:scale-95"
                style={{ width: 36, height: 36, background: 'rgba(0,0,0,0.5)', color: '#ff6e84' }}
              >
                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>flag</span>
              </button>
            )}
            <div className="absolute inset-0 video-gradient-overlay pointer-events-none"></div>
            <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 flex flex-col">
              <span className="font-headline font-bold text-lg md:text-2xl text-white">{swapped ? `${username} (You)` : peerLabel}</span>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-sm" aria-hidden="true">location_on</span>
                <span className="text-on-surface-variant text-xs md:text-sm">{swapped ? 'Local Feed' : (peerUsername ? `@${peerUsername}` : 'Anonymous')}</span>
              </div>
            </div>
          </div>

          {/* Local (self) video - PIP */}
          <button
            type="button"
            aria-label="Swap video positions"
            title="Click to swap"
            className="absolute bottom-3 right-3 md:bottom-8 md:right-8 w-24 h-32 sm:w-28 sm:h-40 md:w-48 md:h-64 bg-surface-container-high rounded-xl overflow-hidden border border-white/5 shadow-2xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
            style={{boxShadow:'0 0 20px rgba(139,92,246,0.3)'}}
            onClick={() => setSwapped(s => !s)}
          >
            <video
              ref={swapped ? remoteVideoRef : localVideoRef}
              className="w-full h-full object-cover"
              style={!swapped && mirrorLocal ? { transform: 'scaleX(-1)' } : undefined}
              autoPlay playsInline muted={!swapped}
            />
            {showLocalAvatarOnPip && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-container-high">
                <div className="flex items-center justify-center rounded-full font-bold font-headline"
                  style={{ width: 56, height: 56, fontSize: 22, background: 'rgba(186,158,255,0.15)', color: '#ba9eff' }}>
                  {initial}
                </div>
              </div>
            )}
            {showPeerCamOffOnPip && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-container-high">
                <div className="flex items-center justify-center rounded-full" style={{ width: 44, height: 44, background: 'rgba(255,110,132,0.15)', color: '#ff6e84' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>videocam_off</span>
                </div>
              </div>
            )}
            {showPeerMicOffOnPip && (
              <div className="absolute top-2 right-2 z-10 flex items-center justify-center rounded-full backdrop-blur-md" style={{ width: 26, height: 26, background: 'rgba(167,1,56,0.7)' }}>
                <span className="material-symbols-outlined text-white" aria-hidden="true" style={{ fontSize: 14 }}>mic_off</span>
              </div>
            )}
            {showConnectingOnPip && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface-container-low/90">
                <span className="material-symbols-outlined text-primary animate-pulse" aria-hidden="true" style={{ fontSize: 28 }}>cell_tower</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest text-white">
              {swapped ? peerLabel : 'You'}
            </div>
          </button>
        </div>

        {/* Chat sidebar */}
        <aside className="w-full md:w-96 lg:w-[420px] flex-shrink-0 h-[35vh] min-h-[180px] max-h-[320px] md:h-full md:min-h-0 md:max-h-none bg-surface-container-low/60 backdrop-blur-xl rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <span className="font-headline font-semibold text-primary">Live Chat</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.length === 0 && (
              <p className="text-on-surface-variant text-sm text-center mt-4 font-label">No messages yet. Say hi!</p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col gap-1 ${msg.mine ? 'items-end' : ''}`}>
                <span className={`text-[10px] font-bold uppercase tracking-tighter ${msg.mine ? 'text-primary-fixed' : 'text-secondary'}`}>
                  {msg.mine ? 'You' : peerLabel}
                </span>
                <div className={`p-3 max-w-[90%] text-sm text-on-surface leading-relaxed break-words [overflow-wrap:anywhere] ${
                  msg.mine
                    ? 'bg-primary/10 border border-primary/20 rounded-tl-xl rounded-br-xl rounded-bl-xl'
                    : 'bg-surface-container-highest rounded-tr-xl rounded-br-xl rounded-bl-xl'
                }`}>
                  {msg.message}
                </div>
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
                className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-1 focus:ring-secondary/30 transition-all"
              />
              <button type="submit" className="absolute right-2 p-1.5 text-primary hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">send</span>
              </button>
            </form>
          </div>
        </aside>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-center items-center gap-6 md:gap-10 px-4 pb-3 pt-2 bg-surface-container-low/60 backdrop-blur-xl rounded-t-3xl" style={{boxShadow:'0 -8px 30px rgba(139,92,246,0.15)'}}>
        {/* Next */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            onClick={skip}
            className="flex items-center justify-center text-black rounded-full p-3.5 shadow-lg hover:scale-110 transition-transform duration-200"
            style={{backgroundImage: GRADIENT, boxShadow:'0 4px 20px rgba(186,158,255,0.2)'}}
          >
            <span className="material-symbols-outlined text-2xl">skip_next</span>
          </button>
          <span className="font-label text-[9px] uppercase tracking-widest text-primary font-bold">Next</span>
        </div>

        {/* Mic toggle */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            onClick={toggleMic}
            aria-pressed={!micEnabled}
            className="flex items-center justify-center rounded-full p-3 border transition-all duration-200 active:scale-95"
            style={micEnabled
              ? { background: 'rgba(186,158,255,0.12)', borderColor: 'rgba(186,158,255,0.25)', color: '#ba9eff' }
              : { background: 'rgba(167,1,56,0.2)', borderColor: 'rgba(167,1,56,0.4)', color: '#ff6e84' }}
          >
            <span className="material-symbols-outlined text-xl">{micEnabled ? 'mic' : 'mic_off'}</span>
          </button>
          <span className="font-label text-[9px] uppercase tracking-widest" style={{ color: micEnabled ? '#ba9eff' : '#ff6e84' }}>
            {micEnabled ? 'Mic' : 'Muted'}
          </span>
        </div>

        {/* Camera toggle */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            onClick={toggleCamera}
            aria-pressed={!cameraEnabled}
            className="flex items-center justify-center rounded-full p-3 border transition-all duration-200 active:scale-95"
            style={cameraEnabled
              ? { background: 'rgba(186,158,255,0.12)', borderColor: 'rgba(186,158,255,0.25)', color: '#ba9eff' }
              : { background: 'rgba(167,1,56,0.2)', borderColor: 'rgba(167,1,56,0.4)', color: '#ff6e84' }}
          >
            <span className="material-symbols-outlined text-xl">{cameraEnabled ? 'videocam' : 'videocam_off'}</span>
          </button>
          <span className="font-label text-[9px] uppercase tracking-widest" style={{ color: cameraEnabled ? '#ba9eff' : '#ff6e84' }}>
            {cameraEnabled ? 'Cam' : 'Off'}
          </span>
        </div>

        {/* Add Friend */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            onClick={handleAddFriend}
            disabled={friendBusy || friendStatus === 'accepted' || friendStatus === 'sent'}
            aria-label={
              friendStatus === 'accepted' ? 'Friends'
              : friendStatus === 'sent' ? 'Friend request sent'
              : friendStatus === 'received' ? 'Accept friend request'
              : 'Add friend'
            }
            className="flex items-center justify-center rounded-full p-3 border transition-all duration-200 active:scale-95 disabled:cursor-default"
            style={
              friendStatus === 'accepted' ? { background: 'rgba(0,207,252,0.15)', borderColor: 'rgba(0,207,252,0.4)', color: '#00cffc' }
              : friendStatus === 'sent' ? { background: 'rgba(186,158,255,0.18)', borderColor: 'rgba(186,158,255,0.35)', color: '#ba9eff' }
              : friendStatus === 'received' ? { background: 'rgba(255,151,181,0.15)', borderColor: 'rgba(255,151,181,0.35)', color: '#ff97b5' }
              : { background: 'rgba(186,158,255,0.12)', borderColor: 'rgba(186,158,255,0.25)', color: '#ba9eff' }
            }
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              {friendStatus === 'accepted' ? 'check_circle'
               : friendStatus === 'sent' ? 'hourglass_top'
               : friendStatus === 'received' ? 'person_add_alt'
               : 'person_add'}
            </span>
          </button>
          <span className="font-label text-[9px] uppercase tracking-widest" style={{
            color: friendStatus === 'accepted' ? '#00cffc'
                 : friendStatus === 'received' ? '#ff97b5'
                 : '#ba9eff'
          }}>
            {friendStatus === 'accepted' ? 'Friends'
             : friendStatus === 'sent' ? 'Sent'
             : friendStatus === 'received' ? 'Add Back'
             : 'Friend'}
          </span>
        </div>

        {/* End/Stop */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            onClick={endCall}
            className="flex items-center justify-center rounded-full p-3 border border-error-container/40 hover:bg-error-container hover:text-on-error transition-all duration-300 active:scale-95"
            style={{background:'rgba(167,1,56,0.2)', color:'#ff6e84'}}
          >
            <span className="material-symbols-outlined text-xl">stop_circle</span>
          </button>
          <span className="font-label text-[9px] uppercase tracking-widest text-error-dim">Stop</span>
        </div>
      </nav>

      {/* Ambient glows */}
      <div className="fixed top-1/4 -left-32 w-64 h-64 rounded-full blur-[120px] pointer-events-none" style={{background:'rgba(186,158,255,0.1)'}}></div>
      <div className="fixed bottom-1/4 -right-32 w-96 h-96 rounded-full blur-[150px] pointer-events-none" style={{background:'rgba(0,207,252,0.05)'}}></div>

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
