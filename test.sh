#!/usr/bin/env bash
# ───────────────────────────────────────────────────────
# PRView Test Runner
# Runs the full backend test suite using pytest.
#
# Usage:
#   bash test.sh              # run all tests
#   bash test.sh -v           # verbose output
#   bash test.sh -k "labels"  # run only label tests
#   bash test.sh --tb=short   # short tracebacks
# ───────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

cd "$BACKEND_DIR"

# Use the virtual environment
if [ -f ".venv/bin/python" ]; then
    PYTHON=".venv/bin/python"
elif [ -f "venv/bin/python" ]; then
    PYTHON="venv/bin/python"
else
    PYTHON="python3"
fi

echo "========================================="
echo "  PRView Test Suite"
echo "========================================="
echo ""
echo "Python: $PYTHON"
echo "Working dir: $BACKEND_DIR"
echo ""

# Run pytest with all arguments forwarded
$PYTHON -m pytest tests/ \
    -v \
    --tb=short \
    --no-header \
    -q \
    "$@"

echo ""
echo "========================================="
echo "  All tests passed!"
echo "========================================="
