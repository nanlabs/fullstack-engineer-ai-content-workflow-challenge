#!/usr/bin/env bash
# Run all tests for the ACME Content Workflow project.
# Safe to execute from any directory — paths are resolved relative to this script.
#
# Usage:
#   ./scripts/run-tests.sh              # run tests only
#   ./scripts/run-tests.sh --coverage   # run tests + generate coverage reports
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

COVERAGE=false
if [[ "${1:-}" == "--coverage" ]]; then
  COVERAGE=true
fi

PASS=0
FAIL=0

run_suite() {
  local label="$1"
  local dir="$2"
  local cmd="$3"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  $label"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  pushd "$dir" > /dev/null
  if eval "$cmd"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
  popd > /dev/null
}

echo ""
echo "🧪  ACME Content Workflow — Test Suite"
echo "    Root: $ROOT_DIR"
if $COVERAGE; then
  echo "    Mode: tests + coverage reports → coverage/"
fi

if $COVERAGE; then
  run_suite "Backend  (Jest — 122 tests, 11 suites)" "$BACKEND_DIR" "npm run test:cov"
  run_suite "Frontend (Vitest — 51 tests, 4 suites)"  "$FRONTEND_DIR" "npm run test:cov"
else
  run_suite "Backend  (Jest — 122 tests, 11 suites)" "$BACKEND_DIR" "npm test"
  run_suite "Frontend (Vitest — 51 tests, 4 suites)"  "$FRONTEND_DIR" "npm test"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$FAIL" -eq 0 ]; then
  echo "  ✅  All $PASS suite(s) passed"
  if $COVERAGE; then
    echo ""
    echo "  📊  Coverage reports written to:"
    echo "        coverage/backend/   (lcov + text)"
    echo "        coverage/frontend/  (lcov + text)"
  fi
else
  echo "  ❌  $FAIL suite(s) FAILED  ($PASS passed)"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit "$FAIL"

