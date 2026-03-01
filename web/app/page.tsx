"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import PianoRoll from "@/components/PianoRoll";
import PlayButton from "@/components/PlayButton";
import NameplateInput from "@/components/NameplateInput";
import { toNotePair } from "@/lib/notes";
import type { FluteDesign } from "@/lib/notes";
import { createCheckoutSession } from "@/lib/checkout";
import type { CheckoutTier } from "@/lib/checkout";

const FlutePreview = dynamic(() => import("@/components/FlutePreview"), {
  ssr: false,
});

/** Default design: 4 columns with a simple C major arpeggio. */
function defaultDesign(): FluteDesign {
  return {
    pairs: [
      toNotePair(["C5"]),
      toNotePair(["E5"]),
      toNotePair(["G5"]),
      toNotePair(["C6"]),
    ],
    nameplate: "",
  };
}

/** Inline checkmark icon used in pricing feature lists. */
function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="mt-0.5 shrink-0 text-bamboo-500"
      aria-hidden="true"
    >
      <path
        d="M13.3 4.3a1 1 0 010 1.4l-6 6a1 1 0 01-1.4 0l-3-3a1 1 0 011.4-1.4L6.6 9.6l5.3-5.3a1 1 0 011.4 0z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function Home() {
  const [design, setDesign] = useState<FluteDesign>(defaultDesign);
  const [checkoutLoading, setCheckoutLoading] = useState<CheckoutTier | null>(
    null
  );

  async function handleCheckout(tier: CheckoutTier) {
    setCheckoutLoading(tier);
    try {
      const url = await createCheckoutSession(design, tier);
      window.location.href = url;
    } catch (err) {
      console.error("Checkout failed:", err);
      alert(err instanceof Error ? err.message : "Checkout failed");
      setCheckoutLoading(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* ================================================================ */}
      {/* Hero Section                                                      */}
      {/* ================================================================ */}
      <header className="relative overflow-hidden bg-gradient-to-b from-bamboo-800 to-bamboo-700 px-4 py-16 text-center sm:py-20">
        {/* Decorative background accents */}
        <div
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, #e0ccad 0%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, #e0ccad 0%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-2xl">
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-bamboo-50 sm:text-5xl lg:text-6xl">
            Design Your Own Pan Flute
          </h1>
          <p className="mx-auto max-w-lg text-lg leading-relaxed text-bamboo-200 sm:text-xl">
            Create a custom two-tone pan flute, preview it in 3D, and get the
            STL file to print at home.
          </p>
        </div>
      </header>

      {/* ================================================================ */}
      {/* How It Works                                                      */}
      {/* ================================================================ */}
      <section className="border-b border-bamboo-200 bg-bamboo-50 px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-bamboo-800 sm:text-3xl">
            How It Works
          </h2>

          <div className="grid gap-8 sm:grid-cols-3">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-bamboo-600 text-xl font-bold text-white shadow-md">
                1
              </div>
              <h3 className="mb-2 text-lg font-semibold text-bamboo-800">
                Compose
              </h3>
              <p className="text-sm leading-relaxed text-bamboo-600">
                Click the grid below to select up to two notes for each pipe
                column. Add or remove columns to shape your melody.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-bamboo-600 text-xl font-bold text-white shadow-md">
                2
              </div>
              <h3 className="mb-2 text-lg font-semibold text-bamboo-800">
                Preview
              </h3>
              <p className="text-sm leading-relaxed text-bamboo-600">
                Hit play to hear your melody and spin the 3D model to see
                exactly what your flute will look like.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-bamboo-600 text-xl font-bold text-white shadow-md">
                3
              </div>
              <h3 className="mb-2 text-lg font-semibold text-bamboo-800">
                Order
              </h3>
              <p className="text-sm leading-relaxed text-bamboo-600">
                Download the STL file to print at home, or let us print and
                ship a finished flute to your door.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* Main Editor Area                                                  */}
      {/* ================================================================ */}
      <main className="flex-1 px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-bamboo-800 sm:text-3xl">
            Your Flute
          </h2>

          {/* Piano Roll */}
          <div className="mb-8 rounded-2xl border border-bamboo-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-bamboo-500">
              Melody Grid
            </h3>
            <PianoRoll design={design} onChange={setDesign} />
          </div>

          {/* Playback */}
          <div className="mb-8 flex justify-center">
            <PlayButton design={design} />
          </div>

          {/* Nameplate */}
          <div className="mx-auto mb-10 max-w-md rounded-2xl border border-bamboo-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-bamboo-500">
              Personalize
            </h3>
            <NameplateInput
              value={design.nameplate}
              onChange={(text) =>
                setDesign((prev) => ({ ...prev, nameplate: text }))
              }
            />
          </div>

          {/* 3D Preview */}
          <div className="rounded-2xl border border-bamboo-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-bamboo-500">
              3D Preview
            </h3>
            <FlutePreview design={design} />
          </div>
        </div>
      </main>

      {/* ================================================================ */}
      {/* Pricing Section                                                   */}
      {/* ================================================================ */}
      <section className="border-t border-bamboo-200 bg-bamboo-50 px-4 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-3 text-center text-2xl font-bold text-bamboo-800 sm:text-3xl">
            Get Your Flute
          </h2>
          <p className="mx-auto mb-10 max-w-md text-center text-sm leading-relaxed text-bamboo-600">
            Choose the option that works best for you. Either way, your flute
            is tuned to the melody you just composed.
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Digital tier */}
            <div className="flex flex-col rounded-2xl border-2 border-bamboo-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4">
                <span className="inline-block rounded-full bg-bamboo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-bamboo-700">
                  Digital
                </span>
              </div>
              <h3 className="mb-1 text-3xl font-extrabold text-bamboo-800">
                $2.99
              </h3>
              <p className="mb-6 text-sm text-bamboo-500">one-time purchase</p>
              <ul className="mb-8 flex-1 space-y-3 text-sm text-bamboo-700">
                <li className="flex items-start gap-2">
                  <CheckIcon />
                  Ready-to-print STL file
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon />
                  Custom nameplate engraving
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon />
                  Instant download
                </li>
              </ul>
              <button
                type="button"
                onClick={() => handleCheckout("digital")}
                disabled={checkoutLoading !== null}
                className="w-full rounded-xl bg-bamboo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-bamboo-700 focus:outline-none focus:ring-2 focus:ring-bamboo-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checkoutLoading === "digital"
                  ? "Redirecting..."
                  : "Buy STL File"}
              </button>
            </div>

            {/* Physical tier */}
            <div className="relative flex flex-col rounded-2xl border-2 border-bamboo-500 bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
              {/* Popular badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-block rounded-full bg-bamboo-600 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                  Most Popular
                </span>
              </div>
              <div className="mb-4 mt-2">
                <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Physical
                </span>
              </div>
              <h3 className="mb-1 text-3xl font-extrabold text-bamboo-800">
                $19.99
              </h3>
              <p className="mb-6 text-sm text-bamboo-500">
                includes shipping
              </p>
              <ul className="mb-8 flex-1 space-y-3 text-sm text-bamboo-700">
                <li className="flex items-start gap-2">
                  <CheckIcon />
                  3D-printed and hand-finished
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon />
                  Custom nameplate engraving
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon />
                  Shipped to your door
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon />
                  STL file included
                </li>
              </ul>
              <button
                type="button"
                onClick={() => handleCheckout("physical")}
                disabled={checkoutLoading !== null}
                className="w-full rounded-xl bg-bamboo-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-bamboo-800 focus:outline-none focus:ring-2 focus:ring-bamboo-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checkoutLoading === "physical"
                  ? "Redirecting..."
                  : "Order Printed Flute"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* Footer                                                            */}
      {/* ================================================================ */}
      <footer className="border-t border-bamboo-200 bg-bamboo-800 px-4 py-6 text-center">
        <p className="text-sm text-bamboo-300">
          &copy; {new Date().getFullYear()} Pan Flute Designer. All rights
          reserved.
        </p>
      </footer>
    </div>
  );
}
