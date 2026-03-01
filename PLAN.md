# Pan Flute Website Plan

## Overview

A web app where users design custom pan flutes using a piano-roll beat sequencer, preview them in 3D, and pay $2.99 to download the STL or $19.99 to have one printed and mailed to them.

## Architecture

```
┌─────────────────────────────┐
│   Cloudflare Pages          │
│   Next.js (static + edge)   │
│                             │
│  ┌───────────────────────┐  │
│  │  Piano Roll Editor    │  │
│  │  Web Audio Preview    │  │
│  │  Three.js 3D Preview  │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  CF Workers (API)     │  │
│  │  - POST /checkout     │  │
│  │  - POST /webhook      │  │
│  │  - GET  /download/:id │  │
│  └───────────────────────┘  │
└────────────┬────────────────┘
             │
             │ After payment confirmed
             ▼
┌─────────────────────────────┐
│   Fly.io Docker Runner      │
│                             │
│   Python + OpenSCAD         │
│   - Receives note JSON      │
│   - Runs generate_notes.py  │
│   - Runs openscad render    │
│   - Returns STL binary      │
└─────────────────────────────┘
```

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+ (App Router), React, TypeScript |
| Styling | Tailwind CSS |
| 3D Preview | Three.js (via @react-three/fiber) |
| Audio | Web Audio API (oscillators) |
| Hosting (frontend + API) | Cloudflare Pages + Workers |
| STL Rendering | Fly.io Docker container (Python + OpenSCAD) |
| Payments | Stripe Checkout (redirect flow) |
| Storage | Cloudflare R2 (temporary STL storage) |
| Database | Cloudflare KV (order tracking, download tokens) |

## Feature Spec

### 1. Piano Roll Sequencer

- **Grid layout**: Y-axis is pitch (C4–C7, 3 octaves = 36 semitones), X-axis is columns (time slots)
- **Interactions**:
  - Click a cell to toggle a note on/off
  - Each column must have exactly 2 notes selected. If the user selects only 1 note, it is duplicated to fill both slots (same note in upper and lower row)
  - If a user clicks a 3rd note in a column, the oldest selection in that column is deselected
  - Buttons to add/remove columns (min 2, max ~16 for printability)
- **Visual design**:
  - Piano key labels on left edge (white/black key coloring)
  - Active notes highlighted
  - Column numbers along the top
- **Nameplate**: text input field below the grid for custom engraved text

### 2. Audio Preview

- Web Audio API with simple sine/triangle oscillators
- "Play" button steps through columns left-to-right
  - Each column plays its 2 notes simultaneously as a short tone (~200ms)
  - Small gap between columns (~50ms)
- Tempo slider optional (nice-to-have)

### 3. 3D Preview (Client-Side)

- Three.js scene rendered below the sequencer using @react-three/fiber
- Build an approximate flute model directly from note data:
  - For each column, compute tube extension lengths using the same formula as `pan_flute.scad`:
    ```
    extension = (343000 / (4 * freq)) - end_correction - obj_resonating_length
    ```
  - Render cylinders for each tube (upper + lower row)
  - Render gap fills and sounding boards as simplified geometry
- OrbitControls for rotate/zoom
- Updates live as user edits the grid
- Disclaimer: "Preview is approximate. Final STL may differ slightly."

### 4. Checkout Flow

1. User finishes design, sees two options:
   - **"Download STL — $2.99"** — digital download of the 3D-printable file
   - **"We'll print & mail it — $19.99"** — we 3D-print the flute and ship it to them
2. Frontend sends note data + nameplate text + selected tier to `POST /api/checkout`
3. Worker creates a Stripe Checkout Session:
   - Product: "Custom Pan Flute STL" ($2.99) or "Custom Pan Flute — Printed & Shipped" ($19.99)
   - For the physical tier, Stripe Checkout collects shipping address
   - Metadata: serialized note JSON + nameplate text + tier
   - success_url: `/order/{session_id}`
   - cancel_url: `/` (back to editor, state preserved in URL hash)
4. User redirected to Stripe Checkout
5. Stripe redirects back to success_url after payment

### 5. STL Generation + Download (Digital Tier — $2.99)

1. Stripe fires `checkout.session.completed` webhook → `POST /api/webhook`
2. Worker verifies webhook signature, extracts note data from metadata
3. Worker calls Fly.io renderer: `POST https://flute-renderer.fly.dev/render`
   - Body: `{ notes: [["C7","E7"], ...], nameplate: "My Flute" }`
4. Fly.io container:
   - Writes JSON to temp file
   - Runs `python3 generate_notes.py input.json` → `notes.scad`
   - Patches nameplate text in `pan_flute.scad` (or pass as OpenSCAD variable via `-D`)
   - Runs `openscad -o output.stl pan_flute.scad`
   - Returns STL binary in response
5. Worker stores STL in Cloudflare R2 with a unique key
6. Worker stores download token in KV: `{session_id} → {r2_key, email, expires}`
7. When user hits `/order/{session_id}`:
   - Worker looks up token in KV
   - Serves STL from R2 as file download
   - Downloads expire after 7 days (link emailed to buyer)

### 6. Physical Order (Printed & Shipped Tier — $19.99)

- Same Stripe Checkout flow but with shipping address collection enabled
- Stripe includes the note JSON + nameplate text in the session metadata
- No custom backend fulfillment — Stripe emails you the order. You pull the JSON from the Stripe dashboard, render the STL locally, print it, and ship it.
- Future: add admin dashboard and order tracking if volume warrants it

### 7. Email Delivery

- **Digital tier**: download link email sent when STL is ready (via Resend, Postmark, or Cloudflare Email Workers)
- **Physical tier**: Stripe sends payment receipt to customer; you handle fulfillment manually

## Fly.io Renderer Service

### Dockerfile

```dockerfile
FROM ubuntu:24.04

RUN apt-get update && apt-get install -y \
    openscad python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY generate_notes.py pan_flute.scad pan_tube.stl ./

# Minimal HTTP server (Python or Go)
COPY server.py ./
CMD ["python3", "server.py"]
```

### API

- `POST /render` — accepts JSON body, returns STL binary
- Internal only (authenticated via shared secret between CF Worker and Fly.io)
- Timeout: 120s (OpenSCAD can be slow on complex models)
- Concurrency: 1 render at a time per instance, scale horizontally via Fly.io machines

### Pipeline Changes Needed

1. **Nameplate customization**: Pass nameplate text as an OpenSCAD variable: `openscad -D 'nameplate_text="USER TEXT"' -o out.stl pan_flute.scad`
   - Modify `pan_flute.scad` to use a variable instead of hardcoded "MARIO"
2. **Single-note columns**: When only 1 note is selected, `generate_notes.py` should output the same frequency for both upper and lower row (already handled by frontend duplication, but validate server-side too)

## Pages / Routes

| Route | Description |
|-------|------------|
| `/` | Main page: piano roll editor + 3D preview + checkout buttons |
| `/order/[sessionId]` | Order page: STL download (digital) or order status + tracking (physical) |
| `/api/checkout` | CF Worker: creates Stripe session (digital or physical tier) |
| `/api/webhook` | CF Worker: handles Stripe webhook, triggers render |
| `/api/download/[sessionId]` | CF Worker: serves STL from R2 |

## Data Flow Summary

```
User designs flute in piano roll
         │
         ▼
Note data serialized as JSON + nameplate text
         │
         ├─── "Download STL — $2.99" ──── or ──── "Print & Ship — $19.99" ───┐
         ▼                                                                    ▼
POST /api/checkout (digital)                          POST /api/checkout (physical, +shipping)
         │                                                                    │
         ▼                                                                    ▼
Stripe Checkout ($2.99)                               Stripe Checkout ($19.99 + address)
         │                                                                    │
         └──────────────────┬─────────────────────────────────────────────────┘
                            ▼
              Webhook → Fly.io renders STL → R2
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
     /order/{id}: download         /order/{id}: status tracker
     + email with link             + fulfillment queue → you print & ship
                                   + email with tracking when shipped
```

## Implementation Phases

### Phase 1: Piano Roll UI
- Next.js project scaffold with Tailwind
- Piano roll grid component (click to toggle, column add/remove)
- Note data model (JSON serialization matching pipeline format)
- Nameplate text input

### Phase 2: Audio + 3D Preview
- Web Audio playback of note sequence
- Three.js approximate flute model from note data
- Live reactivity (edit grid → model updates)

### Phase 3: Fly.io Renderer
- Dockerfile with OpenSCAD + Python
- HTTP server accepting render requests
- Parameterize `pan_flute.scad` for nameplate text
- Deploy to Fly.io, test end-to-end

### Phase 4: Stripe + Cloudflare Integration (Digital Tier)
- Stripe Checkout integration (CF Worker)
- Webhook handler + render job dispatch
- R2 storage for STL files
- KV for download tokens
- Order page + file serving

### Phase 5: Physical Tier
- Add $19.99 "Print & Ship" button alongside digital download
- Stripe Checkout with shipping address collection
- Note JSON + nameplate stored in Stripe session metadata (you handle fulfillment from Stripe dashboard)

### Phase 6: Polish
- Loading states and progress indication during render
- Error handling (render failures, payment issues)
- Mobile-responsive piano roll
- Email delivery (download links + order confirmations + shipping notifications)
- Rate limiting / abuse prevention
- Landing page copy and design

## Open Questions / Risks

1. **OpenSCAD render time**: Complex flutes (16 columns) may take 60-120s. Need a good loading UX (progress bar, email fallback).
2. **Fly.io cold starts**: First render after idle may be slow. Consider keeping a minimum of 1 machine alive or using Fly Machines API for on-demand spin-up.
3. **Tube length limits**: Very low notes (C4) produce long tubes. May need to warn users or cap the low range if tubes exceed printable dimensions.
4. **Mobile UX**: Piano roll grids are tricky on small screens. May need a simplified mobile interface or landscape-only mode.
