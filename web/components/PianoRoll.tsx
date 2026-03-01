"use client";

import { useState, useEffect } from "react";
import { NOTE_NAMES, isBlackKey, toNotePair } from "@/lib/notes";
import type { FluteDesign, NoteName, NotePair } from "@/lib/notes";

const MIN_COLUMNS = 2;
const MAX_COLUMNS = 16;

/** NOTE_NAMES is low-to-high (C4..C7); we want high notes at the top. */
const ROWS: NoteName[] = [...NOTE_NAMES].reverse();

interface PianoRollProps {
  design: FluteDesign;
  onChange: (design: FluteDesign) => void;
}

/**
 * Extract the two active notes from a NotePair, deduplicating when both
 * slots hold the same note (the "single note duplicated" convention).
 */
function activeNotes(pair: NotePair): NoteName[] {
  const [a, b] = pair;
  if (a === b) return [a];
  return [a, b];
}

/**
 * Hook that returns true when the viewport is narrow AND in portrait.
 * Used to show a landscape orientation hint.
 */
function usePortraitHint(): boolean {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    function check() {
      const isNarrow = window.innerWidth < 640;
      const isPortrait = window.innerHeight > window.innerWidth;
      setShowHint(isNarrow && isPortrait);
    }
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  return showHint;
}

export default function PianoRoll({ design, onChange }: PianoRollProps) {
  const { pairs } = design;
  const showPortraitHint = usePortraitHint();

  // --- column mutations ------------------------------------------------

  function addColumn() {
    if (pairs.length >= MAX_COLUMNS) return;
    const updated: FluteDesign = {
      ...design,
      pairs: [...pairs, toNotePair(["C4"])],
    };
    onChange(updated);
  }

  function removeColumn() {
    if (pairs.length <= MIN_COLUMNS) return;
    const updated: FluteDesign = {
      ...design,
      pairs: pairs.slice(0, -1),
    };
    onChange(updated);
  }

  // --- cell click logic ------------------------------------------------

  function toggleNote(colIndex: number, note: NoteName) {
    const pair = pairs[colIndex];
    const current = activeNotes(pair);
    const isActive = current.includes(note);

    let next: NoteName[];

    if (isActive) {
      const remaining = current.filter((n) => n !== note);
      if (remaining.length === 0) {
        return;
      }
      next = remaining;
    } else {
      if (current.length < 2) {
        next = [...current, note];
      } else {
        next = [current[1], note];
      }
    }

    const newPairs = [...pairs];
    newPairs[colIndex] = toNotePair(next);
    onChange({ ...design, pairs: newPairs });
  }

  // --- render ----------------------------------------------------------

  return (
    <div className="w-full">
      {/* Landscape orientation hint for portrait mobile users */}
      {showPortraitHint && (
        <div className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-bamboo-100 px-3 py-2 text-sm text-bamboo-700">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Rotate your device for the best experience</span>
        </div>
      )}

      {/* Column add/remove controls — larger tap targets on mobile */}
      <div className="mb-3 flex items-center gap-3">
        <span className="text-sm font-medium text-bamboo-700">
          Columns: {pairs.length}
        </span>
        <button
          type="button"
          onClick={removeColumn}
          disabled={pairs.length <= MIN_COLUMNS}
          className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded-md border border-bamboo-300 bg-white text-bamboo-700 text-lg leading-none transition-colors hover:bg-bamboo-50 active:bg-bamboo-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Remove column"
        >
          &minus;
        </button>
        <button
          type="button"
          onClick={addColumn}
          disabled={pairs.length >= MAX_COLUMNS}
          className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded-md border border-bamboo-300 bg-white text-bamboo-700 text-lg leading-none transition-colors hover:bg-bamboo-50 active:bg-bamboo-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Add column"
        >
          +
        </button>
      </div>

      {/* Scrollable grid wrapper — touch-friendly scrolling */}
      <div
        className="overflow-x-auto rounded-xl border border-bamboo-200 bg-white/60 shadow-sm backdrop-blur-sm"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/*
         * CSS custom properties drive cell sizing responsively.
         * Mobile: 32px wide x 26px tall (touch-friendly).
         * sm (640px+): 36px wide x 20px tall (compact desktop).
         */}
        <style>{`
          .piano-roll-grid {
            --cell-w: 32px;
            --cell-h: 26px;
            --label-px: 4px;
            --label-fs: 10px;
          }
          @media (min-width: 640px) {
            .piano-roll-grid {
              --cell-w: 36px;
              --cell-h: 20px;
              --label-px: 8px;
              --label-fs: 11px;
            }
          }
        `}</style>
        <table
          className="piano-roll-grid border-collapse"
          style={{ minWidth: "max-content" }}
        >
          <thead>
            <tr>
              {/* Empty corner cell above piano labels */}
              <th className="sticky left-0 z-10 bg-bamboo-50 border-b border-r border-bamboo-200 px-1 py-1" />
              {pairs.map((_, colIdx) => (
                <th
                  key={colIdx}
                  className="border-b border-bamboo-200 px-0 py-1 text-center text-xs font-semibold text-bamboo-500"
                  style={{ minWidth: "var(--cell-w)" }}
                >
                  {colIdx + 1}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {ROWS.map((note) => {
              const black = isBlackKey(note);
              return (
                <tr key={note}>
                  {/* Piano key label — sticky left, narrower on mobile */}
                  <td
                    className={`sticky left-0 z-10 select-none whitespace-nowrap border-r border-bamboo-200 py-0 text-right font-mono leading-tight ${
                      black
                        ? "bg-bamboo-800 text-bamboo-100"
                        : "bg-bamboo-50 text-bamboo-600"
                    }`}
                    style={{
                      height: "var(--cell-h)",
                      paddingLeft: "var(--label-px)",
                      paddingRight: "var(--label-px)",
                      fontSize: "var(--label-fs)",
                    }}
                  >
                    {note}
                  </td>

                  {/* Grid cells — 32px min on mobile for tap targets, 36px on desktop */}
                  {pairs.map((pair, colIdx) => {
                    const active = activeNotes(pair).includes(note);
                    return (
                      <td
                        key={colIdx}
                        onClick={() => toggleNote(colIdx, note)}
                        className={`cursor-pointer border border-bamboo-100 transition-colors duration-75 ${
                          active
                            ? "bg-amber-400 hover:bg-amber-500 active:bg-amber-600"
                            : black
                              ? "bg-bamboo-100 hover:bg-bamboo-200 active:bg-bamboo-300"
                              : "bg-white hover:bg-bamboo-50 active:bg-bamboo-100"
                        }`}
                        style={{
                          width: "var(--cell-w)",
                          height: "var(--cell-h)",
                          minWidth: "var(--cell-w)",
                        }}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
