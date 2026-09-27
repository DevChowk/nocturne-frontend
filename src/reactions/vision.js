// MediaPipe runtime for camera reactions. Browser-only and lazy: nothing here
// downloads until getVision() is first called, which only happens once a user
// has opted in AND is in a connected call.
//
// Two tasks share one wasm runtime:
//  - GestureRecognizer (hand, ~8MB model)  → classifyGesture()
//  - FaceLandmarker with blendshapes (~4MB) → classifyFace()
//
// The wasm (~11MB) comes from the npm package through Vite `?url` imports, so
// it is content-hashed under /assets/ and can never drift from the JS version
// (a mismatched pair fails at init). Only these URL strings sit in the main
// bundle; the package's JS is a separate chunk behind the dynamic import.
import wasmLoaderSimd from '@mediapipe/tasks-vision/vision_wasm_internal.js?url';
import wasmBinarySimd from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url';
import wasmLoaderNoSimd from '@mediapipe/tasks-vision/vision_wasm_nosimd_internal.js?url';
import wasmBinaryNoSimd from '@mediapipe/tasks-vision/vision_wasm_nosimd_internal.wasm?url';
import { GESTURE_ALLOWLIST } from './classify.js';

// Self-hosted by scripts/fetch-mediapipe-models.sh, cached immutably.
const MODEL_BASE = '/models/v1';

// A transient network failure shouldn't disable reactions for the session,
// but a device that can't run the models shouldn't retry every call either.
const MAX_LOAD_FAILURES = 3;

let visionPromise = null;
let failures = 0;

// VIDEO mode throws if a timestamp repeats or goes backwards, and the tasks
// are module-level singletons shared across effect runs (StrictMode mounts
// twice), so each task keeps its own strictly increasing clock.
const monotonicClock = () => {
  let last = 0;
  return () => {
    last = Math.max(performance.now(), last + 1);
    return last;
  };
};

// Inference input. Both models resize internally to 192-256px, so handing
// them a 720p element mostly buys texture upload and resize cost. Measured on
// a 2-core i3 with the CPU delegate: downscaling to a 320px long edge cost
// ~2ms for the copy and saved ~7ms per hand frame and ~16ms per face frame,
// with identical gesture scores on MediaPipe's reference photos.
//
// The canvas keeps the source aspect ratio on purpose — squashing a 16:9
// frame into 4:3 distorts hands and faces, which is exactly what the models
// are measuring.
const TARGET_LONG_EDGE = 320;
// Below this the copy costs about as much as it saves, so pass the element.
const DOWNSCALE_ABOVE = 640;

let frameCanvas = null;
let frameCtx = null;

const inferenceFrame = (video) => {
  const vw = video.videoWidth || 0;
  const vh = video.videoHeight || 0;
  if (!vw || !vh || Math.max(vw, vh) <= DOWNSCALE_ABOVE) return video;
  const scale = TARGET_LONG_EDGE / Math.max(vw, vh);
  const w = Math.max(2, Math.round(vw * scale));
  const h = Math.max(2, Math.round(vh * scale));
  if (!frameCanvas) frameCanvas = document.createElement('canvas');
  if (frameCanvas.width !== w || frameCanvas.height !== h) {
    frameCanvas.width = w;
    frameCanvas.height = h;
    frameCtx = frameCanvas.getContext('2d', { alpha: false, desynchronized: true });
  }
  if (!frameCtx) return video;
  frameCtx.drawImage(video, 0, 0, w, h);
  return frameCanvas;
};

const closeAll = (settled) => {
  for (const r of settled) {
    if (r.status === 'fulfilled') {
      try { r.value.close(); } catch { /* already gone */ }
    }
  }
};

async function createTasks(delegate) {
  const { FilesetResolver, GestureRecognizer, FaceLandmarker } = await import('@mediapipe/tasks-vision');
  const simd = await FilesetResolver.isSimdSupported();
  const fileset = simd
    ? { wasmLoaderPath: wasmLoaderSimd, wasmBinaryPath: wasmBinarySimd }
    : { wasmLoaderPath: wasmLoaderNoSimd, wasmBinaryPath: wasmBinaryNoSimd };

  const settled = await Promise.allSettled([
    GestureRecognizer.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: `${MODEL_BASE}/gesture_recognizer.task`, delegate },
      runningMode: 'VIDEO',
      numHands: 1,
      cannedGesturesClassifierOptions: { categoryAllowlist: GESTURE_ALLOWLIST },
    }),
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: `${MODEL_BASE}/face_landmarker.task`, delegate },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
    }),
  ]);
  const failed = settled.find((r) => r.status === 'rejected');
  if (failed) {
    // Don't leak the half that did load (it holds a WebGL context).
    closeAll(settled);
    throw failed.reason instanceof Error ? failed.reason : new Error(String(failed.reason));
  }
  const [gesture, face] = settled.map((r) => r.value);
  const gestureTs = monotonicClock();
  const faceTs = monotonicClock();

  return {
    delegate,
    // → GestureRecognizerResult.gestures (Category[][])
    hands: (video) => gesture.recognizeForVideo(inferenceFrame(video), gestureTs()).gestures,
    // → the first face's blendshape categories, or null with no face
    face: (video) => face.detectForVideo(inferenceFrame(video), faceTs()).faceBlendshapes?.[0]?.categories ?? null,
  };
}

// When Chrome has no usable GPU it still hands out WebGL, backed by a software
// rasterizer. The GPU delegate "works" there but measured ~14x slower than the
// CPU delegate (hand ~550ms vs ~40ms per frame under SwiftShader), which would
// freeze the call UI. So: real GPU → GPU delegate, anything else → CPU.
const SOFTWARE_GL = /swiftshader|llvmpipe|softpipe|software|basic render/i;

const hasHardwareGL = () => {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return !SOFTWARE_GL.test(renderer);
  } catch {
    return false;
  }
};

async function load() {
  if (!hasHardwareGL()) return createTasks('CPU');
  try {
    return await createTasks('GPU');
  } catch (err) {
    // Blocklisted features, lost context — CPU is slower but works.
    console.warn('[reactions] GPU delegate failed, falling back to CPU:', err.message);
    return createTasks('CPU');
  }
}

// Run one frame through each task so the graphs, shaders and tensor arenas
// are built before they are on the critical path. MediaPipe's first inference
// costs 200ms-4s; without this it lands on the user's first gesture of a call.
export function warmUp(vision, video) {
  if (!vision || !video || video.readyState < 2) return;
  try {
    vision.hands(video);
    vision.face(video);
  } catch (err) {
    console.warn('[reactions] warm-up frame failed:', err.message);
  }
}

export function getVision() {
  if (failures >= MAX_LOAD_FAILURES) {
    return Promise.reject(new Error('camera reactions disabled after repeated load failures'));
  }
  if (!visionPromise) {
    visionPromise = load().catch((err) => {
      visionPromise = null;
      failures += 1;
      throw err;
    });
  }
  return visionPromise;
}
