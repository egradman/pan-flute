"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
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

/** Default design: Super Mario Bros theme. */
function defaultDesign(): FluteDesign {
  return {
    pairs: [
      toNotePair(["C6", "E6"]),
      toNotePair(["G5", "B5"]),
      toNotePair(["E5", "G#5"]),
      toNotePair(["A5", "C#6"]),
      toNotePair(["B5", "D#6"]),
      toNotePair(["Bb5", "D6"]),
      toNotePair(["A5", "C#6"]),
    ],
    nameplate: "",
  };
}

export default function Home() {
  const [design, setDesign] = useState<FluteDesign>(defaultDesign);
  const [checkoutLoading, setCheckoutLoading] = useState<CheckoutTier | null>(
    null
  );
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function handleCheckout(tier: CheckoutTier) {
    setCheckoutLoading(tier);
    setCheckoutError(null);
    try {
      const url = await createCheckoutSession(design, tier);
      window.location.href = url;
    } catch (err) {
      console.error("Checkout failed:", err);
      setCheckoutError(
        err instanceof Error ? err.message : "Checkout failed. Please try again."
      );
      setCheckoutLoading(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* ================================================================ */}
      {/* Hero Section                                                      */}
      {/* ================================================================ */}
      <header className="relative overflow-hidden bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 px-4 py-16 text-center sm:py-20">
        {/* Decorative background shapes */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-yellow-300/20" />
        <div className="pointer-events-none absolute right-1/4 top-10 h-20 w-20 rounded-full bg-sky-300/20" />

        <div className="relative mx-auto max-w-2xl">
          <h1 className="animate-fade-in-up mb-6 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            One-Song Pan Flutes
          </h1>

          {/* Dash's intro */}
          <div
            className="animate-scale-in mx-auto max-w-lg rounded-2xl bg-white/20 p-6 text-left backdrop-blur-sm"
            style={{ animationDelay: "200ms" }}
          >
            <div className="mb-4 flex items-center gap-4">
              <Image
                src="/dash.jpg"
                alt="Dash, age 9"
                width={64}
                height={64}
                className="rounded-full border-2 border-white/50 object-cover shadow-md"
              />
              <div>
                <p className="font-display text-lg font-bold text-white">
                  Hi, I&apos;m Dash!
                </p>
                <p className="text-sm font-medium text-white/80">
                  Age 9 &middot; 3D printing enthusiast
                </p>
              </div>
            </div>
            <p className="mb-3 text-base leading-relaxed text-white/90">
              I got a 3D printer recently and the first thing I printed was a
              pan flute. Only problem? I can&apos;t actually play any songs on
              it.
            </p>
            <p className="mb-3 text-base leading-relaxed text-white/90">
              So my dad and I vibe-coded this website to let you design pan
              flutes that can at least play{" "}
              <span className="font-bold text-yellow-200">ONE song</span>. You
              pick the notes (two-note chords supported!), we generate a custom
              STL, and you print your very own flute.
            </p>
            <p className="text-sm font-medium text-white/70">
              All proceeds go directly to my printer filament budget.
            </p>
            <p className="mt-3 text-sm text-white/60">
              Want the technical details? Check out our{" "}
              <a
                href="https://github.com/egradman/pan-flute"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 transition-colors hover:text-white"
              >
                GitHub
              </a>{" "}
              with all the code. For educational purposes only; $2.99 is cheaper
              than the time you&apos;ll waste getting it running.
            </p>
          </div>
        </div>
      </header>

      <main>
        {/* ================================================================ */}
        {/* How It Works                                                      */}
        {/* ================================================================ */}
        <section className="border-b border-violet-100 bg-violet-50/50 px-4 py-14">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-10 text-center font-display text-2xl font-bold text-slate-800 sm:text-3xl">
              How It Works
            </h2>

            <div className="grid gap-6 sm:grid-cols-3">
              {/* Step 1 */}
              <div
                className="animate-fade-in-up rounded-2xl bg-orange-50 p-6 text-center"
                style={{ animationDelay: "100ms" }}
              >
                <div className="mb-3 text-4xl">🎵</div>
                <h3 className="mb-2 font-display text-lg font-bold text-slate-800">
                  Pick Your Song
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  Use the grid below to select up to two notes per pipe. Add or
                  remove pipes to match your melody.
                </p>
              </div>

              {/* Step 2 */}
              <div
                className="animate-fade-in-up rounded-2xl bg-sky-50 p-6 text-center"
                style={{ animationDelay: "200ms" }}
              >
                <div className="mb-3 text-4xl">🔊</div>
                <h3 className="mb-2 font-display text-lg font-bold text-slate-800">
                  Preview It
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  Hit play to hear your tune and spin the 3D model to see
                  exactly what you&apos;ll be printing.
                </p>
              </div>

              {/* Step 3 */}
              <div
                className="animate-fade-in-up rounded-2xl bg-fuchsia-50 p-6 text-center"
                style={{ animationDelay: "300ms" }}
              >
                <div className="mb-3 text-4xl">🎉</div>
                <h3 className="mb-2 font-display text-lg font-bold text-slate-800">
                  Print &amp; Play
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  Grab the STL to print at home, or order a finished flute
                  shipped right to your door.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Main Editor Area                                                  */}
        {/* ================================================================ */}
        <section id="editor" className="px-4 py-14">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-center font-display text-2xl font-bold text-slate-800 sm:text-3xl">
              Your Flute
            </h2>

            {/* Piano Roll */}
            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-violet-500">
                Melody Grid
              </h3>
              <PianoRoll design={design} onChange={setDesign} />
            </div>

            {/* Playback */}
            <div className="mb-8 flex justify-center">
              <PlayButton design={design} />
            </div>

            {/* Nameplate */}
            <div className="mx-auto mb-10 max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-orange-500">
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
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-sky-500">
                3D Preview
              </h3>
              <FlutePreview design={design} />
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Pricing Section                                                   */}
        {/* ================================================================ */}
        <section className="border-t border-orange-100 bg-orange-50/50 px-4 py-14">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-3 text-center font-display text-2xl font-bold text-slate-800 sm:text-3xl">
              Get Your Flute
            </h2>
            <p className="mx-auto mb-10 max-w-md text-center text-sm leading-relaxed text-slate-600">
              Choose the option that works best for you. Either way, your flute
              is tuned to the melody you just composed.
            </p>

            {/* Inline checkout error */}
            {checkoutError && (
              <div
                role="alert"
                className="mx-auto mb-6 max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700"
              >
                {checkoutError}
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              {/* Digital tier */}
              <div className="relative flex flex-col rounded-2xl border-2 border-sky-300 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                {/* Dash's Pick badge */}
                <div className="absolute -left-2 -top-3 -rotate-3">
                  <span className="inline-block rounded-full bg-sky-500 px-4 py-1 font-display text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                    Dash&apos;s Pick!
                  </span>
                </div>
                <div className="mb-4 mt-2">
                  <span className="inline-block rounded-full bg-sky-100 px-3 py-1 font-display text-xs font-bold uppercase tracking-wider text-sky-700">
                    Digital
                  </span>
                </div>
                <h3 className="mb-1 font-display text-3xl font-bold text-slate-800">
                  $2.99
                </h3>
                <p className="mb-6 text-sm text-slate-500">one-time purchase</p>
                <ul className="mb-8 flex-1 space-y-3 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-sky-500">&#10003;</span>
                    Ready-to-print STL file
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-sky-500">&#10003;</span>
                    Custom nameplate engraving
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-sky-500">&#10003;</span>
                    Instant download
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={() => handleCheckout("digital")}
                  disabled={checkoutLoading !== null}
                  className="w-full rounded-xl bg-sky-500 px-6 py-3 font-display text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checkoutLoading === "digital"
                    ? "Redirecting..."
                    : "Buy STL File"}
                </button>
              </div>

              {/* Physical tier */}
              <div className="relative flex flex-col rounded-2xl border-2 border-orange-300 bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
                {/* Fun badge */}
                <div className="absolute -right-2 -top-3 rotate-3">
                  <span className="inline-block rounded-full bg-orange-500 px-4 py-1 font-display text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                    Make Dash Work!
                  </span>
                </div>
                <div className="mb-4 mt-2">
                  <span className="inline-block rounded-full bg-orange-100 px-3 py-1 font-display text-xs font-bold uppercase tracking-wider text-orange-700">
                    Physical
                  </span>
                </div>
                <h3 className="mb-1 font-display text-3xl font-bold text-slate-800">
                  $19.99
                </h3>
                <p className="mb-6 text-sm text-slate-500">
                  includes shipping
                </p>
                <ul className="mb-8 flex-1 space-y-3 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-orange-500">&#10003;</span>
                    3D-printed and hand-finished
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-orange-500">&#10003;</span>
                    Custom nameplate engraving
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-orange-500">&#10003;</span>
                    Shipped to your door
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-orange-500">&#10003;</span>
                    STL file included
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={() => handleCheckout("physical")}
                  disabled={checkoutLoading !== null}
                  className="w-full rounded-xl bg-orange-500 px-6 py-3 font-display text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checkoutLoading === "physical"
                    ? "Redirecting..."
                    : "Order Printed Flute"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ================================================================ */}
      {/* Footer                                                            */}
      {/* ================================================================ */}
      <footer className="border-t border-violet-200 bg-violet-900 px-4 py-6 text-center">
        <p className="text-sm text-violet-300">
          &copy; {new Date().getFullYear()} Dash&apos;s One-Song Pan Flutes.
          Made with a 3D printer and a lot of vibe coding.
        </p>
      </footer>
    </div>
  );
}
