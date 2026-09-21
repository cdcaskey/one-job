#!/bin/sh
set -e

PUID=${PUID:-1000}
PGID=${PGID:-1000}
CONFIG_DIR=${CONFIG_DIR:-/config}
DATA_DIR=${DATA_DIR:-/data}

mkdir -p "$CONFIG_DIR" "$DATA_DIR"

# Seed default config files into CONFIG_DIR, but only where nothing
# already exists — user overrides on the host always win, and later
# image updates can add new default files without clobbering edits.
# `find`, not a `dir/*` glob: ash doesn't match dotfiles (e.g. `.env`)
# with a bare glob, so a glob here silently misses the exact files
# config-defaults/ actually ships.
if [ -d /app/config-defaults ]; then
  find /app/config-defaults -mindepth 1 -maxdepth 1 | while IFS= read -r f; do
    name=$(basename "$f")
    [ -e "$CONFIG_DIR/$name" ] || cp "$f" "$CONFIG_DIR/$name"
  done
fi

# The PUID/PGID remap requires root; if the container was started as a
# non-root user instead (rootless Docker, Kubernetes runAsNonRoot),
# skip it and run as whatever user we already are.
if [ "$(id -u)" = "0" ]; then
  groupmod -o -g "$PGID" app 2>/dev/null || true
  usermod -o -u "$PUID" app 2>/dev/null || true
  chown -R app:app "$CONFIG_DIR" "$DATA_DIR"
  exec su-exec app "$@"
else
  exec "$@"
fi
