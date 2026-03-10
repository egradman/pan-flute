# Pan Flute Website

## Tools

- **flyctl**: Installed and authenticated for Fly.io deployments
- **stripe-cli**: Run via Docker: `docker run --rm -it stripe/stripe-cli:latest`

## Deploying to Cloudflare Pages

**IMPORTANT**: `wrangler pages deploy` fails silently when run from the `web/` directory because `wrangler.toml` (which defines Workers bindings for R2/KV) confuses the Pages deploy command. Wrangler interprets it as a Workers config and runs a second invocation with no command args.

**Workaround**: Deploy from a temp directory without the wrangler.toml:

```bash
cd web
npm run pages:build
TMPDIR=$(mktemp -d)
cp -r .vercel/output/static "$TMPDIR/static"
(cd "$TMPDIR" && npx wrangler pages deploy static --project-name pan-flute-web --branch main)
```

The production URL is: https://pan-flute-web.pages.dev
