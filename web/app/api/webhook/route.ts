/**
 * POST /api/webhook
 *
 * Stripe webhook handler. Verifies the webhook signature using HMAC-SHA256
 * (edge-compatible via crypto.subtle), then processes checkout.session.completed
 * events:
 *
 *   1. Extracts notes JSON + nameplate from session metadata.
 *   2. Calls the Fly.io render service to produce an STL binary.
 *   3. Stores the STL in Cloudflare R2: stl/{session_id}.stl
 *   4. Stores a download token in KV: order:{session_id} -> JSON record.
 *
 * Always returns 200 to Stripe to prevent retries on non-recoverable errors.
 *
 * SECURITY — Render abuse prevention:
 *
 *   The Fly.io render service (which spins up compute to generate STL files)
 *   is only called from handleCheckoutCompleted(), which itself is only
 *   reached after BOTH of these gates pass:
 *
 *     a) Stripe signature verification (verifyStripeSignature) — ensures the
 *        request genuinely originated from Stripe, not an attacker.
 *     b) Event type check (checkout.session.completed) — ensures a real
 *        payment was collected before any render work is dispatched.
 *
 *   Together these guarantee that an attacker cannot trigger expensive
 *   renders on Fly.io without completing a paid Stripe checkout session.
 *   No additional rate limiting is needed on this endpoint because Stripe
 *   controls the request volume and the signature check rejects all
 *   unauthenticated traffic.  See infrastructure/cloudflare-waf.md for
 *   supplementary WAF-level protections.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { sendDownloadEmail } from "@/lib/email";

export const runtime = "edge";

// ---------------------------------------------------------------------------
// Stripe signature verification (edge-compatible, no Node crypto)
// ---------------------------------------------------------------------------

const EXPECTED_SCHEME = "v1";

/**
 * Compute HMAC-SHA256 hex digest using the Web Crypto API.
 */
async function hmacSha256Hex(
  secret: string,
  payload: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

/**
 * Verify a Stripe webhook signature header against the raw body.
 *
 * Stripe-Signature format: t=<timestamp>,v1=<hex>,v0=<hex>,...
 * We verify at least one v1 signature matches.
 */
async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  toleranceSec: number = 300
): Promise<boolean> {
  const elements = signatureHeader.split(",");
  const pairs: Record<string, string[]> = {};

  for (const el of elements) {
    const [key, value] = el.split("=", 2);
    if (!key || !value) continue;
    if (!pairs[key]) pairs[key] = [];
    pairs[key].push(value);
  }

  const timestamps = pairs["t"];
  if (!timestamps || timestamps.length === 0) return false;

  const timestamp = timestamps[0];
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;

  // Check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > toleranceSec) return false;

  const signatures = pairs[EXPECTED_SCHEME];
  if (!signatures || signatures.length === 0) return false;

  // Compute expected signature
  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSig = await hmacSha256Hex(secret, signedPayload);

  // Check if any v1 signature matches
  for (const sig of signatures) {
    if (timingSafeEqual(sig, expectedSig)) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Order record stored in KV
// ---------------------------------------------------------------------------

interface OrderRecord {
  r2Key: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const { env } = getRequestContext();

  // 1. Read raw body
  const rawBody = await request.text();

  // 2. Verify Stripe webhook signature
  const signatureHeader = request.headers.get("stripe-signature");
  if (!signatureHeader) {
    console.error("Webhook error: missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const isValid = await verifyStripeSignature(
    rawBody,
    signatureHeader,
    env.STRIPE_WEBHOOK_SECRET
  );

  if (!isValid) {
    console.error("Webhook error: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 3. Parse event
  let event: {
    type: string;
    data: {
      object: {
        id: string;
        metadata?: Record<string, string>;
        customer_details?: { email?: string };
      };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    console.error("Webhook error: invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 4. Handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const origin = new URL(request.url).origin;
    try {
      await handleCheckoutCompleted(env, event.data.object, origin);
    } catch (err) {
      // Log the error but return 200 so Stripe doesn't retry non-recoverable errors
      console.error("Webhook processing error:", err);
    }
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ received: true }, { status: 200 });
}

// ---------------------------------------------------------------------------
// checkout.session.completed handler
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(
  env: CloudflareEnv,
  session: {
    id: string;
    metadata?: Record<string, string>;
    customer_details?: { email?: string };
  },
  origin: string
) {
  const sessionId = session.id;
  const metadata = session.metadata;

  if (!metadata) {
    throw new Error(`Session ${sessionId}: no metadata found`);
  }

  const notesJson = metadata.notes;
  const nameplate = metadata.nameplate;

  if (!notesJson) {
    throw new Error(`Session ${sessionId}: no notes in metadata`);
  }

  // Parse notes to validate
  const notes = JSON.parse(notesJson);

  const email = session.customer_details?.email ?? "";

  // a. Call Fly.io renderer
  const renderUrl = `${env.FLYIO_RENDER_URL}/render`;

  const renderResponse = await fetch(renderUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Render-Secret": env.FLYIO_RENDER_SECRET,
    },
    body: JSON.stringify({
      notes,
      nameplate: nameplate ?? "",
    }),
  });

  if (!renderResponse.ok) {
    const errorText = await renderResponse.text();
    throw new Error(
      `Render service returned ${renderResponse.status}: ${errorText}`
    );
  }

  // b. Get the STL binary
  const stlBuffer = await renderResponse.arrayBuffer();

  // c. Store in R2
  const r2Key = `stl/${sessionId}.stl`;
  await env.STL_BUCKET.put(r2Key, stlBuffer, {
    httpMetadata: {
      contentType: "application/octet-stream",
    },
  });

  // d. Store download token in KV (7-day expiry)
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const orderRecord: OrderRecord = {
    r2Key,
    email,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  await env.ORDER_KV.put(
    `order:${sessionId}`,
    JSON.stringify(orderRecord),
    {
      // Also set KV TTL so stale entries are auto-cleaned (use seconds)
      expirationTtl: 7 * 24 * 60 * 60,
    }
  );

  console.log(
    `Webhook: processed session ${sessionId}, STL stored at ${r2Key}`
  );

  // e. Send download email (best-effort: don't fail the webhook on email errors)
  if (email) {
    try {
      await sendDownloadEmail({
        to: email,
        sessionId,
        noteCount: notes.length,
        nameplate: nameplate ?? "",
        origin,
        env,
      });
      console.log(`Webhook: download email sent to ${email} for ${sessionId}`);
    } catch (emailErr) {
      console.error(
        `Webhook: failed to send download email for ${sessionId}:`,
        emailErr
      );
    }
  } else {
    console.warn(
      `Webhook: no customer email for session ${sessionId}, skipping email`
    );
  }
}
