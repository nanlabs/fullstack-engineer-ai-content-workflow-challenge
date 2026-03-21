#!/usr/bin/env bash
# Obtain a JWT from the backend and print it ready to paste into Swagger UI.
#
# Usage:
#   ./scripts/get-token.sh                              # uses demo credentials
#   ./scripts/get-token.sh user@example.com mypassword  # custom credentials
#   ./scripts/get-token.sh user@example.com mypassword http://localhost:3000
set -euo pipefail

EMAIL="${1:-demo@acme.com}"
PASSWORD="${2:-demo1234}"
BASE_URL="${3:-http://localhost:3000}"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -ne 200 ]; then
  echo "❌  Login failed (HTTP ${HTTP_CODE})"
  echo "    Response: $BODY"
  exit 1
fi

TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null || true)

if [ -z "$TOKEN" ]; then
  echo "❌  Could not parse access_token from response:"
  echo "    $BODY"
  exit 1
fi

echo ""
echo "✅  Logged in as: ${EMAIL}"
echo ""
echo "Bearer token (paste into Swagger UI → Authorize):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "${TOKEN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Swagger UI → http://localhost:3000/api/docs"
echo "  Click 'Authorize' → paste the token above (without 'Bearer ')"
echo ""
