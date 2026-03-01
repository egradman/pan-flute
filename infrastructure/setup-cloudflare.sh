#!/usr/bin/env bash
#
# setup-cloudflare.sh
#
# One-time setup script for Cloudflare resources used by the Pan Flute website.
# Run this from the project root after authenticating with `wrangler login`.
#
# Prerequisites:
#   - wrangler CLI installed (`npm i -g wrangler`)
#   - Authenticated via `wrangler login`
#
set -euo pipefail

echo "=== Pan Flute - Cloudflare Infrastructure Setup ==="
echo ""

# -----------------------------------------------------------------------
# 1. Create R2 bucket for temporary STL file storage
# -----------------------------------------------------------------------
echo "[1/4] Creating R2 bucket: pan-flute-stls"
wrangler r2 bucket create pan-flute-stls

# -----------------------------------------------------------------------
# 2. Set lifecycle rule on the R2 bucket (7-day expiry)
#
#    Objects uploaded to this bucket are temporary render outputs.
#    They are automatically deleted after 7 days to control storage costs.
# -----------------------------------------------------------------------
echo ""
echo "[2/4] Setting 7-day lifecycle expiry on pan-flute-stls"
wrangler r2 bucket lifecycle set pan-flute-stls --r2-expiration-days 7

# -----------------------------------------------------------------------
# 3. Create KV namespace for order and download token storage
#
#    After creation, copy the printed namespace ID into web/wrangler.toml
#    under [[kv_namespaces]] -> id.
# -----------------------------------------------------------------------
echo ""
echo "[3/4] Creating KV namespace: ORDER_KV"
echo "       NOTE: Copy the namespace ID from the output below into web/wrangler.toml"
echo ""
wrangler kv:namespace create ORDER_KV

# -----------------------------------------------------------------------
# 4. Set worker secrets
#
#    Each command will prompt for the secret value interactively.
#    For Cloudflare Pages projects, use `wrangler pages secret put`.
# -----------------------------------------------------------------------
echo ""
echo "[4/4] Setting worker secrets (you will be prompted for each value)"
echo ""

echo "--- STRIPE_SECRET_KEY ---"
echo "  Your Stripe API secret key (sk_live_... or sk_test_...)"
wrangler pages secret put STRIPE_SECRET_KEY --project-name pan-flute-web

echo ""
echo "--- STRIPE_WEBHOOK_SECRET ---"
echo "  Your Stripe webhook signing secret (whsec_...)"
wrangler pages secret put STRIPE_WEBHOOK_SECRET --project-name pan-flute-web

echo ""
echo "--- FLYIO_RENDER_SECRET ---"
echo "  Shared secret for authenticating requests to the Fly.io render service"
wrangler pages secret put FLYIO_RENDER_SECRET --project-name pan-flute-web

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Copy the KV namespace ID from step 3 into web/wrangler.toml"
echo "  2. Update FLYIO_RENDER_URL in web/wrangler.toml [vars] with your actual Fly.io app URL"
echo "  3. Deploy with: cd web && npx wrangler pages deploy .vercel/output/static"
