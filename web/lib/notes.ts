/**
 * Core note data model for the pan flute designer.
 *
 * Provides type definitions, frequency calculation (A4 = 440 Hz, 12-TET),
 * note-name parsing, and URL-hash serialization for state persistence.
 *
 * The pipeline JSON format consumed by generate_notes.py is an array of
 * [upper, lower] string pairs, e.g. [["C7","E7"],["G6","B6"]].
 */

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

/** A note name string like "C4", "F#6", "Bb5". */
export type NoteName = string;

/** A pair of notes for one pipe column: [upper, lower]. */
export type NotePair = [NoteName, NoteName];

/** A complete flute design: an ordered list of note pairs plus nameplate text. */
export interface FluteDesign {
  pairs: NotePair[];
  nameplate: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Semitone offsets for each letter name relative to C. */
const NOTE_BASES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/**
 * All note names from C5 to C7 (inclusive), 25 semitones.
 * Sharps are used for black keys (no enharmonic duplicates).
 */
export const NOTE_NAMES: NoteName[] = (() => {
  const CHROMATIC = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const names: NoteName[] = [];
  for (let octave = 5; octave <= 7; octave++) {
    for (let i = 0; i < 12; i++) {
      const name = `${CHROMATIC[i]}${octave}`;
      names.push(name);
      // Stop after C7 so we get C5..B6 + C7 = 25 notes
      if (octave === 7 && i === 0) break;
    }
  }
  return names;
})();

// ---------------------------------------------------------------------------
// Note parsing & frequency helpers
// ---------------------------------------------------------------------------

/**
 * Parse a note name (e.g. "C#4", "Db3", "E5") into its MIDI number.
 *
 * Mirrors the Python `parse_note` in generate_notes.py.
 *
 * @throws {Error} If the note name is malformed.
 */
export function parseNote(name: string): number {
  if (!name || name.length < 2) {
    throw new Error(`Invalid note name: "${name}"`);
  }

  let i = 0;
  const letter = name[i].toUpperCase();
  const base = NOTE_BASES[letter];
  if (base === undefined) {
    throw new Error(`Unknown note letter: "${letter}" in "${name}"`);
  }

  let semitone = base;
  i += 1;

  // Consume accidentals (# raises, b lowers; multiple allowed)
  while (i < name.length && (name[i] === "#" || name[i] === "b")) {
    if (name[i] === "#") {
      semitone += 1;
    } else {
      semitone -= 1;
    }
    i += 1;
  }

  const octave = parseInt(name.slice(i), 10);
  if (isNaN(octave)) {
    throw new Error(`Cannot parse octave in note name: "${name}"`);
  }

  // MIDI number: (octave + 1) * 12 + semitone
  const midi = (octave + 1) * 12 + semitone;
  return midi;
}

/**
 * Convert a note name to its frequency in Hz.
 * Uses 12-TET with A4 = 440 Hz.
 *
 *   freq = 440 * 2^((midi - 69) / 12)
 */
export function noteToFreq(name: string): number {
  const midi = parseNote(name);
  return 440.0 * Math.pow(2.0, (midi - 69) / 12.0);
}

/**
 * Returns true if the given note name is a "black key" (has sharp or flat).
 */
export function isBlackKey(name: string): boolean {
  return name.includes("#") || name.includes("b");
}

// ---------------------------------------------------------------------------
// Single-note duplication rule
// ---------------------------------------------------------------------------

/**
 * Given a column selection that may have only one note, produce a proper
 * NotePair. If only one note is provided the same note fills both slots.
 */
export function toNotePair(notes: NoteName[]): NotePair {
  if (notes.length === 0) {
    throw new Error("At least one note is required to form a NotePair");
  }
  if (notes.length === 1) {
    return [notes[0], notes[0]];
  }
  return [notes[0], notes[1]];
}

// ---------------------------------------------------------------------------
// Pipeline JSON format (matches generate_notes.py input)
// ---------------------------------------------------------------------------

/**
 * Convert a FluteDesign to the pipeline JSON format: a plain array of
 * [upper, lower] string pairs, ready to be consumed by generate_notes.py.
 */
export function toPipelineJSON(design: FluteDesign): NotePair[] {
  return design.pairs.map(([upper, lower]) => [upper, lower]);
}

/**
 * Create a FluteDesign from the pipeline JSON format (array of pairs)
 * and an optional nameplate string.
 */
export function fromPipelineJSON(
  pairs: NotePair[],
  nameplate: string = ""
): FluteDesign {
  return { pairs, nameplate };
}

// ---------------------------------------------------------------------------
// URL hash serialization
// ---------------------------------------------------------------------------

/**
 * Serialize a FluteDesign to a URL-safe hash string (base64-encoded JSON).
 * The result does NOT include the leading '#'.
 */
export function serializeToHash(design: FluteDesign): string {
  const json = JSON.stringify(design);
  // btoa works on ASCII; we URI-encode first to handle any non-ASCII in nameplate
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return encoded;
}

/**
 * Deserialize a FluteDesign from a URL hash string (base64-encoded JSON).
 * Accepts the string with or without a leading '#'.
 *
 * Returns null if the hash is empty or cannot be decoded.
 */
export function deserializeFromHash(hash: string): FluteDesign | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;

  try {
    const json = decodeURIComponent(escape(atob(raw)));
    const obj = JSON.parse(json);

    // Validate minimal shape
    if (!obj || !Array.isArray(obj.pairs)) {
      return null;
    }

    return {
      pairs: obj.pairs as NotePair[],
      nameplate: typeof obj.nameplate === "string" ? obj.nameplate : "",
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Convenience: default empty design
// ---------------------------------------------------------------------------

export function emptyDesign(): FluteDesign {
  return { pairs: [], nameplate: "" };
}
