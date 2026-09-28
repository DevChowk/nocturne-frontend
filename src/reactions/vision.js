// MediaPipe runtime for camera reactions. Browser-only and lazy: nothing here
// downloads until a detector first asks for it, which only happens once a user
// has opted in.
//
// Runs on the main thread OR inside detector.worker.js, so everything here
// avoids `document` except where explicitly guarded — a worker has no DOM.
//
// Two tasks share one wasm runtime:
//  - GestureRecognizer (hand, ~8MB model)  → classifyGesture()
//  - FaceLandmarker with blendshapes (~4MB) → classifyFace()
//
// The wasm (~11MB) comes from the npm package through Vite `?url` imports, so
// it is content-hashed under /assets/ and can never drift from the JS version
// (a mismatched pair fails at init).
import wasmLoaderSimd from '@mediapipe/tasks-vision/vision_wasm_internal.js?url';
import wasmBinarySimd from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url';
import wasmLoaderNoSimd from '@mediapipe/tasks-vision/vision_wasm_nosimd_internal.js?url';
import wasmBinaryNoSimd from '@mediapipe/tasks-vision/vision_wasm_nosimd_internal.wasm?url';
import { GESTURE_ALLOWLIST } from './classify.js';
import { boundsFromLandmarks, padBounds } from './faceBox.js';

// Faces tracked at once. Each extra face costs another landmark pass, so this
// is a cap on the damage when a group crowds the camera, not a target.
const MAX_FACES = 3;

// Self-hosted by scripts/fetch-mediapipe-models.sh, cached immutably.
const MODEL_BASE = '/models/v1';

// A transient network failure shouldn't disable reactions for the session,
// but a device that can't run the models shouldn't retry every call either.
const MAX_LOAD_FAILURES = 3;

let visionPromise = null;
let failures = 0;

// VIDEO mode throws if a timestamp repeats or goes backwards, and tasks may be
// shared across effect runs (StrictMode mounts twice), so each task keeps its
// own strictly increasing clock.
const monotonicClock = () => {
  let last = 0;
  return () => {
    last = Math.max(performance.now(), last + 1);
    return last;
  };
};

// Inference input. Both models resize internally to 192-256px, so handing
// them a 720p frame mostly buys texture upload and resize cost. Measured on
// a 2-core i3 with the CPU delegate: downscaling to a 320px long edge cost
// ~2ms for the copy and saved ~7ms per hand frame and ~16ms per face frame,
// with identical gesture scores on MediaPipe's reference photos.
//
// The canvas keeps the source aspect ratio on purpose — squashing a 16:9
// frame into 4:3 distorts hands and faces, which is what the models measure.
const TARGET_LONG_EDGE = 320;
// Below this the copy costs about as much as it saves, so pass it through.
const DOWNSCALE_ABOVE = 640;

let frameCanvas = null;
let frameCtx = null;

const makeCanvas = (w, h) => (typeof OffscreenCanvas !== 'undefined'
  ? new OffscreenCanvas(w, h)
  : Object.assign(document.createElement('canvas'), { width: w, height: h }));

// Works for a <video>, a VideoFrame from a worker stream, or an ImageBitmap.
const sizeOf = (src) => ({
  w: src.videoWidth || src.displayWidth || src.width || 0,
  h: src.videoHeight || src.displayHeight || src.height || 0,
});

const inferenceFrame = (src) => {
  const { w: sw, h: sh } = sizeOf(src);
  if (!sw || !sh || Math.max(sw, sh) <= DOWNSCALE_ABOVE) return src;
  const scale = TARGET_LONG_EDGE / Math.max(sw, sh);
  const w = Math.max(2, Math.round(sw * scale));
  const h = Math.max(2, Math.round(sh * scale));
  if (!frameCanvas || frameCanvas.width !== w || frameCanvas.height !== h) {
    frameCanvas = makeCanvas(w, h);
    frameCanvas.width = w;
    frameCanvas.height = h;
    frameCtx = frameCanvas.getContext('2d', { alpha: false, desynchronized: true });
  }
  if (!frameCtx) return src;
  frameCtx.drawImage(src, 0, 0, w, h);
  return frameCanvas;
};

const closeAll = (settled) => {
  for (const r of settled) {
    if (r.status === 'fulfilled') {
      try { r.value.close(); } catch { /* already gone */ }
    }
  }
};

// MediaPipe registers its emscripten factory on the global scope by loading
// the loader script — with a <script> tag on a page, and with importScripts()
// in a worker. A MODULE worker has neither, and MediaPipe then fails with
// "ModuleFactory not set". Vite serves module workers in dev (it ignores
// worker.format there), so do what importScripts would: run the loader in
// global scope via indirect eval.
//
// Production builds get a classic worker, where importScripts exists and this
// never runs. If a Content-Security-Policy is ever added, dev would need
// 'unsafe-eval' in worker-src — production would not.
const ensureWasmLoader = async (loaderUrl) => {
  if (typeof document !== 'undefined') return; // page: MediaPipe's script tag works
  if (self.ModuleFactory) return;              // already registered
  try {
    // Defined in module workers too — it just throws when called there, so
    // testing `typeof importScripts` tells you nothing. Call it and see.
    self.importScripts(loaderUrl);
  } catch {
    const src = await (await fetch(loaderUrl)).text();
    (0, eval)(src);
  }
  if (!self.ModuleFactory) throw new Error('wasm loader did not register ModuleFactory');
};

// Build both tasks on one delegate. Exported so the worker can benchmark
// 'GPU' against 'CPU' instead of guessing from a renderer string.
export async function createVision(delegate) {
  const { FilesetResolver, GestureRecognizer, FaceLandmarker } = await import('@mediapipe/tasks-vision');
  const simd = await FilesetResolver.isSimdSupported();
  const fileset = simd
    ? { wasmLoaderPath: wasmLoaderSimd, wasmBinaryPath: wasmBinarySimd }
    : { wasmLoaderPath: wasmLoaderNoSimd, wasmBinaryPath: wasmBinaryNoSimd };
  await ensureWasmLoader(fileset.wasmLoaderPath);
  if (!createVision.reported) {
    createVision.reported = true;
    console.warn(`[reactions] runtime: simd=${simd} delegate=${delegate} gl=${glRenderer() || 'none'}`);
  }

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
      // Several faces so the framing boxes cover everyone in shot. Expressions
      // still follow the first (most prominent) face — see classify.js.
      numFaces: MAX_FACES,
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
    hands: (src) => gesture.recognizeForVideo(inferenceFrame(src), gestureTs()).gestures,
    // → { categories, boxes }: the FIRST face's blendshapes (expressions), and
    // a normalized framing box for EVERY face in shot.
    face: (src) => {
      const result = face.detectForVideo(inferenceFrame(src), faceTs());
      const boxes = (result.faceLandmarks || [])
        .map((landmarks) => padBounds(boundsFromLandmarks(landmarks)))
        .filter(Boolean);
      return { categories: result.faceBlendshapes?.[0]?.categories ?? null, boxes };
    },
    close: () => {
      try { gesture.close(); } catch { /* already gone */ }
      try { face.close(); } catch { /* already gone */ }
    },
  };
}

// Run one frame through each task so the graphs, shaders and tensor arenas
// are built before they are on the critical path. MediaPipe's first inference
// costs 200ms-4s; without this it lands on the user's first gesture of a call.
export function warmUp(vision, src) {
  if (!vision || !src) return;
  if (src.readyState !== undefined && src.readyState < 2) return;
  try {
    vision.hands(src);
    vision.face(src);
  } catch (err) {
    console.warn('[reactions] warm-up frame failed:', err.message);
  }
}

// When a browser has no usable GPU it still hands out WebGL backed by a
// software rasterizer, where the GPU delegate measured ~14x slower than CPU
// (hand ~550ms vs ~40ms per frame). Works on a page and in a worker.
const SOFTWARE_GL = /swiftshader|llvmpipe|softpipe|software|basic render/i;

export const glRenderer = () => {
  try {
    const canvas = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(1, 1)
      : document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return null;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return renderer;
  } catch {
    return null;
  }
};

export const preferredDelegate = () => {
  const renderer = glRenderer();
  return renderer && !SOFTWARE_GL.test(renderer) ? 'GPU' : 'CPU';
};

const hasHardwareGL = () => preferredDelegate() === 'GPU';

async function load() {
  if (!hasHardwareGL()) return createVision('CPU');
  try {
    return await createVision('GPU');
  } catch (err) {
    console.warn('[reactions] GPU delegate failed, falling back to CPU:', err.message);
    return createVision('CPU');
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
