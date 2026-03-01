#!/usr/bin/env bash
#
# deploy-web.sh
#
# Build and deploy the Pan Flute Next.js website to Cloudflare Pages
# using @cloudflare/next-on-pages.
#
# Prerequisites:
#   - Node.js >= 18
#   - wrangler CLI installed and authenticated (`wrangler login`)
#   - Cloudflare Pages project "pan-flute-web" created
#     (auto-created on first deploy, or via `wrangler pages project create pan-flute-web`)
#   - R2 bucket and KV namespace created (see infrastructure/setup-cloudflare.sh)
#   - Secrets configured (see "Secrets" section below)
#
# Usage:
#   ./infrastructure/deploy-web.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WEB_DIR="${PROJECT_ROOT}/web"
PROJECT_NAME="pan-flute-web"

echo "=== Pan Flute Web - Cloudflare Pages Deployment ==="
echo ""
echo "Project root: ${PROJECT_ROOT}"
echo "Web directory: ${WEB_DIR}"
echo ""

# -----------------------------------------------------------------------
# 1. Install dependencies (if needed)
# -----------------------------------------------------------------------
echo "[1/3] Installing dependencies"
cd "${WEB_DIR}"
npm ci --prefer-offline 2>/dev/null || npm install
echo ""

# -----------------------------------------------------------------------
# 2. Build with @cloudflare/next-on-pages
#
#    This runs the Next.js build and then transforms the output into
#    a Cloudflare Pages-compatible format at .vercel/output/static.
# -----------------------------------------------------------------------
echo "[2/3] Building for Cloudflare Pages (next-on-pages)"
npm run pages:build
echo ""

# -----------------------------------------------------------------------
# 3. Deploy to Cloudflare Pages
#
#    The .vercel/output/static directory contains the full Pages bundle
#    including the _worker.js for edge SSR and API routes.
# -----------------------------------------------------------------------
echo "[3/3] Deploying to Cloudflare Pages"
npm run pages:deploy
echo ""

# -----------------------------------------------------------------------
# Post-deploy summary
# -----------------------------------------------------------------------
echo "=== Deployment complete ==="
echo ""
echo "Your site is live at: https://${PROJECT_NAME}.pages.dev"
echo ""
echo "==========================================================================="
echo "CONFIGURATION REFERENCE"
echo "==========================================================================="
echo ""
echo "--- Secrets (set once via wrangler, not in code) ---"
echo ""
echo "  wrangler pages secret put STRIPE_SECRET_KEY --project-name ${PROJECT_NAME}"
echo "    -> Your Stripe API secret key (sk_live_... or sk_test_...)"
echo ""
echo "  wrangler pages secret put STRIPE_WEBHOOK_SECRET --project-name ${PROJECT_NAME}"
echo "    -> Your Stripe webhook signing secret (whsec_...)"
echo ""
echo "  wrangler pages secret put FLYIO_RENDER_SECRET --project-name ${PROJECT_NAME}"
echo "    -> Shared secret for authenticating requests to the Fly.io render service"
echo ""
echo "--- R2 Bucket Binding ---"
echo ""
echo "  Binding name: STL_BUCKET"
echo "  Bucket name:  pan-flute-stls"
echo "  Configured in: web/wrangler.toml [[r2_buckets]]"
echo ""
echo "  Create the bucket (if not done):"
echo "    wrangler r2 bucket create pan-flute-stls"
echo ""
echo "  Set 7-day lifecycle expiry:"
echo "    wrangler r2 bucket lifecycle set pan-flute-stls --r2-expiration-days 7"
echo ""
echo "--- KV Namespace Binding ---"
echo ""
echo "  Binding name:   ORDER_KV"
echo "  Configured in:  web/wrangler.toml [[kv_namespaces]]"
echo ""
echo "  Create the namespace (if not done):"
echo "    wrangler kv:namespace create ORDER_KV"
echo "  Then update the 'id' field in web/wrangler.toml with the returned ID."
echo ""
echo "--- Environment Variables (non-secret, in wrangler.toml [vars]) ---"
echo ""
echo "  ENVIRONMENT       = production"
echo "  FLYIO_RENDER_URL  = https://pan-flute-renderer.fly.dev"
echo "==========================================================================="
