/**
 * Cloudflare Worker / Pages bindings for the Pan Flute website.
 *
 * R2Bucket and KVNamespace types come from @cloudflare/workers-types.
 * Secrets are injected at runtime and exposed as plain strings.
 *
 * The CloudflareEnv interface is declared globally so that
 * getRequestContext() from @cloudflare/next-on-pages returns a
 * properly typed env object.
 */
interface Env {
  /** R2 bucket for temporary STL file storage (7-day lifecycle expiry). */
  STL_BUCKET: R2Bucket;

  /** KV namespace for order records and download tokens. */
  ORDER_KV: KVNamespace;

  /** Stripe API secret key (sk_live_... or sk_test_...). */
  STRIPE_SECRET_KEY: string;

  /** Stripe webhook endpoint signing secret (whsec_...). */
  STRIPE_WEBHOOK_SECRET: string;

  /** Shared secret used to authenticate requests to the Fly.io render service. */
  FLYIO_RENDER_SECRET: string;

  /** URL of the Fly.io STL render service. */
  FLYIO_RENDER_URL: string;

  /** Resend API key for transactional email delivery. */
  RESEND_API_KEY: string;
}

/**
 * Augment the CloudflareEnv interface used by @cloudflare/next-on-pages
 * getRequestContext() so that env bindings are properly typed.
 */
interface CloudflareEnv extends Env {}
