#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
VENV_DIR="$BACKEND_DIR/.venv"
BACKEND_PORT=8121
FRONTEND_PORT=5121

cleanup() {
  echo ""
  echo "Shutting down..."
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
  wait 2>/dev/null
  echo "Done."
  exit 0
}
trap cleanup INT TERM

# ── Python venv ──
if [ ! -d "$VENV_DIR" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv "$VENV_DIR"
fi

echo "Installing Python dependencies..."
source "$VENV_DIR/bin/activate"
pip install -q -r "$BACKEND_DIR/requirements.txt"

# ── Node modules ──
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install --silent)
else
  echo "Frontend dependencies already installed."
fi

# ── Start backend ──
echo "Starting backend on port $BACKEND_PORT..."
(cd "$BACKEND_DIR" && source "$VENV_DIR/bin/activate" && uvicorn main:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload) &
BACKEND_PID=$!

# ── Start frontend ──
echo "Starting frontend on port $FRONTEND_PORT..."
(cd "$FRONTEND_DIR" && npx vite --port "$FRONTEND_PORT") &
FRONTEND_PID=$!

# ── Wait for frontend to be ready, then open browser ──
echo "Waiting for servers to start..."
for i in $(seq 1 30); do
  if curl -s "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
    echo ""
    echo "PRView is running at http://localhost:$FRONTEND_PORT"
    if command -v open >/dev/null 2>&1; then
      open "http://localhost:$FRONTEND_PORT"
    elif command -v xdg-open >/dev/null 2>&1; then
      xdg-open "http://localhost:$FRONTEND_PORT"
    fi
    break
  fi
  sleep 1
done

echo "Press Ctrl+C to stop."
wait
