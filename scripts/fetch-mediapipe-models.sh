#!/usr/bin/env bash
# Fetch the two MediaPipe models behind camera reactions into public/models/v1/.
#
# Self-hosted rather than loaded from storage.googleapis.com at runtime so a
# call never depends on a third-party host, and so the exact bytes that
# shipped are pinned by checksum. The wasm runtime is NOT fetched here — it
# comes from the @mediapipe/tasks-vision npm package through Vite `?url`
# imports (see src/reactions/vision.js), so it stays locked to the JS version.
#
# public/ ships UNHASHED and /models/v1/* is cached immutably (public/_headers).
# To change a model, bump the directory to v2 and update MODEL_BASE in
# src/reactions/vision.js — never replace a file in place.
#
# Usage:
#   ./scripts/fetch-mediapipe-models.sh
#
# Models are Apache-2.0, (c) Google LLC. See public/models/v1/CREDITS.txt.
set -euo pipefail

cd "$(dirname "$0")/.."
OUT="public/models/v1"
BASE="https://storage.googleapis.com/mediapipe-models"
mkdir -p "$OUT"

# file:url_path:sha256
MODELS="\
gesture_recognizer.task:gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task:97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482 \
face_landmarker.task:face_landmarker/face_landmarker/float16/1/face_landmarker.task:64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff"

for entry in $MODELS; do
  IFS=: read -r file path sum <<<"$entry"
  tmp="$(mktemp)"
  echo "fetching $file"
  curl -fsSL "$BASE/$path" -o "$tmp"
  got="$(sha256sum "$tmp" | cut -d' ' -f1)"
  if [[ "$got" != "$sum" ]]; then
    rm -f "$tmp"
    echo "checksum mismatch for $file: expected $sum, got $got" >&2
    echo "Google may have republished the model. Verify it, then bump to a new v* dir." >&2
    exit 1
  fi
  mv "$tmp" "$OUT/$file"
  chmod 644 "$OUT/$file"
done

cat > "$OUT/CREDITS.txt" <<'EOF'
gesture_recognizer.task and face_landmarker.task
MediaPipe models by Google LLC, licensed under the Apache License 2.0.
https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer
https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker
EOF

echo "done: $(du -sh "$OUT" | cut -f1) in $OUT"
