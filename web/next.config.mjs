import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for @cloudflare/next-on-pages
  // See: https://developers.cloudflare.com/pages/framework-guides/nextjs/ssr/get-started/
};

// setupDevPlatform() wires up Cloudflare bindings (R2, KV, etc.) in the
// local Next.js dev server so getRequestContext() returns a working env.
// It must only be called during development (not in the production build).
if (process.env.NODE_ENV === "development") {
  await setupDevPlatform();
}

export default nextConfig;
