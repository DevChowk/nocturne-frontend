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
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const onWaiting = () => setStatus('waiting');
    const onMatchFound = (data) => {
      setStatus('matched');
      setMatchInfo({ roomId: data.roomId, role: data.role });
      setMessages([]);
      setSwapped(false);
    };
    const onLeftQueue = () => {
      setStatus('idle');
      setMatchInfo(null);
    };
    const onPeerDisconnected = () => {
      cleanupWebRTC();
      setStatus('peer_left');
      setMatchInfo(null);
      setMessages([]);
    };
    const onCallEnded = () => {
      cleanupWebRTC();
      setStatus('peer_left');
      setMatchInfo(null);
      setMessages([]);
    };
    const onChatMessage = (data) => {
      setMessages((prev) => [
        ...prev,
        { message: data.message, from: data.from, timestamp: data.timestamp, mine: false },
      ]);
    };

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

  const findMatch = useCallback(() => {
    socket?.emit('join_queue');
    setStatus('waiting');
  }, [socket]);

  const cancel = useCallback(() => {
    socket?.emit('leave_queue');
  }, [socket]);

  const skip = useCallback(() => {
    if (matchInfo?.roomId) {
      socket?.emit('end_call', { roomId: matchInfo.roomId });
    }
    cleanupWebRTC();
    setMatchInfo(null);
    setMessages([]);
    socket?.emit('join_queue');
    setStatus('waiting');
  }, [socket, matchInfo, cleanupWebRTC]);

  const endCall = useCallback(() => {
    if (matchInfo?.roomId) {
      socket?.emit('end_call', { roomId: matchInfo.roomId });
    }
    cleanupWebRTC();
    setMatchInfo(null);
    setMessages([]);
    setStatus('idle');
  }, [socket, matchInfo, cleanupWebRTC]);

  const sendMessage = useCallback(
    (e) => {
      e.preventDefault();
      const text = chatInput.trim();
      if (!text || !matchInfo?.roomId || !socket) return;
      socket.emit('chat_message', { roomId: matchInfo.roomId, message: text });
      setMessages((prev) => [
        ...prev,
        { message: text, from: user.id, timestamp: new Date().toISOString(), mine: true },
      ]);
      setChatInput('');
    },
    [socket, chatInput, matchInfo, user]
  );

  const isInCall = status === 'matched' && matchInfo;

  return (
    <div className={isInCall ? 'call-container' : 'home-container'}>
      {isInCall ? (
        /* ── Video Call View ── */
        <div className="call-layout">
          {/* Video section */}
          <div className="video-section">
            <div className="video-wrapper">
              <video
                ref={swapped ? localVideoRef : remoteVideoRef}
                className="video-big"
                autoPlay
                playsInline
                muted={swapped}
              />
              <video
                ref={swapped ? remoteVideoRef : localVideoRef}
                className="video-small"
                autoPlay
                playsInline
                muted={!swapped}
                onClick={() => setSwapped((s) => !s)}
              />
            </div>
            <div className="call-controls">
              <button className="control-btn end" onClick={endCall}>
                End
              </button>
              <button className="control-btn skip" onClick={skip}>
                Next
              </button>
            </div>
          </div>

          {/* Chat sidebar */}
          <div className="chat-sidebar">
            <div className="chat-header">Chat</div>
            <div className="chat-messages">
              {messages.length === 0 && (
                <p className="chat-empty">No messages yet</p>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`chat-bubble ${msg.mine ? 'mine' : 'theirs'}`}>
                  {msg.message}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form className="chat-input-row" onSubmit={sendMessage}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                autoComplete="off"
              />
              <button type="submit">Send</button>
            </form>
          </div>
        </div>
      ) : (
        /* ── Lobby View ── */
        <div className="home-card">
          <div className="header">
            <h1>Nocturne</h1>
            <button onClick={logout}>Logout</button>
          </div>

          <p className="user-email">
            Logged in as <strong>{user?.email}</strong>
          </p>

          <div className="status">
            <span className={`dot ${isConnected ? 'green' : 'red'}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>

          {socketError && <p className="error">Socket error: {socketError}</p>}

          {status === 'peer_left' && (
            <p className="error">Peer disconnected</p>
          )}

          {(status === 'idle' || status === 'peer_left') && (
            <button
              className="match-btn"
              onClick={findMatch}
              disabled={!isConnected}
            >
              {status === 'peer_left' ? 'Find New Match' : 'Find Match'}
            </button>
          )}

          {status === 'waiting' && (
            <>
              <p className="waiting-text">Waiting for match...</p>
              <button className="match-btn cancel" onClick={cancel}>
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
