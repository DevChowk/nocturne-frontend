import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// In-call mini-game session.
//
// Mounts in HomePage because that is the only owner of `socket` and
// `matchInfo` — and it MUST be: useSocket passes `forceNew: true`, so calling
// that hook again would open a SECOND connection with a second socket.id,
// which fails every membership check on the server. Rule for the whole
// feature: the socket is threaded down as data, never re-acquired.

export const GAMES_ENABLED = import.meta.env.VITE_GAMES_ENABLED !== 'false';

// Ack error codes the server can return. Only a few are worth surfacing;
// the rest are races the UI recovers from on the next state push.
const USER_FACING_ERRORS = {
  blocked: 'They’d rather not play right now.',
  cooldown: 'Give it a moment before asking again.',
  rate_limited: 'Slow down a moment.',
  unknown_game: 'That game isn’t available.',
};

const EMPTY = {
  phase: 'idle',
  gameId: null,
  sessionId: null,
  mySlot: null,
  state: null,
  turn: null,
  seq: 0,
  result: null,
  incomingInvite: null,
  outgoingInvite: null,
};

export function useGameSession({ socket, roomId, enabled = true }) {
  const [session, setSession] = useState(EMPTY);
  const [panelOpen, setPanelOpen] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);

  // Read inside socket handlers so they don't have to be rebuilt (and
  // re-registered) every time the session changes — the same ref idiom
  // HomePage already uses for matchInfoRef / chatCollapsedRef.
  const roomIdRef = useRef(roomId);
  const sessionRef = useRef(session);
  const panelOpenRef = useRef(panelOpen);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { panelOpenRef.current = panelOpen; }, [panelOpen]);

  // ── reset discipline ────────────────────────────────────────────────────
  // ONE rule: reset on roomId identity change, including roomId going
  // undefined. Every call-ending path (skip, end, peer_disconnected,
  // call_ended, match_lost) already nulls matchInfo upstream, so this covers
  // all of them. Deliberately no listeners of its own — a second source of
  // truth would drift from HomePage's.
  //
  // Done during render rather than in an effect (React's "adjusting state when
  // a prop changes" pattern) so the reset lands BEFORE paint: a new peer can
  // never see a frame of the previous match's game.
  const [lastRoomId, setLastRoomId] = useState(roomId);
  if (roomId !== lastRoomId) {
    setLastRoomId(roomId);
    setSession(EMPTY);
    setPanelOpen(false);
    setUnseen(0);
    setNotice(null);
    setError(null);
    setBlocked(false);
    setPendingMove(null);
  }

  // Transient error auto-clear.
  useEffect(() => {
    if (!error) return undefined;
    const t = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  // ── socket listeners ────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !roomId || !enabled) return undefined;

    // Mirrors HomePage's isStaleRoomEvent: every game payload carries roomId
    // precisely so we can drop events aimed at a room we've already left.
    const isStale = (d) => !d?.roomId || d.roomId !== roomIdRef.current;
    // A late event from a PREVIOUS session in the SAME room is possible
    // (quit → new invite → accept), so session events must match on id too.
    const isStaleSession = (d) => d?.sessionId !== sessionRef.current.sessionId;

    const bumpUnseen = () => { if (!panelOpenRef.current) setUnseen((n) => n + 1); };

    const onInvited = (d) => {
      if (isStale(d)) return;
      setSession((s) => ({ ...s, phase: 'invited', incomingInvite: { inviteId: d.inviteId, gameId: d.gameId, title: d.title } }));
      bumpUnseen();
    };

    const onDeclined = (d) => {
      if (isStale(d)) return;
      setSession((s) => ({ ...s, phase: 'idle', outgoingInvite: null }));
      setBlocked(!!d.blocked);
      setNotice('declined');
    };

    const onSuperseded = (d) => {
      if (isStale(d)) return;
      setSession((s) => (s.outgoingInvite?.inviteId === d.inviteId ? { ...s, phase: 'idle', outgoingInvite: null } : s));
    };

    const onStarted = (d) => {
      if (isStale(d)) return;
      setPendingMove(null);
      setSession({
        ...EMPTY,
        phase: 'playing',
        gameId: d.gameId,
        sessionId: d.sessionId,
        mySlot: d.yourSlot,
        state: d.state,
        turn: d.turn,
        seq: d.seq,
      });
      setPanelOpen(true);
      setUnseen(0);
    };

    const onState = (d) => {
      if (isStale(d) || isStaleSession(d)) return;
      setPendingMove(null);
      setSession((s) => ({ ...s, phase: 'playing', state: d.state, turn: d.turn, seq: d.seq }));
      if (d.turn === d.yourSlot || d.turn === 'both') bumpUnseen();
    };

    const onOver = (d) => {
      if (isStale(d) || isStaleSession(d)) return;
      setPendingMove(null);
      setSession((s) => ({ ...s, phase: 'over', state: d.state, turn: null, seq: d.seq, result: d.result }));
      bumpUnseen();
    };

    const onCancelled = (d) => {
      if (isStale(d)) return;
      setSession((s) => (s.incomingInvite?.inviteId === d.inviteId
        ? { ...s, incomingInvite: null, phase: 'idle' }
        : s));
    };

    const onEnded = (d) => {
      if (isStale(d)) return;
      setPendingMove(null);
      setSession({ ...EMPTY });
      setNotice('peer_quit');
    };

    socket.on('game_invited', onInvited);
    socket.on('game_invite_declined', onDeclined);
    socket.on('game_invite_superseded', onSuperseded);
    socket.on('game_invite_cancelled', onCancelled);
    socket.on('game_started', onStarted);
    socket.on('game_state', onState);
    socket.on('game_over', onOver);
    socket.on('game_ended', onEnded);
    return () => {
      socket.off('game_invited', onInvited);
      socket.off('game_invite_declined', onDeclined);
      socket.off('game_invite_superseded', onSuperseded);
      socket.off('game_invite_cancelled', onCancelled);
      socket.off('game_started', onStarted);
      socket.off('game_state', onState);
      socket.off('game_over', onOver);
      socket.off('game_ended', onEnded);
    };
  }, [socket, roomId, enabled]);

  // ── actions ─────────────────────────────────────────────────────────────
  // Every emit refuses when there's no live room, so a race with skip() can
  // never address a room we've left.
  const emit = useCallback((event, payload, onAck) => {
    if (!socket || !roomIdRef.current) return;
    socket.emit(event, { roomId: roomIdRef.current, ...payload }, (res) => {
      if (res && res.ok === false) setError(USER_FACING_ERRORS[res.error] ? res.error : null);
      onAck?.(res);
    });
  }, [socket]);

  const invite = useCallback((gameId) => {
    setSession((s) => ({ ...s, phase: 'inviting', outgoingInvite: { gameId } }));
    emit('game_invite', { gameId }, (res) => {
      if (!res?.ok) { setSession((s) => ({ ...s, phase: 'idle', outgoingInvite: null })); return; }
      setSession((s) => ({ ...s, outgoingInvite: { gameId, inviteId: res.inviteId } }));
    });
  }, [emit]);

  const respond = useCallback((accept) => {
    const inv = sessionRef.current.incomingInvite;
    if (!inv) return;
    setSession((s) => ({ ...s, incomingInvite: null, phase: accept ? 'starting' : 'idle' }));
    emit('game_invite_response', { inviteId: inv.inviteId, accept }, (res) => {
      // The invite can evaporate between render and tap (peer quit, peer
      // skipped). Don't strand the panel on "Starting…".
      if (!res?.ok) setSession((s) => (s.phase === 'starting' ? { ...s, phase: 'idle' } : s));
    });
  }, [emit]);

  const sendMove = useCallback((move) => {
    const s = sessionRef.current;
    if (s.phase !== 'playing' || !s.sessionId) return;
    // Optimistic: for a turn-based game a move is always legal if it was your
    // turn, so render it immediately and reconcile on the next game_state.
    setPendingMove(move);
    emit('game_move', { sessionId: s.sessionId, seq: s.seq, move }, (res) => {
      if (!res?.ok) setPendingMove(null);
    });
  }, [emit]);

  // Ends a game OR cancels an invite you sent — the server distinguishes the
  // two by whether a sessionId is present.
  const quit = useCallback(() => {
    const s = sessionRef.current;
    emit('game_quit', s.sessionId ? { sessionId: s.sessionId } : {});
    setSession({ ...EMPTY });
  }, [emit]);

  const rematch = useCallback(() => {
    const s = sessionRef.current;
    if (s.phase !== 'over' || !s.sessionId) return;
    emit('game_rematch', { sessionId: s.sessionId });
  }, [emit]);

  const openPanel = useCallback(() => { setPanelOpen(true); setUnseen(0); }, []);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const togglePanel = useCallback(() => setPanelOpen((o) => { if (!o) setUnseen(0); return !o; }), []);

  return useMemo(() => ({
    available: !!socket && !!roomId && enabled,
    ...session,
    blocked,
    notice,
    error: error ? USER_FACING_ERRORS[error] : null,
    pendingMove,
    panelOpen,
    unseen,
    openPanel,
    closePanel,
    togglePanel,
    invite,
    acceptInvite: () => respond(true),
    declineInvite: () => respond(false),
    sendMove,
    quit,
    rematch,
  }), [socket, roomId, enabled, session, blocked, notice, error, pendingMove, panelOpen, unseen,
       openPanel, closePanel, togglePanel, invite, respond, sendMove, quit, rematch]);
}

export default useGameSession;
