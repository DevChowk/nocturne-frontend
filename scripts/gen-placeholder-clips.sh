#!/usr/bin/env bash
# Generate FALLBACK placeholders for the landing-page clip wall.
#
# NOT what ships today — the wall now uses licensed Pexels footage of real
# people (scripts/fetch-pexels-clips.sh). Keep this script for the case
# where you need face-free tiles: a region with stricter likeness rules, a
# screenshot for a deck, or a build that can't ship third-party footage.
#
# These are NOT footage. Each clip is a synthesised "someone sitting in a
# dark room lit by their screen" — an out-of-focus head-and-shoulders
# silhouette drifting slightly, over the app's own video-panel gradient.
# No faces, so nothing on the landing page implies a real person is
# endorsing the product, and there is no stock licence to honour.
#
# To replace these with real footage, don't edit this script: drop encoded
# files into public/clips/<version>/ and update src/components/landing/clips.js.
#
# Usage:  ./scripts/gen-placeholder-clips.sh
# Needs:  ffmpeg with libx264
set -euo pipefail

cd "$(dirname "$0")/.."
OUT="public/clips/v1"
mkdir -p "$OUT"

W=360; H=640; FPS=24; DUR=6

# Per-clip variation: base gradient stops, silhouette tint, key-light
# position and hue. Without this the wall looks tiled.
# Per-clip variation: base gradient stops, silhouette tint, key-light
# position/hue, and head offset. Without this the wall looks tiled.
#        name  c0        c1        c2        skin      lightX lightY lightCol headY headR
CLIPS=(
  "c01 0x2A2636 0x0D0C12 0x15131E 0x8A7C90 265 175 0xFFD400 225 62"
  "c02 0x242A38 0x0B0E14 0x121822 0x7E8698 95  205 0x3F52FF 235 58"
  "c03 0x2E2738 0x100C14 0x1A1422 0x907E92 270 430 0xFFD400 215 65"
  "c04 0x243038 0x0A1014 0x121E26 0x76909C 115 150 0x9FE8FF 240 60"
  "c05 0x322836 0x120E14 0x1E1622 0x94808C 245 265 0xFF4F4F 220 63"
  "c06 0x263230 0x0C1210 0x141F1C 0x7E9690 100 390 0xFFD400 230 59"
  "c07 0x2C2840 0x0E0C18 0x181428 0x86809E 275 190 0x3F52FF 218 64"
  "c08 0x362C2C 0x140E0E 0x241A1A 0xA08480 120 250 0xFFD400 232 61"
  "c09 0x222A3C 0x0A0E18 0x121828 0x74829C 255 350 0x9FE8FF 226 60"
  # The three "you" clips — framed slightly closer (bigger head, higher),
  # since they stand in for a local self-view held at arm's length.
  "c10 0x28262E 0x0E0C10 0x18161C 0x8C8894 180 120 0xFFD400 205 70"
  "c11 0x24262C 0x0C0E12 0x16181E 0x82868E 200 145 0x3F52FF 210 68"
  "c12 0x2E2A32 0x121014 0x1E1C22 0x968C98 165 130 0xFFD400 200 72"
)

CX=$((W / 2))

for row in "${CLIPS[@]}"; do
  read -r NAME C0 C1 C2 SKIN LX LY LCOL HY HR <<<"$row"
  echo "  → $NAME"

  # Head and torso as two overlapping shapes with a solid core and a soft
  # rim — clip() gives a linear radial ramp, which reads as a body, where a
  # raw gaussian reads as a glowing blob. They MUST overlap vertically or
  # the figure renders as a floating head above a separate mass.
  # Both bob gently on the same phase so the frame reads as live video.
  MASK="255*max(\
clip(1.9-1.9*sqrt(pow((X-${CX})/${HR},2)+pow((Y-(${HY}+6*sin(T*1.1)))/$((HR + 10)),2)),0,1),\
clip(1.75-1.75*sqrt(pow((X-${CX})/172,2)+pow((Y-(545+4*sin(T*1.1)))/270,2)),0,1))"

  ffmpeg -y -v error \
    -f lavfi -i "gradients=s=${W}x${H}:c0=${C0}:c1=${C1}:c2=${C2}:n=3:speed=0.015:d=${DUR}:r=${FPS}" \
    -f lavfi -i "color=c=${SKIN}:s=${W}x${H}:d=${DUR}:r=${FPS}" \
    -f lavfi -i "color=c=${LCOL}:s=${W}x${H}:d=${DUR}:r=${FPS}" \
    -filter_complex "\
[1:v]format=gray,geq=lum='${MASK}'[pm];\
[1:v][pm]alphamerge,boxblur=8:1[person];\
[0:v][person]overlay=format=auto[b1];\
[2:v]format=gray,geq=lum='30*exp(-(pow((X-${LX})/120,2)+pow((Y-${LY})/120,2)))'[km];\
[2:v][km]alphamerge[key];\
[b1][key]overlay=format=auto[b2];\
[b2]noise=alls=5:allf=t+u,eq=contrast=1.12[out]" \
    -map "[out]" \
    -c:v libx264 -profile:v main -level 4.0 -preset slow -crf 30 \
    -pix_fmt yuv420p -g 48 -keyint_min 48 -sc_threshold 0 \
    -an -movflags +faststart \
    "$OUT/$NAME.mp4"

  # Poster = first frame of the ENCODED file, so the poster→video swap is
  # invisible. JPEG rather than WebP: no cwebp needed and the size
  # difference at 180x320 is negligible.
  ffmpeg -y -v error -i "$OUT/$NAME.mp4" -frames:v 1 \
    -vf "scale=180:320" -q:v 4 "$OUT/$NAME.jpg"
done

echo
echo "Wrote $OUT:"
du -ch "$OUT"/*.mp4 | tail -1
du -ch "$OUT"/*.jpg | tail -1
