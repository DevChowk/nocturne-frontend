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
  const streamRef = useRef(null);
  const stateRef = useRef({ mic: true, camera: true });

  // Keep stateRef in sync with state so the acquire effect can read latest
  // values without taking them as deps (which would re-acquire on every toggle).
  useEffect(() => { stateRef.current.mic = micEnabled; }, [micEnabled]);
  useEffect(() => { stateRef.current.camera = cameraEnabled; }, [cameraEnabled]);

  // Acquire / re-acquire stream when device IDs change.
  useEffect(() => {
    let cancelled = false;
    const constraints = {
      video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
      audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
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
  }, [videoDeviceId, audioDeviceId]);

  // Stop tracks on unmount.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
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

  const toggleCamera = useCallback(() => {
    setCameraEnabled((prev) => {
      const next = !prev;
      streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = next; });
      return next;
    });
  }, []);

  return { stream, error, devices, micEnabled, cameraEnabled, toggleMic, toggleCamera };
}
