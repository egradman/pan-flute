default_input := "mario.json"
cf_prod := "pan-flute-web"
cf_sandbox := `cat credentials/sandbox-project-name.txt 2>/dev/null || echo ""`

# Build a local STL from a note JSON file
build input=default_input:
    #!/bin/bash
    set -euo pipefail
    base="$(basename "{{input}}" .json)"
    echo "==> Generating flute.scad from {{input}}"
    python3 generate_flute.py "{{input}}"
    echo "==> Rendering ${base}.stl"
    openscad -o "${base}.stl" flute.scad
    echo "==> Done: ${base}.stl"
    scp "${base}.stl" air:/tmp/
    echo "==> Copied to air:/tmp/${base}.stl"

preview input=default_input:
    #!/bin/bash
    set -euo pipefail
    echo "==> Generating flute.scad from {{input}}"
    python3 generate_flute.py "{{input}}"
    echo "==> Opening in OpenSCAD"
    openscad flute.scad &

# --- Web deploy recipes ---

# Build the Cloudflare Pages bundle
web-build:
    cd web && npm run pages:build

# Deploy to production (builds first)
deploy: web-build
    @just _deploy-to {{cf_prod}}

# Deploy to sandbox (builds first)
deploy-sandbox: web-build
    @just _deploy-to {{cf_sandbox}}

# Deploy to both prod and sandbox (builds once)
deploy-both: web-build
    @just _deploy-to {{cf_prod}}
    @just _deploy-to {{cf_sandbox}}

# Internal: deploy last build to a given project
_deploy-to project:
    #!/bin/bash
    set -euo pipefail
    TMPDIR=$(mktemp -d)
    cp -r web/.vercel/output/static "$TMPDIR/static"
    (cd "$TMPDIR" && npx wrangler pages deploy static --project-name {{project}} --branch main)

# Deploy the Fly.io renderer
deploy-renderer:
    flyctl deploy --config renderer/fly.toml --dockerfile renderer/Dockerfile

# Deploy everything (web + renderer)
deploy-all: deploy-both deploy-renderer

# Set secrets on a Cloudflare Pages project from a credentials file
# Usage: just cf-secrets pan-flute-web credentials/stripe_live.txt
cf-secrets project file:
    #!/bin/bash
    set -euo pipefail
    TMPDIR=$(mktemp -d)
    while IFS='=' read -r key value; do
        [[ -z "$key" || "$key" =~ ^# ]] && continue
        echo -n "$value" | (cd "$TMPDIR" && npx wrangler pages secret put "$key" --project-name {{project}})
    done < "{{file}}"

# Set Stripe credentials on prod and redeploy
stripe-live: (cf-secrets cf_prod "credentials/stripe_live.txt")
    @just _deploy-to {{cf_prod}}

# Set Stripe credentials on sandbox and redeploy
stripe-sandbox: (cf-secrets cf_sandbox "credentials/stripe_sandbox.txt")
    @just _deploy-to {{cf_sandbox}}

# Set infra secrets on both projects
secrets-infra:
    @just cf-secrets {{cf_prod}} credentials/cloudflare-pages-secrets.txt
    @just cf-secrets {{cf_sandbox}} credentials/cloudflare-pages-secrets.txt
