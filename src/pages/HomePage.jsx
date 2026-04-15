import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';

export default function HomePage() {
  const { user, token, logout } = useAuth();
  const { socket, isConnected, error: socketError } = useSocket(token);
  const [status, setStatus] = useState('idle');
  const [matchInfo, setMatchInfo] = useState(null);
  const [swapped, setSwapped] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const { localStream, remoteStream, cleanup: cleanupWebRTC } = useWebRTC(
    socket,
    matchInfo?.roomId,
    matchInfo?.role
  );

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    const onWaiting = () => setStatus('waiting');
    const onMatchFound = (data) => { setStatus('matched'); setMatchInfo({ roomId: data.roomId, role: data.role }); setMessages([]); setSwapped(false); };
    const onLeftQueue = () => { setStatus('idle'); setMatchInfo(null); };
    const onPeerDisconnected = () => { cleanupWebRTC(); setStatus('peer_left'); setMatchInfo(null); setMessages([]); };
    const onCallEnded = () => { cleanupWebRTC(); setStatus('peer_left'); setMatchInfo(null); setMessages([]); };
    const onChatMessage = (data) => setMessages(prev => [...prev, { message: data.message, from: data.from, timestamp: data.timestamp, mine: false }]);

    socket.on('waiting', onWaiting);
    socket.on('match_found', onMatchFound);
    socket.on('left_queue', onLeftQueue);
    socket.on('peer_disconnected', onPeerDisconnected);
    socket.on('call_ended', onCallEnded);
    socket.on('chat_message', onChatMessage);
    return () => {
      socket.off('waiting', onWaiting);
      socket.off('match_found', onMatchFound);
      socket.off('left_queue', onLeftQueue);
      socket.off('peer_disconnected', onPeerDisconnected);
      socket.off('call_ended', onCallEnded);
      socket.off('chat_message', onChatMessage);
    };
  }, [socket, cleanupWebRTC]);

  const findMatch = useCallback(() => { socket?.emit('join_queue'); setStatus('waiting'); }, [socket]);
  const cancel = useCallback(() => { socket?.emit('leave_queue'); }, [socket]);
  const skip = useCallback(() => {
    if (matchInfo?.roomId) socket?.emit('end_call', { roomId: matchInfo.roomId });
    cleanupWebRTC(); setMatchInfo(null); setMessages([]);
    socket?.emit('join_queue'); setStatus('waiting');
  }, [socket, matchInfo, cleanupWebRTC]);
  const endCall = useCallback(() => {
    if (matchInfo?.roomId) socket?.emit('end_call', { roomId: matchInfo.roomId });
    cleanupWebRTC(); setMatchInfo(null); setMessages([]); setStatus('idle');
  }, [socket, matchInfo, cleanupWebRTC]);
  const sendMessage = useCallback((e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !matchInfo?.roomId || !socket) return;
    socket.emit('chat_message', { roomId: matchInfo.roomId, message: text });
    setMessages(prev => [...prev, { message: text, from: user.id, timestamp: new Date().toISOString(), mine: true }]);
    setChatInput('');
  }, [socket, chatInput, matchInfo, user]);

  const isInCall = status === 'matched' && matchInfo;

  if (isInCall) {
    return <VideoCallView
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
    />;
  }

  return <LobbyView
    user={user}
    isConnected={isConnected}
    socketError={socketError}
    status={status}
    findMatch={findMatch}
    cancel={cancel}
    logout={logout}
  />;
}

const GRADIENT = 'linear-gradient(135deg, #ba9eff, #8455ef)';

/* ── Lobby / Searching View ── */
function LobbyView({ user, isConnected, socketError, status, findMatch, cancel, logout }) {
  const username = user?.email?.split('@')[0] ?? 'You';
  const initial = username[0]?.toUpperCase() ?? '?';

  return (
    <div className="bg-background text-on-surface font-body" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* Ambient glows */}
      <div className="pointer-events-none fixed rounded-full blur-3xl" style={{ width: 400, height: 400, top: '15%', left: '-8%', background: 'rgba(186,158,255,0.08)', zIndex: 0 }} />
      <div className="pointer-events-none fixed rounded-full blur-3xl" style={{ width: 350, height: 350, bottom: '10%', right: '-6%', background: 'rgba(0,207,252,0.05)', zIndex: 0 }} />

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-6 py-4 flex-shrink-0" style={{ background: '#0e0e0e' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 26, fontVariationSettings: "'FILL' 1" }}>bedroom_parent</span>
            <span className="text-xl font-bold tracking-tighter text-white uppercase font-headline">Nocturne</span>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: '#131313' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: isConnected ? '#00cffc' : '#ff6e84', boxShadow: isConnected ? '0 0 6px #00cffc' : 'none' }} />
            <span className="text-on-surface-variant font-label uppercase tracking-wider" style={{ fontSize: 11 }}>
              {isConnected ? '2,403 online' : 'Disconnected'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-on-surface-variant text-sm hidden md:block font-label">{user?.email}</span>
          <button onClick={logout} className="text-on-surface-variant hover:text-white transition-colors" title="Logout">
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>logout</span>
          </button>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="relative z-10 flex flex-1 overflow-hidden" style={{ paddingBottom: 80 }}>
        {/* Sidebar */}
        <nav className="hidden md:flex flex-col flex-shrink-0 pt-6 pb-6" style={{ width: 240, background: '#131313' }}>
          {/* User info */}
          <div className="flex items-center gap-3 px-5 mb-8">
            <div className="flex-shrink-0 flex items-center justify-center rounded-xl font-bold font-headline text-lg"
              style={{ width: 42, height: 42, background: 'rgba(186,158,255,0.15)', color: '#ba9eff' }}>
              {initial}
            </div>
            <div>
              <p className="text-white font-bold font-headline text-sm leading-tight">{isConnected ? 'Connected' : 'Offline'}</p>
              <p className="text-on-surface-variant font-label" style={{ fontSize: 11 }}>{username}</p>
            </div>
          </div>

          {/* Nav links */}
          <div className="flex flex-col gap-0.5 px-3">
            {[
              { icon: 'home', label: 'Home', active: true },
              { icon: 'chat_bubble', label: 'Messages', active: false },
              { icon: 'history', label: 'History', active: false },
              { icon: 'group', label: 'Friends', active: false },
            ].map(item => (
              <a key={item.icon}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-label text-sm"
                style={{
                  color: item.active ? '#fff' : '#adaaaa',
                  background: item.active ? '#20201f' : 'transparent',
                  borderRight: item.active ? '2px solid #ba9eff' : '2px solid transparent',
                  fontWeight: item.active ? 700 : 400,
                }}
                href="#">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Main canvas */}
        <main className="flex flex-1 gap-4 p-4 overflow-hidden">
          {/* Local feed panel */}
          <div className="relative flex-1 rounded-xl overflow-hidden" style={{ background: '#131313', border: '1px solid rgba(186,158,255,0.12)' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center justify-center rounded-full font-bold font-headline text-4xl"
                  style={{ width: 96, height: 96, background: 'rgba(186,158,255,0.1)', color: '#ba9eff', boxShadow: '0 0 40px rgba(186,158,255,0.1)' }}>
                  {initial}
                </div>
                <p className="text-on-surface-variant font-label text-xs uppercase tracking-widest">Camera Off</p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
              <h2 className="text-lg font-bold font-headline text-white">{username} (You)</h2>
              <p className="text-on-surface-variant font-label uppercase tracking-widest" style={{ fontSize: 10 }}>
                Local Feed • {isConnected ? 'Active' : 'Offline'}
              </p>
            </div>
          </div>

          {/* Searching / idle / peer_left panel */}
          <div className="relative flex-1 rounded-xl overflow-hidden flex flex-col items-center justify-center" style={{ background: '#131313' }}>
            {status === 'waiting' ? (
              <div className="relative flex items-center justify-center w-full h-full shimmer">
                <div className="absolute w-40 h-40 rounded-full border border-primary/30 pulse-ring" />
                <div className="absolute w-56 h-56 rounded-full border border-primary/20 pulse-ring" style={{ animationDelay: '0.5s' }} />
                <div className="absolute w-72 h-72 rounded-full border border-primary/10 pulse-ring" style={{ animationDelay: '1s' }} />
                <div className="z-10 text-center px-6">
                  <div className="flex items-center justify-center mx-auto mb-5 rounded-full"
                    style={{ width: 80, height: 80, background: '#20201f', boxShadow: '0 0 40px rgba(139,92,246,0.25)' }}>
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 40, fontVariationSettings: "'FILL' 1" }}>radar</span>
                  </div>
                  <h3 className="text-xl font-bold font-headline text-white mb-2">Searching for Stranger...</h3>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-on-surface-variant font-label uppercase tracking-widest" style={{ fontSize: 10 }}>Scanning nodes</span>
                    <span className="flex gap-1">
                      {[0, 0.2, 0.4].map((d, i) => (
                        <span key={i} className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                      ))}
                    </span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                  <h2 className="text-base font-bold font-headline text-on-surface-variant">Incoming Connection...</h2>
                  <p className="text-on-surface-variant font-label uppercase tracking-widest" style={{ fontSize: 10 }}>Secure Nocturne Pulse</p>
                </div>
              </div>
            ) : (
              <div className="z-10 text-center px-8">
                {status === 'peer_left' && <p className="text-error text-sm mb-4 font-label">Your match disconnected.</p>}
                {socketError && <p className="text-error text-sm mb-4 font-label">Socket error: {socketError}</p>}
                <div className="flex items-center justify-center mx-auto mb-5 rounded-full"
                  style={{ width: 80, height: 80, background: '#20201f', boxShadow: '0 0 40px rgba(139,92,246,0.2)' }}>
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 40 }}>people</span>
                </div>
                <h3 className="text-xl font-bold font-headline text-white mb-2">
                  {status === 'peer_left' ? 'Match Ended' : 'Ready to Connect'}
                </h3>
                <p className="text-on-surface-variant font-label mb-6 text-sm">
                  {status === 'peer_left' ? 'Find a new connection below.' : 'Start a random video chat.'}
                </p>
                <button
                  onClick={findMatch}
                  disabled={!isConnected}
                  className="px-8 py-3.5 rounded-full text-black font-bold font-headline transition-all duration-300 active:scale-95 disabled:opacity-50"
                  style={{ backgroundImage: GRADIENT, fontSize: '0.95rem' }}>
                  {status === 'peer_left' ? 'Find New Match' : 'Find Match'}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex justify-around items-center px-4 pb-5 pt-3 rounded-t-3xl"
        style={{ background: 'rgba(19,19,19,0.85)', backdropFilter: 'blur(20px)', boxShadow: '0 -8px 32px rgba(139,92,246,0.12)' }}>
        <button
          onClick={status === 'waiting' ? undefined : findMatch}
          disabled={!isConnected}
          className="flex flex-col items-center gap-1 rounded-full p-3 transition-transform hover:scale-105 disabled:opacity-40"
          style={{ backgroundImage: GRADIENT, color: '#000' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>skip_next</span>
          <span className="font-label uppercase tracking-widest" style={{ fontSize: 9 }}>Next</span>
        </button>
        {[
          { icon: 'mic', label: 'Mic' },
          { icon: 'videocam', label: 'Camera' },
        ].map(item => (
          <button key={item.icon} className="flex flex-col items-center gap-1 p-3 rounded-xl text-on-surface-variant hover:text-white transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{item.icon}</span>
            <span className="font-label uppercase tracking-widest" style={{ fontSize: 9 }}>{item.label}</span>
          </button>
        ))}
        <button
          onClick={status === 'waiting' ? cancel : undefined}
          className="flex flex-col items-center gap-1 p-3 rounded-xl transition-colors"
          style={{ color: status === 'waiting' ? '#ff6e84' : 'rgba(173,170,170,0.3)', cursor: status === 'waiting' ? 'pointer' : 'not-allowed' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>stop_circle</span>
          <span className="font-label uppercase tracking-widest" style={{ fontSize: 9 }}>Stop</span>
        </button>
        <button className="flex flex-col items-center gap-1 p-3 rounded-xl text-on-surface-variant hover:text-white transition-colors">
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>chat</span>
          <span className="font-label uppercase tracking-widest" style={{ fontSize: 9 }}>Chat</span>
        </button>
      </nav>
    </div>
  );
}

/* ── Video Call View ── */
function VideoCallView({ swapped, setSwapped, localVideoRef, remoteVideoRef, messages, chatInput, setChatInput, chatEndRef, sendMessage, skip, endCall }) {
  return (
    <div className="bg-background text-on-background font-body h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-background flex justify-between items-center px-6 py-4 w-full z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl" style={{fontVariationSettings:"'FILL' 1"}}>bedroom_parent</span>
            <span className="text-xl font-bold tracking-tighter text-white uppercase font-headline">Nocturne</span>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span className="text-on-surface-variant font-label text-xs uppercase tracking-wider">2,403 online</span>
          </div>
        </div>
        <button className="text-on-surface-variant hover:text-white transition-colors duration-300">
          <span className="material-symbols-outlined">settings</span>
        </button>
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
            <div className="absolute inset-0 video-gradient-overlay pointer-events-none"></div>
            <div className="absolute bottom-6 left-6 flex flex-col">
              <span className="font-headline font-bold text-2xl text-white">Stranger</span>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-sm">location_on</span>
                <span className="text-on-surface-variant text-sm">Anonymous</span>
              </div>
            </div>
            <button className="absolute top-4 right-4 bg-black/40 backdrop-blur-md p-2 rounded-lg text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100">
              <span className="material-symbols-outlined text-lg">flag</span>
            </button>
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
            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest text-white">
              You
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
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-4 bg-surface-container-low/60 backdrop-blur-xl rounded-t-3xl" style={{boxShadow:'0 -8px 30px rgba(139,92,246,0.15)'}}>
        {/* Next */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={skip}
            className="flex flex-col items-center justify-center text-black rounded-full p-6 shadow-lg hover:scale-110 transition-transform duration-200"
            style={{backgroundImage:'linear-gradient(135deg, #ba9eff, #8455ef)', boxShadow:'0 4px 20px rgba(186,158,255,0.2)'}}
          >
            <span className="material-symbols-outlined text-3xl">skip_next</span>
          </button>
          <span className="font-label text-[10px] uppercase tracking-widest text-primary font-bold mt-1">Next</span>
        </div>

        {/* Mic / Camera / Chat cluster */}
        <div className="flex items-center gap-4 md:gap-8 bg-surface-container-high/80 px-8 py-3 rounded-full border border-white/5">
          <button className="flex flex-col items-center justify-center text-on-surface-variant hover:text-white transition-all duration-300">
            <span className="material-symbols-outlined text-2xl">mic</span>
            <span className="font-label text-[8px] uppercase tracking-tighter mt-1">Mic</span>
          </button>
          <button className="flex flex-col items-center justify-center text-on-surface-variant hover:text-white transition-all duration-300">
            <span className="material-symbols-outlined text-2xl">videocam</span>
            <span className="font-label text-[8px] uppercase tracking-tighter mt-1">Cam</span>
          </button>
          <button className="flex flex-col items-center justify-center text-primary transition-all duration-300">
            <span className="material-symbols-outlined text-2xl">chat</span>
            <span className="font-label text-[8px] uppercase tracking-tighter mt-1">Chat</span>
          </button>
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
