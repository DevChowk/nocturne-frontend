import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isReactionLabel, isSafeGifUrl } from '../reactions/labels.js';

// In-call camera reactions: sends detected labels, receives the peer's, and
// holds what the overlays should show on each panel.
//
// Mounted in HomePage for the same reason as useGameSession: it is the only
// owner of `socket` (useSocket passes forceNew:true, so a second call would
// open a second connection whose socket.id fails every membership check).
//
// Listening does NOT depend on the user's own opt-in: if the feature is on,
// you see your peer's reactions even if you never turned on your camera's.
//
// Works with or without a `roomId`. Without one the user is on the lobby
// screen with no peer, so reactions are a private preview: the server still
// picks the GIF (clients never choose URLs) but relays it to nobody.

const ACK_TIMEOUT_MS = 3000;
// The server flag is authoritative. With it off, no handler exists and every
// emit times out; after this many in a row, stop offering the feature.
const TIMEOUTS_BEFORE_UNAVAILABLE = 3;
const MAX_PER_SIDE = 2;

// Only ever render what we'd have sent ourselves: https giphy.com URLs.
const sanitizeGif = (gif) => {
  if (!gif || !isSafeGifUrl(gif.url)) return null;
  return {
    url: gif.url,
    stillUrl: isSafeGifUrl(gif.stillUrl) ? gif.stillUrl : null,
    width: Number.isFinite(gif.width) && gif.width > 0 ? gif.width : null,
    height: Number.isFinite(gif.height) && gif.height > 0 ? gif.height : null,
  };
};

export function useReactions({ socket, roomId, enabled }) {
  const [items, setItems] = useState([]);
  const [paused, setPaused] = useState(false);
  const [serverAvailable, setServerAvailable] = useState(true);

  const roomIdRef = useRef(roomId);
  const timeoutsRef = useRef(0);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  // Reset on room identity change, during render (useGameSession's pattern),
  // so a new peer never sees a frame of the previous match's reaction.
  const [lastRoomId, setLastRoomId] = useState(roomId);
  if (roomId !== lastRoomId) {
    setLastRoomId(roomId);
    setItems([]);
  }

  // A new socket may be talking to a server with the flag flipped since.
  const [lastSocket, setLastSocket] = useState(socket);
  if (socket !== lastSocket) {
    setLastSocket(socket);
    setServerAvailable(true);
  }
  useEffect(() => { timeoutsRef.current = 0; }, [socket]);

  const push = useCallback((side, reaction) => {
    setItems((prev) => {
      if (prev.some((p) => p.id === reaction.id)) return prev;
      const mine = prev.filter((p) => p.side === side);
      const kept = mine.length >= MAX_PER_SIDE ? prev.filter((p) => p !== mine[0]) : prev;
      return [...kept, { id: reaction.id, side, label: reaction.label, gif: sanitizeGif(reaction.gif) }];
    });
  }, []);

  const dismiss = useCallback((id) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    if (!socket || !roomId || !enabled) return undefined;
    const onReceived = (d) => {
      // Every payload carries roomId so a late relay from a call we already
      // skipped (the server's end_call awaits a DB write before deleting the
      // room) can't land on the next stranger's screen.
      if (!d || d.roomId !== roomIdRef.current) return;
      if (typeof d.id !== 'string' || !isReactionLabel(d.label)) return;
      push('peer', d);
    };
    socket.on('reaction_received', onReceived);
    return () => socket.off('reaction_received', onReceived);
  }, [socket, roomId, enabled, push]);

  const send = useCallback((label) => {
    const room = roomIdRef.current;
    // socket.io buffers emits while disconnected and flushes them on
    // reconnect under a NEW socket.id — a stale reaction is worse than none.
    if (!socket?.connected || !isReactionLabel(label)) return;
    // No room means the lobby: the server answers with a GIF for this user
    // and relays nothing. In a call it also tells the peer.
    socket.timeout(ACK_TIMEOUT_MS).emit('reaction', room ? { roomId: room, label } : { label }, (err, res) => {
      if (err) {
        timeoutsRef.current += 1;
        if (timeoutsRef.current >= TIMEOUTS_BEFORE_UNAVAILABLE) setServerAvailable(false);
        return;
      }
      timeoutsRef.current = 0;
      // Drop an answer that arrives after the user moved on (lobby → call,
      // call → lobby, or a skip to a new room).
      if (!res?.ok || (res.reaction?.roomId ?? null) !== (roomIdRef.current ?? null)) return;
      push('self', res.reaction);
    });
  }, [socket, push]);

  const togglePaused = useCallback(() => setPaused((p) => !p), []);

  const available = !!socket && !!enabled && serverAvailable;
  const selfItems = useMemo(() => items.filter((i) => i.side === 'self'), [items]);
  const peerItems = useMemo(() => items.filter((i) => i.side === 'peer'), [items]);

  return useMemo(() => ({
    available,
    selfItems,
    peerItems,
    paused,
    togglePaused,
    send,
    dismiss,
  }), [available, selfItems, peerItems, paused, togglePaused, send, dismiss]);
}

export default useReactions;
