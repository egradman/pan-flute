"use client";

import { useEffect, useState, useRef, useCallback } from "react";

type OrderStatus = "loading" | "ready" | "not-found" | "expired" | "error";

const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

// Staged messages that cycle during loading
const PROGRESS_STAGES = [
  { label: "Generating notes from your melody...", icon: "notes" },
  { label: "Calculating pipe dimensions...", icon: "ruler" },
  { label: "Rendering 3D model...", icon: "cube" },
  { label: "Preparing your download...", icon: "package" },
] as const;

// Time thresholds (in seconds) at which each stage activates
const STAGE_THRESHOLDS = [0, 10, 25, 50];

// Threshold in seconds after which we show a reassuring "still working" message
const LONG_WAIT_THRESHOLD_S = 60;

function NoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
    </svg>
  );
}

function RulerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 2v20M6 6h4M6 10h3M6 14h4M6 18h3M18 2v20M18 6h-4M18 10h-3M18 14h-4M18 18h-3" />
    </svg>
  );
}

function CubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    </svg>
  );
}

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    </svg>
  );
}

const STAGE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  notes: NoteIcon,
  ruler: RulerIcon,
  cube: CubeIcon,
  package: PackageIcon,
};

function getCurrentStage(elapsedS: number): number {
  let stage = 0;
  for (let i = STAGE_THRESHOLDS.length - 1; i >= 0; i--) {
    if (elapsedS >= STAGE_THRESHOLDS[i]) {
      stage = i;
      break;
    }
  }
  return stage;
}

// ---------- Loading sub-component ----------

function LoadingState({ elapsedSeconds }: { elapsedSeconds: number }) {
  const currentStage = getCurrentStage(elapsedSeconds);
  const showLongWait = elapsedSeconds >= LONG_WAIT_THRESHOLD_S;

  // Fake progress: ramps from 0 to ~90% over the first 90 seconds, never fully completes
  const progress = Math.min(90, (elapsedSeconds / 90) * 90);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Animated pan flute spinner */}
      <div className="relative flex items-end justify-center gap-[3px] h-16">
        {[40, 36, 32, 28, 24, 20, 16].map((h, i) => (
          <div
            key={i}
            className="w-3 rounded-t-full bg-gradient-to-b from-bamboo-400 to-bamboo-600 animate-pulse"
            style={{
              height: `${h}px`,
              animationDelay: `${i * 150}ms`,
              animationDuration: "1.2s",
            }}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-2 w-full overflow-hidden rounded-full bg-bamboo-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-bamboo-400 to-bamboo-600 transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stage steps */}
      <div className="w-full max-w-sm space-y-3">
        {PROGRESS_STAGES.map((stage, i) => {
          const isActive = i === currentStage;
          const isComplete = i < currentStage;
          const isPending = i > currentStage;
          const IconComponent = STAGE_ICONS[stage.icon];

          return (
            <div
              key={i}
              className={`flex items-center gap-3 transition-all duration-500 ${
                isPending ? "opacity-30" : "opacity-100"
              }`}
            >
              {/* Step indicator */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                  isComplete
                    ? "bg-green-100 text-green-600"
                    : isActive
                    ? "bg-bamboo-100 text-bamboo-600 ring-2 ring-bamboo-300 ring-offset-1"
                    : "bg-bamboo-50 text-bamboo-300"
                }`}
              >
                {isComplete ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <IconComponent className={`h-4 w-4 ${isActive ? "animate-pulse" : ""}`} />
                )}
              </div>

              {/* Stage label */}
              <span
                className={`text-sm transition-all duration-500 ${
                  isComplete
                    ? "text-green-700 line-through decoration-green-300"
                    : isActive
                    ? "font-medium text-bamboo-800"
                    : "text-bamboo-400"
                }`}
              >
                {stage.label}
              </span>

              {/* Active spinner dot */}
              {isActive && (
                <span className="ml-auto">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bamboo-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-bamboo-500" />
                  </span>
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Time estimate */}
      <div className="mt-2 text-center">
        {!showLongWait ? (
          <p className="text-sm text-bamboo-500">
            Usually takes 30&ndash;60 seconds
          </p>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-medium text-bamboo-600">
              Still working &mdash; complex flutes take a bit longer
            </p>
            <p className="text-xs text-bamboo-400">
              Elapsed: {Math.floor(elapsedSeconds)}s &middot; This can take up to 2 minutes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Main component ----------

export default function OrderContent({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<OrderStatus>("loading");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTime = useRef<number>(Date.now());

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    if (elapsedTimer.current) {
      clearInterval(elapsedTimer.current);
      elapsedTimer.current = null;
    }
  }, []);

  const checkDownload = useCallback(async (): Promise<OrderStatus> => {
    try {
      const res = await fetch(`/api/download/${sessionId}`, {
        method: "HEAD",
      });

      if (res.ok) return "ready";
      if (res.status === 410) return "expired";
      if (res.status === 404) return "not-found";
      return "error";
    } catch {
      return "error";
    }
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    startTime.current = Date.now();

    async function poll() {
      const result = await checkDownload();
      if (cancelled) return;

      if (result === "ready" || result === "expired") {
        setStatus(result);
        stopPolling();
        return;
      }

      // If we've been polling beyond the timeout, stop and show the last status
      if (Date.now() - startTime.current > POLL_TIMEOUT_MS) {
        setStatus(result === "not-found" ? "not-found" : "error");
        stopPolling();
        return;
      }

      // Still waiting -- keep the loading state
      setStatus("loading");
    }

    // Initial check
    poll();

    // Start polling
    pollTimer.current = setInterval(poll, POLL_INTERVAL_MS);

    // Start elapsed-seconds ticker (every second for smooth progress)
    elapsedTimer.current = setInterval(() => {
      if (!cancelled) {
        setElapsedSeconds((Date.now() - startTime.current) / 1000);
      }
    }, 1000);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [checkDownload, stopPolling]);

  // ----- Render states -----

  if (status === "loading") {
    return <LoadingState elapsedSeconds={elapsedSeconds} />;
  }

  if (status === "ready") {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="rounded-full bg-green-100 p-4">
          <svg
            className="h-10 w-10 text-green-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <p className="text-lg font-medium text-bamboo-800">
          Your STL file is ready!
        </p>

        <a
          href={`/api/download/${sessionId}`}
          className="inline-flex items-center gap-2 rounded-lg bg-bamboo-600 px-8 py-3 text-lg font-semibold text-white shadow-md transition-all hover:bg-bamboo-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-bamboo-400 focus:ring-offset-2 active:scale-95"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3"
            />
          </svg>
          Download STL
        </a>

        <p className="text-sm text-bamboo-500">
          This download link expires 7 days after purchase.
        </p>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-full bg-amber-100 p-4">
          <svg
            className="h-10 w-10 text-amber-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
            />
          </svg>
        </div>
        <p className="text-lg font-medium text-bamboo-800">
          Download link expired
        </p>
        <p className="text-sm text-bamboo-500">
          This download link has passed its 7-day expiry window.
        </p>
        <p className="text-sm text-bamboo-500">
          Please contact us at{" "}
          <a
            href="mailto:support@panflutedesigner.com"
            className="font-medium text-bamboo-600 underline underline-offset-2 hover:text-bamboo-800"
          >
            support@panflutedesigner.com
          </a>{" "}
          for a new download link.
        </p>
      </div>
    );
  }

  // not-found or error
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-full bg-red-100 p-4">
        <svg
          className="h-10 w-10 text-red-600"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <p className="text-lg font-medium text-bamboo-800">
        {status === "not-found"
          ? "Order not found"
          : "Something went wrong"}
      </p>
      <p className="text-sm text-bamboo-500 text-center">
        {status === "not-found"
          ? "We couldn't find an order with this ID. It may still be processing, or the link may be incorrect."
          : "An unexpected error occurred while rendering your pan flute. Please try refreshing the page."}
      </p>
      <div className="mt-2 flex flex-col items-center gap-2">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-lg border border-bamboo-300 bg-white px-5 py-2 text-sm font-medium text-bamboo-700 shadow-sm transition-colors hover:bg-bamboo-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh page
        </button>
        <p className="text-xs text-bamboo-400">
          If the problem persists, contact{" "}
          <a
            href="mailto:support@panflutedesigner.com"
            className="font-medium text-bamboo-500 underline underline-offset-2 hover:text-bamboo-700"
          >
            support@panflutedesigner.com
          </a>
        </p>
      </div>
    </div>
  );
}
