#!/bin/bash
# Baja un video de YouTube a la carpeta descargas/ (fuera de git), en MP4 con
# video H.264 y audio AAC, que es lo que abren todos los editores.
# Uso: bash scripts/descargar-video.sh "https://youtu.be/XXXXXXXXXXX"
set -euo pipefail
ENLACE="${1:-}"
if [ -z "$ENLACE" ]; then
  echo "Falta el enlace. Uso: bash scripts/descargar-video.sh \"https://youtu.be/XXXXXXXXXXX\"" >&2
  exit 1
fi
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
DESTINO="$RAIZ/descargas"
mkdir -p "$DESTINO"
command -v yt-dlp >/dev/null || { echo "Falta yt-dlp. Se instala con: brew install yt-dlp" >&2; exit 1; }
yt-dlp --no-playlist --no-progress \
  -S "vcodec:h264,res:1080,acodec:m4a" \
  --merge-output-format mp4 \
  -o "$DESTINO/%(title).80s [%(id)s].%(ext)s" \
  --print after_move:filepath \
  "$ENLACE"
