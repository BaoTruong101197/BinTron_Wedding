#!/usr/bin/env bash
# Compress a raw phone video (.mov/.mp4/...) into a web-friendly H.264 mp4
# and drop it straight into assets/media/.
#
# Usage:
#   ./scripts/compress-video.sh path/to/video1.mov [video2.mov ...]
#
# Output: assets/media/<same-basename>.mp4
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$REPO_ROOT/assets/media"

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <video1> [video2 ...]" >&2
  exit 1
fi

# Locate ffmpeg: prefer PATH, fall back to the winget install location.
FFMPEG="$(command -v ffmpeg || true)"
if [ -z "$FFMPEG" ]; then
  FFMPEG="$(find "$LOCALAPPDATA/Microsoft/WinGet/Packages" -iname "ffmpeg.exe" 2>/dev/null | head -1)"
fi
if [ -z "$FFMPEG" ]; then
  echo "ffmpeg not found. Install it first, e.g.:" >&2
  echo "  winget install --id Gyan.FFmpeg -e" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

for input in "$@"; do
  if [ ! -f "$input" ]; then
    echo "Skipping (not found): $input" >&2
    continue
  fi

  base="$(basename "$input")"
  name="${base%.*}"
  output="$OUT_DIR/$name.mp4"

  echo "=== Compressing $input -> $output ==="
  "$FFMPEG" -y -i "$input" \
    -vf "scale='if(gt(iw,ih),1280,-2)':'if(gt(iw,ih),-2,1280)'" -r 30 \
    -c:v libx264 -preset medium -crf 26 -pix_fmt yuv420p \
    -c:a aac -b:a 128k -movflags +faststart \
    "$output"

  before=$(du -h "$input" | cut -f1)
  after=$(du -h "$output" | cut -f1)
  echo "  $before -> $after"
  echo ""
done

echo "Done. Update js/config.js to point at the new .mp4 path(s), then git add/commit/push."
