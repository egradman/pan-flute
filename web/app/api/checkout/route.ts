/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout Session for purchasing a custom pan flute.
 *
 * Accepts JSON body: { notes: [["C7","E7"], ...], nameplate: "text", tier: "digital" | "physical" }
 * Returns JSON:       { url: "https://checkout.stripe.com/..." }
 *
 * Tiers:
 *   - digital  ($2.99): Download the STL file
 *   - physical ($19.99): We print & ship it (collects shipping address)
 *
 * The flute design (notes + nameplate + tier) is stored in the session metadata
 * so it can be retrieved after payment via the webhook or success page.
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  // ---- Rate limiting: max 10 checkout attempts per IP per minute ----
  const { env } = getRequestContext();

  const clientIp =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const { allowed, remaining } = await checkRateLimit(
    env.ORDER_KV,
    `rate:checkout:${clientIp}`,
    10,
    60
  );

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // ---- Parse & validate request body ----
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("notes" in body) ||
    !("nameplate" in body)
  ) {
    return NextResponse.json(
      { error: "Missing required fields: notes, nameplate" },
      { status: 400 }
    );
  }

  const { notes, nameplate, tier = "digital" } = body as {
    notes: unknown;
    nameplate: unknown;
    tier?: unknown;
  };

  if (tier !== "digital" && tier !== "physical") {
    return NextResponse.json(
      { error: 'tier must be "digital" or "physical"' },
      { status: 400 }
    );
  }

  // notes must be a non-empty array of [string, string] pairs
  if (!Array.isArray(notes) || notes.length === 0) {
    return NextResponse.json(
      { error: "notes must be a non-empty array of [upper, lower] pairs" },
      { status: 400 }
    );
  }

  for (let i = 0; i < notes.length; i++) {
    const pair = notes[i];
    if (
      !Array.isArray(pair) ||
      pair.length !== 2 ||
      typeof pair[0] !== "string" ||
      typeof pair[1] !== "string"
    ) {
      return NextResponse.json(
        {
          error: `notes[${i}] must be a pair of two strings, got: ${JSON.stringify(pair)}`,
        },
        { status: 400 }
      );
    }
  }

  if (typeof nameplate !== "string") {
    return NextResponse.json(
      { error: "nameplate must be a string" },
      { status: 400 }
    );
  }

  // ---- Get Stripe key from Cloudflare env bindings ----
  const stripeKey = env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    console.error("STRIPE_SECRET_KEY is not configured");
    return NextResponse.json(
      { error: "Payment service is not configured" },
      { status: 500 }
    );
  }

  // ---- Create Stripe Checkout Session ----
  const stripe = new Stripe(stripeKey, {
    apiVersion: "2026-02-25.clover",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const origin = new URL(request.url).origin;

  const isPhysical = tier === "physical";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: isPhysical
                ? "Custom Pan Flute — Printed & Shipped"
                : "Custom Pan Flute STL",
            },
            unit_amount: isPhysical ? 1999 : 299, // $19.99 or $2.99
          },
          quantity: 1,
        },
      ],
      ...(isPhysical && {
        shipping_address_collection: {
          allowed_countries: ["US"] as const,
        },
      }),
      metadata: {
        notes: JSON.stringify(notes),
        nameplate: nameplate,
        tier: tier,
      },
      success_url: `${origin}/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session creation failed:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
