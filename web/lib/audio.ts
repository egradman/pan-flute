/**
 * Web Audio playback engine for the pan flute designer.
 *
 * Steps through columns left-to-right, playing each column's note pair
 * simultaneously as short triangle-wave tones with a gain envelope.
 */

import { noteToFreq } from "./notes";
import type { FluteDesign } from "./notes";

const NOTE_DURATION = 0.2; // seconds per column
const GAP_DURATION = 0.05; // seconds between columns

/** Returned by playDesign() so the caller can stop playback early. */
export interface PlaybackHandle {
  /** Call to immediately stop playback and clean up. */
  stop: () => void;
  /** Promise that resolves when playback finishes naturally (or is stopped). */
  done: Promise<void>;
}

/**
 * Play through every column of a FluteDesign sequentially.
 *
 * Each column's two notes are played simultaneously using triangle-wave
 * oscillators with a quick-attack / natural-decay gain envelope.
 *
 * @param design   The flute design to play.
 * @param onColumn Called with the 0-based column index each time a new column
 *                 starts playing.  Called with -1 when playback ends.
 * @returns A PlaybackHandle with stop() and done.
 */
export function playDesign(
  design: FluteDesign,
  onColumn?: (colIndex: number) => void,
): PlaybackHandle {
  // AudioContext must be created inside a user-gesture handler the first time.
  const ctx = new AudioContext();
  let stopped = false;

  const done = (async () => {
    const { pairs } = design;
    if (pairs.length === 0) return;

    for (let col = 0; col < pairs.length; col++) {
      if (stopped) break;

      onColumn?.(col);

      const [noteA, noteB] = pairs[col];
      const freqA = noteToFreq(noteA);
      const freqB = noteToFreq(noteB);

      // Play the two notes of this column simultaneously
      playTone(ctx, freqA, NOTE_DURATION);
      playTone(ctx, freqB, NOTE_DURATION);

      // Wait for the note duration + gap before moving to the next column
      await sleep((NOTE_DURATION + GAP_DURATION) * 1000);
    }

    onColumn?.(-1);
    await ctx.close();
  })();

  return {
    stop() {
      stopped = true;
      onColumn?.(-1);
      ctx.close().catch(() => {});
    },
    done,
  };
}

/**
 * Play a single tone at the given frequency for the given duration.
 * Uses a triangle oscillator with a gain envelope (quick attack, natural decay).
 */
function playTone(ctx: AudioContext, freq: number, duration: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.value = freq;

  // Gain envelope: quick attack, sustain, then decay to silence
  const now = ctx.currentTime;
  const attackEnd = now + 0.01;
  const decayStart = now + duration * 0.6;
  const end = now + duration;

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, attackEnd); // quick attack
  gain.gain.setValueAtTime(0.3, decayStart); // sustain
  gain.gain.exponentialRampToValueAtTime(0.001, end); // natural decay

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(end);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
