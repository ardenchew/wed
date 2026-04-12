#!/usr/bin/env bash
# Re-encode the Crater Lake clip for HTML5 <video>.
#
# The current asset uses Apple ProRes (fourcc apcn) inside a QuickTime-style MP4.
# That codec is not supported in Chrome, Firefox, or Edge — only H.264/AAC (or VP9/WebM)
# is broadly supported for web video.
#
# Prerequisites: ffmpeg with libx264 (e.g. brew install ffmpeg)
#
# Typical workflow (keeps the same public URL: /wed/crater_lake_vid.mp4):
#   mv public/crater_lake_vid.mp4 public/crater_lake_vid_prores.mov
#   ./scripts/transcode-crater-lake-for-web.sh public/crater_lake_vid_prores.mov public/crater_lake_vid.mp4
#
set -euo pipefail
IN="${1:-public/crater_lake_vid_prores.mov}"
OUT="${2:-public/crater_lake_vid.mp4}"

ffmpeg -y -i "$IN" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p \
  -movflags +faststart \
  -an \
  "$OUT"

echo "Wrote web-safe H.264 MP4: $OUT"
