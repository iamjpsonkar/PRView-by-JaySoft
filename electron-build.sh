#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
ELECTRON_DIR="$ROOT_DIR/electron"

# ── Build frontend with relative paths for Electron ──
echo "Building frontend..."
cd "$FRONTEND_DIR"
if [ ! -d node_modules ]; then
  npm install --silent
fi
ELECTRON_BUILD=1 npm run build
echo "Frontend built → frontend/dist/"

# ── Install Electron dependencies ──
echo "Installing Electron dependencies..."
cd "$ELECTRON_DIR"
if [ ! -d node_modules ]; then
  npm install
else
  echo "Electron dependencies already installed."
fi

# ── Package with electron-builder ──
echo "Packaging Mac app..."
npx electron-builder --mac

echo ""
echo "Done! Output:"
ls -lh "$ELECTRON_DIR/dist/"*.dmg 2>/dev/null || true
echo "App: $ELECTRON_DIR/dist/mac*/PRView.app"
