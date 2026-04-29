import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useWebRTC } from '../../hooks/useWebRTC';
import LobbyView from './LobbyView';
import VideoCallView from './VideoCallView';

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
