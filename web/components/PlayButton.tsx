"use client";

import { useCallback, useRef, useState } from "react";
import { playDesign } from "@/lib/audio";
import type { PlaybackHandle } from "@/lib/audio";
import type { FluteDesign } from "@/lib/notes";

interface PlayButtonProps {
  design: FluteDesign;
  /** Called with the 0-based index of the currently-playing column, or -1 when idle. */
  onPlayingColumn?: (colIndex: number) => void;
}

export default function PlayButton({ design, onPlayingColumn }: PlayButtonProps) {
  const [playing, setPlaying] = useState(false);
  const [currentCol, setCurrentCol] = useState(-1);
  const handleRef = useRef<PlaybackHandle | null>(null);

  const disabled = design.pairs.length === 0;

  const start = useCallback(() => {
    if (playing) return;

    setPlaying(true);
    const handle = playDesign(design, (col) => {
      setCurrentCol(col);
      onPlayingColumn?.(col);
      if (col === -1) {
        setPlaying(false);
        handleRef.current = null;
      }
    });
    handleRef.current = handle;

    // Also handle the promise finishing (e.g. natural end of playback)
    handle.done.then(() => {
      setPlaying(false);
      setCurrentCol(-1);
      onPlayingColumn?.(-1);
      handleRef.current = null;
    });
  }, [design, playing, onPlayingColumn]);

  const stop = useCallback(() => {
    handleRef.current?.stop();
    handleRef.current = null;
    setPlaying(false);
    setCurrentCol(-1);
    onPlayingColumn?.(-1);
  }, [onPlayingColumn]);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={playing ? stop : start}
        disabled={disabled}
        className={`
          inline-flex items-center gap-2 rounded-xl px-6 py-3
          font-display text-sm font-bold shadow-sm transition-colors
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-40
          ${
            playing
              ? "bg-red-500 text-white hover:bg-red-600 focus:ring-red-400"
              : "bg-violet-500 text-white hover:bg-violet-600 focus:ring-violet-400"
          }
        `}
        aria-label={playing ? "Stop playback" : "Play melody"}
      >
        {playing ? (
          /* Stop icon: solid square */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <rect x="4" y="4" width="12" height="12" rx="1" />
          </svg>
        ) : (
          /* Play icon: triangle */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <polygon points="5,3 17,10 5,17" />
          </svg>
        )}
        {playing ? "Stop" : "Play"}
      </button>

      {/* Column indicator while playing */}
      {playing && currentCol >= 0 && (
        <span
          className="text-sm font-medium text-violet-600"
          aria-live="polite"
        >
          Column {currentCol + 1} / {design.pairs.length}
        </span>
      )}
    </div>
  );
}
