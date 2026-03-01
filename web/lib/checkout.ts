/**
 * Client-side helper for initiating Stripe Checkout.
 *
 * Posts the current flute design to /api/checkout and returns the
 * Stripe-hosted checkout URL for redirect.
 */

import type { FluteDesign } from "./notes";

export type CheckoutTier = "digital" | "physical";

/**
 * Create a Stripe Checkout Session for the given flute design.
 *
 * @param design - The flute design containing note pairs and nameplate text.
 * @param tier   - "digital" for STL download ($2.99) or "physical" for print & ship ($19.99).
 * @returns The Stripe Checkout URL to redirect the user to.
 * @throws {Error} If the request fails or the server returns an error.
 */
export async function createCheckoutSession(
  design: FluteDesign,
  tier: CheckoutTier = "digital"
): Promise<string> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      notes: design.pairs,
      nameplate: design.nameplate,
      tier,
    }),
  });

  if (!res.ok) {
    let message = "Checkout request failed";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) {
        message = data.error;
      }
    } catch {
      // response wasn't JSON; use status text
      message = `Checkout request failed: ${res.status} ${res.statusText}`;
    }
    throw new Error(message);
  }

  const data = (await res.json()) as { url?: string };

  if (!data.url || typeof data.url !== "string") {
    throw new Error("No checkout URL returned from server");
  }

  return data.url;
}
