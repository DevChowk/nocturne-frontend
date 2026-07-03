import { useEffect, useRef, useState, useCallback } from 'react';

// Acquires camera + mic and owns the local stream for the entire session.
// Reacts to videoDeviceId / audioDeviceId changes by stopping the current
// stream and re-acquiring with the new constraints. Toggles flip
// track.enabled in place so they survive across matches; a ref mirrors the
// toggle state so we re-apply it to fresh tracks after a device change.
export function useLocalMedia({ videoDeviceId = null, audioDeviceId = null } = {}) {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [devices, setDevices] = useState({ video: [], audio: [] });
  // Bumped whenever we need to re-acquire the stream for reasons unrelated
  // to a device change — e.g. the page came back to the foreground after
  // being backgrounded and we stopped the tracks to release the hardware.
  const [acquireToken, setAcquireToken] = useState(0);
  const streamRef = useRef(null);
  const stateRef = useRef({ mic: true, camera: true });
  // Subscribers notified when the video track slot changes (stop, or
  // re-acquire after a toggle). useWebRTC subscribes so it can call
  // sender.replaceTrack(newTrack) on the active peer connection without
  // renegotiating. Payload: the fresh MediaStreamTrack, or null when the
  // camera was just switched off.
  const videoTrackListenersRef = useRef(new Set());
  const notifyVideoTrackChange = useCallback((track) => {
    videoTrackListenersRef.current.forEach((cb) => {
      try { cb(track); } catch (err) { console.error('[useLocalMedia] video track listener threw:', err); }
    });
  }, []);
  const subscribeVideoTrack = useCallback((cb) => {
    videoTrackListenersRef.current.add(cb);
    return () => { videoTrackListenersRef.current.delete(cb); };
  }, []);
  // Race guard for toggleCamera. Each call bumps this; async re-acquire
  // paths check they still own the latest version before mutating state
  // or the stream, so a rapid off→on→off doesn't leave a stale track
  // slotted in.
  const cameraToggleVersionRef = useRef(0);

  // Keep stateRef in sync with state so the acquire effect can read latest
  // values without taking them as deps (which would re-acquire on every toggle).
  useEffect(() => { stateRef.current.mic = micEnabled; }, [micEnabled]);
  useEffect(() => { stateRef.current.camera = cameraEnabled; }, [cameraEnabled]);

  // Acquire / re-acquire stream when device IDs change.
  useEffect(() => {
    let cancelled = false;
    // Don't re-acquire while a mobile page is in the background. The
    // visibility listener will bump acquireToken when we come back,
    // triggering this effect to re-run and request a fresh stream.
    // Desktop is unaffected — hidden tabs there keep the call alive.
    if (
      typeof document !== 'undefined'
      && document.visibilityState === 'hidden'
      && typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 767px)').matches
    ) {
      return;
    }
    // navigator.mediaDevices is only exposed in a secure context (HTTPS or
    // localhost). On plain http://lan-ip access, it's undefined — surface
    // a friendly error instead of crashing the render tree.
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(new Error('Camera requires HTTPS. Open the app over https:// or via localhost.'));
      return;
    }
    // 720p @ 30fps is the sweet spot: hardware-accelerated on every modern
    // device, ~4x more detail than browser-default 480p, no perceptible
    // latency cost. `ideal` (not `exact`) so cheap webcams that max out
    // lower silently fall back instead of failing.
    const constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
        // Prefer the front-facing camera on phones. `ideal` (not `exact`)
        // so desktops without a facing-mode concept aren't broken by the
        // constraint, and Android devices without a matching camera fall
        // back gracefully instead of throwing OverconstrainedError. Only
        // applied when the user hasn't manually picked a camera — an
        // explicit deviceId always wins.
        ...(videoDeviceId
          ? { deviceId: { exact: videoDeviceId } }
          : { facingMode: { ideal: 'user' } }),
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...(audioDeviceId && { deviceId: { exact: audioDeviceId } }),
      },
    };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        // Stop the previous stream's tracks before swapping in the new one.
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        // Re-apply the user's mic/camera enabled preference to the new tracks.
        s.getAudioTracks().forEach((t) => { t.enabled = stateRef.current.mic; });
        s.getVideoTracks().forEach((t) => { t.enabled = stateRef.current.camera; });
        streamRef.current = s;
        setStream(s);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [videoDeviceId, audioDeviceId, acquireToken]);

  // Stop tracks on unmount.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Release the camera/mic hardware when the page goes to the background
  // on MOBILE only. On phones the OS-level "in use" indicator (iOS orange
  // dot, Android mic icon) stays lit until we actually stop() the tracks,
  // which is a privacy issue the user cares about. On desktop, tab
  // switching / minimising is routine and users expect their call to keep
  // running — so we intentionally do nothing there. Viewport-based
  // detection (matches the same breakpoint used for the mobile chat
  // input) is enough here since the mic/cam indicator concern is
  // phone-specific.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isMobile = () =>
      typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 767px)').matches;
    const stopTracks = () => {
      const s = streamRef.current;
      if (s) {
        s.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setStream(null);
      }
    };
    const onVisibility = () => {
      if (!isMobile()) return;
      if (document.visibilityState === 'hidden') {
        stopTracks();
      } else if (document.visibilityState === 'visible' && !streamRef.current) {
        setAcquireToken((n) => n + 1);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    // pagehide fallback for iOS Safari, which doesn't reliably fire
    // visibilitychange when the user switches apps. Still mobile-only.
    const onPageHide = () => { if (isMobile()) stopTracks(); };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  // Enumerate devices once we have permission (labels are blank until then).
  useEffect(() => {
    if (!stream) return;
    let cancelled = false;
    navigator.mediaDevices
      .enumerateDevices()
      .then((list) => {
        if (cancelled) return;
        setDevices({
          video: list.filter((d) => d.kind === 'videoinput'),
          audio: list.filter((d) => d.kind === 'audioinput'),
        });
      })
      .catch(() => {});
    const onChange = () => {
      navigator.mediaDevices
        .enumerateDevices()
        .then((list) => {
          if (cancelled) return;
          setDevices({
            video: list.filter((d) => d.kind === 'videoinput'),
            audio: list.filter((d) => d.kind === 'audioinput'),
          });
        })
        .catch(() => {});
    };
    navigator.mediaDevices.addEventListener?.('devicechange', onChange);
    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener?.('devicechange', onChange);
    };
  }, [stream]);

  const toggleMic = useCallback(() => {
    setMicEnabled((prev) => {
      const next = !prev;
      streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = next; });
      return next;
    });
  }, []);

  // Camera toggle fully RELEASES the hardware on off and RE-ACQUIRES it on
  // on. Setting `track.enabled = false` (the mic path) transmits blank
  // frames but keeps the OS/browser camera indicator lit — bad trust
  // signal on a random-stranger app. Stopping the track drops the
  // indicator; a paired peer connection stays alive because we call
  // sender.replaceTrack(null/newTrack) via the subscription mechanism
  // above — no renegotiation, no SDP round-trip.
  const toggleCamera = useCallback(async () => {
    const nextEnabled = !stateRef.current.camera;
    const version = ++cameraToggleVersionRef.current;

    // Optimistic UI flip — the button visibly responds even while an async
    // getUserMedia is in flight for the on-path. Reverted below if
    // re-acquire throws (permission revoked, camera busy, hardware gone).
    stateRef.current.camera = nextEnabled;
    setCameraEnabled(nextEnabled);

    if (!nextEnabled) {
      const s = streamRef.current;
      if (s) {
        // stop() releases the hardware; removeTrack keeps the stream
        // reference stable so callers (video element, useWebRTC's
        // localStream dep) don't see a whole-stream swap.
        s.getVideoTracks().forEach((t) => {
          try { t.stop(); } catch { /* already stopped */ }
          s.removeTrack(t);
        });
      }
      notifyVideoTrackChange(null);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(new Error('Camera requires HTTPS. Open the app over https:// or via localhost.'));
      // Revert optimistic flip.
      if (version === cameraToggleVersionRef.current) {
        stateRef.current.camera = false;
        setCameraEnabled(false);
      }
      return;
    }

    // Re-acquire just the video half. Constraints match the initial
    // acquire effect so quality doesn't downgrade after a toggle round-trip.
    const constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
        ...(videoDeviceId
          ? { deviceId: { exact: videoDeviceId } }
          : { facingMode: { ideal: 'user' } }),
      },
    };

    try {
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      // Race guard: the user may have toggled again while we awaited. If a
      // newer toggle superseded this one, discard the freshly-acquired
      // tracks so we don't leak hardware.
      if (version !== cameraToggleVersionRef.current) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      const newTrack = s.getVideoTracks()[0];
      const target = streamRef.current;
      if (!target || !newTrack) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      target.addTrack(newTrack);
      notifyVideoTrackChange(newTrack);
    } catch (err) {
      console.warn('[useLocalMedia] camera re-acquire failed:', err.message);
      if (version === cameraToggleVersionRef.current) {
        stateRef.current.camera = false;
        setCameraEnabled(false);
      }
    }
  }, [videoDeviceId, notifyVideoTrackChange]);

  return { stream, error, devices, micEnabled, cameraEnabled, toggleMic, toggleCamera, subscribeVideoTrack };
}
