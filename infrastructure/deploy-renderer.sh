#!/usr/bin/env bash
#
# deploy-renderer.sh
#
# Deploy the pan-flute renderer service to Fly.io.
# Run this script from the project root directory.
#
# Prerequisites:
#   - flyctl CLI installed and authenticated (flyctl auth login)
#   - Docker image builds successfully:
#       docker build -f renderer/Dockerfile -t pan-flute-renderer .
#
set -euo pipefail

APP_NAME="pan-flute-renderer"
FLY_CONFIG="renderer/fly.toml"
DOCKERFILE="renderer/Dockerfile"

echo "=== Pan Flute Renderer - Fly.io Deployment ==="
echo ""

# -----------------------------------------------------------------------
# 1. Create the Fly.io app (first time only — will error if it exists)
# -----------------------------------------------------------------------
echo "[1/3] Creating Fly.io app: ${APP_NAME}"
if flyctl apps list --json | grep -q "\"${APP_NAME}\""; then
    echo "       App already exists, skipping creation."
else
    flyctl apps create "${APP_NAME}"
fi

# -----------------------------------------------------------------------
# 2. Set the shared render secret
#
#    This secret must match the FLYIO_RENDER_SECRET configured in the
#    Cloudflare Pages worker (see infrastructure/setup-cloudflare.sh).
#    The value is read from the RENDER_SECRET env var, or prompted.
# -----------------------------------------------------------------------
echo ""
echo "[2/3] Setting RENDER_SECRET"
if [ -n "${RENDER_SECRET:-}" ]; then
    echo "${RENDER_SECRET}" | flyctl secrets set RENDER_SECRET=- --app "${APP_NAME}"
    echo "       Secret set from environment variable."
else
    echo "       Enter the shared render secret (must match Cloudflare FLYIO_RENDER_SECRET):"
    flyctl secrets set RENDER_SECRET --app "${APP_NAME}"
fi

# -----------------------------------------------------------------------
# 3. Deploy
# -----------------------------------------------------------------------
echo ""
echo "[3/3] Deploying to Fly.io"
flyctl deploy \
    --config "${FLY_CONFIG}" \
    --dockerfile "${DOCKERFILE}" \
    --app "${APP_NAME}"

# -----------------------------------------------------------------------
# Post-deploy info
# -----------------------------------------------------------------------
APP_URL="https://${APP_NAME}.fly.dev"
echo ""
echo "=== Deployment complete ==="
echo ""
echo "App URL: ${APP_URL}"
echo ""
echo "--- Test commands ---"
echo ""
echo "# Health check:"
echo "curl ${APP_URL}/health"
echo ""
echo "# Render a 2-pipe pan flute (replace <SECRET> with your RENDER_SECRET):"
echo "curl -X POST ${APP_URL}/render \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'X-Render-Secret: <SECRET>' \\"
echo "  -d '{\"notes\":[[\"C7\",\"E7\"],[\"G6\",\"B6\"]],\"nameplate\":\"TEST\"}' \\"
echo "  -o test_output.stl"
echo ""
echo "# Check machine status (should auto-stop when idle):"
echo "flyctl machines list --app ${APP_NAME}"
echo ""
echo "# View logs:"
echo "flyctl logs --app ${APP_NAME}"
