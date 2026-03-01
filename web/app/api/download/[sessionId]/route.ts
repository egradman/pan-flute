/**
 * GET /api/download/:sessionId
 *
 * Serves the generated STL file for a completed order.
 *
 * Looks up the order record in KV, checks expiry, then streams the STL
 * binary from R2 with Content-Disposition: attachment.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface OrderRecord {
  r2Key: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { env } = getRequestContext();
  const { sessionId } = await params;

  // 1. Look up order token in KV
  const raw = await env.ORDER_KV.get(`order:${sessionId}`);

  if (!raw) {
    return NextResponse.json(
      { error: "Order not found or expired" },
      { status: 404 }
    );
  }

  let order: OrderRecord;
  try {
    order = JSON.parse(raw);
  } catch {
    console.error(`Download: failed to parse order record for ${sessionId}`);
    return NextResponse.json(
      { error: "Invalid order record" },
      { status: 500 }
    );
  }

  // 2. Check expiry
  const now = new Date();
  const expiresAt = new Date(order.expiresAt);

  if (now > expiresAt) {
    return NextResponse.json(
      { error: "Download link has expired" },
      { status: 410 }
    );
  }

  // 3. Fetch STL from R2
  const r2Object = await env.STL_BUCKET.get(order.r2Key);

  if (!r2Object) {
    console.error(
      `Download: R2 object not found for key ${order.r2Key} (session ${sessionId})`
    );
    return NextResponse.json(
      { error: "STL file not found" },
      { status: 404 }
    );
  }

  // 4. Stream the STL with Content-Disposition: attachment
  const filename = `pan-flute-${sessionId}.stl`;

  return new NextResponse(r2Object.body as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
