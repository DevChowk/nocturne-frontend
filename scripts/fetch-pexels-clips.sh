#!/usr/bin/env bash
# Re-fetch and re-encode the landing-page clip wall footage.
#
# The clip IDs below were hand-picked from Pexels search results: real people
# (no AI-generated stock), face readable at ~150px wide, engaged with the
# camera, and a spread of photographers so the wall doesn't look like one
# photoshoot. Pinning the IDs means this script reproduces the exact wall
# that shipped, rather than whatever Pexels ranks highest today.
#
# Usage:
#   PEXELS_API_KEY=xxxx ./scripts/fetch-pexels-clips.sh
#
# The key is read from the environment on purpose — it must never be
# committed. Get a free one at https://www.pexels.com/api/
set -euo pipefail

: "${PEXELS_API_KEY:?Set PEXELS_API_KEY (free key from https://www.pexels.com/api/)}"

cd "$(dirname "$0")/.."
OUT="public/clips/v1"
RAW="$(mktemp -d)"
trap 'rm -rf "$RAW"' EXIT
mkdir -p "$OUT"

UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

# name:pexels_video_id:crop_y
#
# c01-c09 are the "stranger" panels, c10-c12 the "you" panels.
#
# crop_y is the vertical offset of the 360x320 window inside the scaled
# 360x640 source. A tile panel is roughly 9:8, NOT 9:16 — encoding portrait
# and letting object-cover crop zooms in hard and beheads people. Each
# offset is hand-set so the face lands in frame: ~64 for a normal
# head-and-shoulders shot, higher for sources that are already tight
# close-ups (c11 is a face filling the frame, so its window sits lower).
CLIPS="c01:36931662:64 c02:6297759:64 c03:7688648:64 c04:6574006:56 \
c05:7327601:64 c06:8264005:64 c07:7314159:80 c08:7981421:64 \
c09:7957036:64 c10:8628282:48 c11:7957246:104 c12:8496473:80"

for entry in $CLIPS; do
  NAME="${entry%%:*}"; rest="${entry#*:}"; ID="${rest%%:*}"; CROP_Y="${rest##*:}"
  echo "  → $NAME (pexels $ID)"

  # Ask the API for this video's renditions and take the one nearest 960px
  # tall — enough detail to downscale from, without pulling a 4K master.
  URL=$(curl -s -m 30 -H "Authorization: $PEXELS_API_KEY" -A "$UA" \
        "https://api.pexels.com/videos/videos/$ID" \
    | python3 -c "
import json,sys
v=json.load(sys.stdin)
f=[x for x in v['video_files'] if x.get('height') and x['file_type']=='video/mp4']
print(sorted(f, key=lambda x: abs(x['height']-960))[0]['link'])
")

  curl -sL -m 120 -A "$UA" -o "$RAW/$ID.mp4" "$URL"

  # 5s from 1.5s in (skips any slate/settling), cropped to the panel's 9:8
  # window at CROP_Y, 24fps, audio stripped. faststart puts the index first so the
  # first bytes are playable; GOP 48 (2s) keeps `loop` restarting cleanly.
  ffmpeg -y -v error -ss 1.5 -t 5 -i "$RAW/$ID.mp4" \
    -vf "scale=360:640:force_original_aspect_ratio=increase,crop=360:320:0:$CROP_Y,fps=24" \
    -c:v libx264 -profile:v main -level 4.0 -preset slow -crf 27 \
    -pix_fmt yuv420p -g 48 -keyint_min 48 -sc_threshold 0 \
    -an -movflags +faststart "$OUT/$NAME.mp4"

  # Poster = first frame of the ENCODED file, so the poster→video swap is
  # invisible when playback starts.
  ffmpeg -y -v error -i "$OUT/$NAME.mp4" -frames:v 1 \
    -vf "scale=180:160" -q:v 4 "$OUT/$NAME.jpg"
done

echo
echo "Wrote $OUT:"
du -ch "$OUT"/*.mp4 | tail -1
du -ch "$OUT"/*.jpg | tail -1
echo "Remember to refresh $OUT/CREDITS.txt if the clip list changed."
