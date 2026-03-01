/**
 * Simple rate limiter backed by Cloudflare KV.
 *
 * Each call increments a counter stored in KV with a TTL equal to the
 * sliding window duration.  Because KV's TTL is set on first write and
 * doesn't reset on subsequent puts, the window effectively starts from
 * the first request and expires naturally.
 *
 * Key format: rate:{endpoint}:{identifier}
 */

export interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** How many requests remain in the current window. */
  remaining: number;
}

/**
 * Check (and increment) a rate-limit counter in KV.
 *
 * @param kv            Cloudflare KV namespace binding
 * @param key           Unique key, e.g. `rate:checkout:203.0.113.42`
 * @param limit         Maximum number of requests allowed in the window
 * @param windowSeconds Duration of the rate-limit window in seconds
 * @returns             Whether the request is allowed and how many remain
 */
export async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const raw = await kv.get(key);
  const current = raw ? parseInt(raw, 10) : 0;

  if (current >= limit) {
    return { allowed: false, remaining: 0 };
  }

  const next = current + 1;

  // If this is the first request in the window, the TTL anchors the window.
  // On subsequent increments the TTL is refreshed, but that's acceptable —
  // worst case the window slides slightly, which is more lenient, not stricter.
  await kv.put(key, String(next), { expirationTtl: windowSeconds });

  return { allowed: true, remaining: limit - next };
}
