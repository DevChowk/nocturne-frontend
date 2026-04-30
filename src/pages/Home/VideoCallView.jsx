import { GRADIENT } from '../../constants/theme';

export default function VideoCallView({ user, swapped, setSwapped, localVideoRef, remoteVideoRef, messages, chatInput, setChatInput, chatEndRef, sendMessage, skip, endCall, micEnabled, cameraEnabled, toggleMic, toggleCamera }) {
  const username = user?.email?.split('@')[0] ?? 'You';
  const initial = username[0]?.toUpperCase() ?? '?';
  // When camera is off, overlay avatar on whichever slot is currently showing the local feed
  const showAvatarOnBig = swapped && !cameraEnabled;
  const showAvatarOnPip = !swapped && !cameraEnabled;

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
      <main className="flex-1 flex flex-col md:flex-row p-4 md:p-6 gap-6 relative overflow-hidden">
        {/* Video stage */}
        <div className="flex-1 relative flex flex-col gap-4">
          {/* Remote (stranger) video - full */}
          <div className="relative w-full h-full bg-surface-container-low rounded-xl overflow-hidden group" style={{boxShadow:'0 0 20px rgba(139,92,246,0.3)'}}>
            <video
              ref={swapped ? localVideoRef : remoteVideoRef}
              className="w-full h-full object-cover"
              autoPlay playsInline
              muted={swapped}
            />
            {showAvatarOnBig && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-container-high">
                <div className="flex items-center justify-center rounded-full font-bold font-headline"
                  style={{ width: 120, height: 120, fontSize: 48, background: 'rgba(186,158,255,0.15)', color: '#ba9eff', boxShadow: '0 0 40px rgba(186,158,255,0.15)' }}>
                  {initial}
                </div>
              </div>
            )}
            <div className="absolute inset-0 video-gradient-overlay pointer-events-none"></div>
            <div className="absolute bottom-6 left-6 flex flex-col">
              <span className="font-headline font-bold text-2xl text-white">{swapped ? `${username} (You)` : 'Stranger'}</span>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-sm">location_on</span>
                <span className="text-on-surface-variant text-sm">{swapped ? 'Local Feed' : 'Anonymous'}</span>
              </div>
            </div>
          </div>

          {/* Local (self) video - PIP */}
          <div
            className="absolute bottom-4 right-4 md:bottom-8 md:right-8 w-32 h-44 md:w-48 md:h-64 bg-surface-container-high rounded-xl overflow-hidden border border-white/5 shadow-2xl cursor-pointer"
            style={{boxShadow:'0 0 20px rgba(139,92,246,0.3)'}}
            onClick={() => setSwapped(s => !s)}
          >
            <video
              ref={swapped ? remoteVideoRef : localVideoRef}
              className="w-full h-full object-cover"
              autoPlay playsInline muted={!swapped}
            />
            {showAvatarOnPip && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-container-high">
                <div className="flex items-center justify-center rounded-full font-bold font-headline"
                  style={{ width: 56, height: 56, fontSize: 22, background: 'rgba(186,158,255,0.15)', color: '#ba9eff' }}>
                  {initial}
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest text-white">
              {swapped ? 'Stranger' : 'You'}
            </div>
          </div>
        </div>

        {/* Chat sidebar */}
        <aside className="w-full md:w-80 h-[300px] md:h-full bg-surface-container-low/60 backdrop-blur-xl rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <span className="font-headline font-semibold text-primary">Live Chat</span>
            <span className="material-symbols-outlined text-on-surface-variant text-sm">more_vert</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.length === 0 && (
              <p className="text-on-surface-variant text-sm text-center mt-4 font-label">No messages yet. Say hi!</p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col gap-1 ${msg.mine ? 'items-end' : ''}`}>
                <span className={`text-[10px] font-bold uppercase tracking-tighter ${msg.mine ? 'text-primary-fixed' : 'text-secondary'}`}>
                  {msg.mine ? 'You' : 'Stranger'}
                </span>
                <div className={`p-3 max-w-[90%] text-sm text-on-surface leading-relaxed ${
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
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-center items-center gap-8 md:gap-12 px-4 pb-6 pt-4 bg-surface-container-low/60 backdrop-blur-xl rounded-t-3xl" style={{boxShadow:'0 -8px 30px rgba(139,92,246,0.15)'}}>
        {/* Next */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={skip}
            className="flex flex-col items-center justify-center text-black rounded-full p-6 shadow-lg hover:scale-110 transition-transform duration-200"
            style={{backgroundImage: GRADIENT, boxShadow:'0 4px 20px rgba(186,158,255,0.2)'}}
          >
            <span className="material-symbols-outlined text-3xl">skip_next</span>
          </button>
          <span className="font-label text-[10px] uppercase tracking-widest text-primary font-bold mt-1">Next</span>
        </div>

        {/* Mic toggle */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={toggleMic}
            aria-pressed={!micEnabled}
            className="flex items-center justify-center rounded-full p-4 border transition-all duration-200 active:scale-95"
            style={micEnabled
              ? { background: 'rgba(186,158,255,0.12)', borderColor: 'rgba(186,158,255,0.25)', color: '#ba9eff' }
              : { background: 'rgba(167,1,56,0.2)', borderColor: 'rgba(167,1,56,0.4)', color: '#ff6e84' }}
          >
            <span className="material-symbols-outlined text-2xl">{micEnabled ? 'mic' : 'mic_off'}</span>
          </button>
          <span className="font-label text-[10px] uppercase tracking-widest mt-1" style={{ color: micEnabled ? '#ba9eff' : '#ff6e84' }}>
            {micEnabled ? 'Mic' : 'Muted'}
          </span>
        </div>

        {/* Camera toggle */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={toggleCamera}
            aria-pressed={!cameraEnabled}
            className="flex items-center justify-center rounded-full p-4 border transition-all duration-200 active:scale-95"
            style={cameraEnabled
              ? { background: 'rgba(186,158,255,0.12)', borderColor: 'rgba(186,158,255,0.25)', color: '#ba9eff' }
              : { background: 'rgba(167,1,56,0.2)', borderColor: 'rgba(167,1,56,0.4)', color: '#ff6e84' }}
          >
            <span className="material-symbols-outlined text-2xl">{cameraEnabled ? 'videocam' : 'videocam_off'}</span>
          </button>
          <span className="font-label text-[10px] uppercase tracking-widest mt-1" style={{ color: cameraEnabled ? '#ba9eff' : '#ff6e84' }}>
            {cameraEnabled ? 'Cam' : 'Off'}
          </span>
        </div>

        {/* End/Stop */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={endCall}
            className="flex flex-col items-center justify-center rounded-full p-4 border border-error-container/40 hover:bg-error-container hover:text-on-error transition-all duration-300 active:scale-95"
            style={{background:'rgba(167,1,56,0.2)', color:'#ff6e84'}}
          >
            <span className="material-symbols-outlined text-2xl">stop_circle</span>
          </button>
          <span className="font-label text-[10px] uppercase tracking-widest text-error-dim mt-1">Stop</span>
        </div>
      </nav>

      {/* Ambient glows */}
      <div className="fixed top-1/4 -left-32 w-64 h-64 rounded-full blur-[120px] pointer-events-none" style={{background:'rgba(186,158,255,0.1)'}}></div>
      <div className="fixed bottom-1/4 -right-32 w-96 h-96 rounded-full blur-[150px] pointer-events-none" style={{background:'rgba(0,207,252,0.05)'}}></div>
    </div>
  );
}
