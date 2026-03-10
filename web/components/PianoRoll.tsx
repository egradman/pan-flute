"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { NOTE_NAMES, isBlackKey, toNotePair, parseNote } from "@/lib/notes";
import type { FluteDesign, NoteName, NotePair } from "@/lib/notes";

const MIN_COLUMNS = 2;
const MAX_COLUMNS = 16;

/** Sweet spot range — notes that sound best on a printed pan flute. */
const SWEET_SPOT_LOW = "E5";
const SWEET_SPOT_HIGH = "E6";

const SWEET_SPOT_LOW_MIDI = parseNote(SWEET_SPOT_LOW);
const SWEET_SPOT_HIGH_MIDI = parseNote(SWEET_SPOT_HIGH);

function inSweetSpot(note: NoteName): boolean {
  const midi = parseNote(note);
  return midi >= SWEET_SPOT_LOW_MIDI && midi <= SWEET_SPOT_HIGH_MIDI;
}

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
  const gridRef = useRef<HTMLTableElement>(null);

  // Roving tabindex: track which cell is focusable
  const [focusPos, setFocusPos] = useState({ row: 0, col: 0 });

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
    // Clamp focus position if needed
    if (focusPos.col >= pairs.length - 1) {
      setFocusPos((prev) => ({ ...prev, col: Math.max(0, pairs.length - 2) }));
    }
  }

  // --- cell click logic ------------------------------------------------

  const toggleNote = useCallback(
    (colIndex: number, note: NoteName) => {
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
    },
    [pairs, design, onChange]
  );

  // --- keyboard navigation (roving tabindex) ----------------------------

  function handleCellKeyDown(
    e: React.KeyboardEvent,
    rowIdx: number,
    colIdx: number
  ) {
    let nextRow = rowIdx;
    let nextCol = colIdx;

    switch (e.key) {
      case "ArrowUp":
        nextRow = Math.max(0, rowIdx - 1);
        e.preventDefault();
        break;
      case "ArrowDown":
        nextRow = Math.min(ROWS.length - 1, rowIdx + 1);
        e.preventDefault();
        break;
      case "ArrowLeft":
        nextCol = Math.max(0, colIdx - 1);
        e.preventDefault();
        break;
      case "ArrowRight":
        nextCol = Math.min(pairs.length - 1, colIdx + 1);
        e.preventDefault();
        break;
      case "Enter":
      case " ":
        toggleNote(colIdx, ROWS[rowIdx]);
        e.preventDefault();
        return;
      default:
        return;
    }

    setFocusPos({ row: nextRow, col: nextCol });
    const cell = gridRef.current?.querySelector(
      `[data-row="${nextRow}"][data-col="${nextCol}"]`
    ) as HTMLElement;
    cell?.focus();
  }

  // --- render ----------------------------------------------------------

  return (
    <div className="w-full">
      {/* Landscape orientation hint for portrait mobile users */}
      {showPortraitHint && (
        <div className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-violet-100 px-3 py-2 text-sm text-violet-700">
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

      {/* Column add/remove controls */}
      <div className="mb-3 flex items-center gap-3">
        <span className="text-sm font-medium text-slate-700">
          Columns: {pairs.length}
        </span>
        <button
          type="button"
          onClick={removeColumn}
          disabled={pairs.length <= MIN_COLUMNS}
          className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 text-lg leading-none transition-colors hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Remove column"
        >
          &minus;
        </button>
        <button
          type="button"
          onClick={addColumn}
          disabled={pairs.length >= MAX_COLUMNS}
          className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 text-lg leading-none transition-colors hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Add column"
        >
          +
        </button>
      </div>

      {/* Scrollable grid wrapper */}
      <div
        className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <table
          ref={gridRef}
          className="piano-roll-grid border-collapse"
          style={{ minWidth: "max-content" }}
          role="grid"
          aria-label="Melody grid — click or use arrow keys to select notes for each pipe"
        >
          <thead>
            <tr>
              {/* Empty corner cell above piano labels */}
              <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-1 py-1" />
              {pairs.map((_, colIdx) => (
                <th
                  key={colIdx}
                  className="border-b border-slate-200 px-0 py-1 text-center font-display text-xs font-bold text-slate-400"
                  style={{ minWidth: "var(--cell-w)" }}
                >
                  {colIdx + 1}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {ROWS.map((note, rowIdx) => {
              const black = isBlackKey(note);
              const sweet = inSweetSpot(note);
              return (
                <tr key={note} role="row">
                  {/* Piano key label — sticky left */}
                  <td
                    className={`sticky left-0 z-10 select-none whitespace-nowrap border-r border-slate-200 py-0 text-right font-mono leading-tight ${
                      black
                        ? "bg-slate-700 text-slate-100"
                        : "bg-slate-50 text-slate-600"
                    }`}
                    style={{
                      height: "var(--cell-h)",
                      paddingLeft: "var(--label-px)",
                      paddingRight: "var(--label-px)",
                      fontSize: "var(--label-fs)",
                      borderLeft: sweet
                        ? "3px solid #f59e0b"
                        : undefined,
                    }}
                  >
                    {note}
                  </td>

                  {/* Grid cells */}
                  {pairs.map((pair, colIdx) => {
                    const active = activeNotes(pair).includes(note);
                    const isFocusTarget =
                      focusPos.row === rowIdx && focusPos.col === colIdx;

                    return (
                      <td
                        key={colIdx}
                        role="gridcell"
                        tabIndex={isFocusTarget ? 0 : -1}
                        aria-selected={active}
                        aria-label={`${note}, column ${colIdx + 1}${active ? ", selected" : ""}`}
                        data-row={rowIdx}
                        data-col={colIdx}
                        onClick={() => {
                          toggleNote(colIdx, note);
                          setFocusPos({ row: rowIdx, col: colIdx });
                        }}
                        onKeyDown={(e) =>
                          handleCellKeyDown(e, rowIdx, colIdx)
                        }
                        className={`cursor-pointer border border-slate-100 transition-colors duration-75 ${
                          active
                            ? "bg-amber-400 hover:bg-amber-500 active:bg-amber-600"
                            : sweet
                              ? black
                                ? "bg-amber-100 hover:bg-amber-200 active:bg-amber-300"
                                : "bg-amber-50 hover:bg-amber-100 active:bg-amber-200"
                              : black
                                ? "bg-slate-200 hover:bg-slate-300 active:bg-slate-400"
                                : "bg-white hover:bg-slate-50 active:bg-slate-100"
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
