# Fix npm install on Node v24

## Problem
`npm install` fails because `@cloudflare/next-on-pages` pulls in `wrangler`, which pulls in `workerd` and old Vercel packages with `esbuild@0.14.47`. These postinstall scripts break on Node v24.

## Fix
Remove `@cloudflare/next-on-pages` and `@cloudflare/workers-types` from `devDependencies` in `web/package.json`. They are not needed for local dev (`next dev`), and the `pages:build`/`pages:deploy` scripts already use `npx` so they'll work in Cloudflare's CI environment.

### Steps

1. In `web/package.json`, remove these two lines from `devDependencies`:
   ```
   "@cloudflare/next-on-pages": "^1.13.0",
   "@cloudflare/workers-types": "4.20260301.1",
   ```

2. Delete `web/node_modules` and `web/package-lock.json` if they exist.

3. Run `npm install` from `web/`.

4. Verify with `npm run dev`.
