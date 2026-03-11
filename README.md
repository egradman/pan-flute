# Pan Flute

This was vibe-coded by me and my son Dash. It was a silly and fun idea, but one I would have discarded as "too complicated" until code became cheap and easy.

The key insight: **the same agentic coding tools we use to summon code into existence can be used to summon physical objects into existence.** OpenSCAD is a programmatic CAD tool — geometry defined as code — which makes it a perfect target for AI-assisted generation. We used Claude Code to write Python that generates OpenSCAD, turning a JSON list of musical notes into a 3D-printable object with acoustically correct tube lengths, engraved labels, and structural supports. No manual CAD work required beyond the initial mouthpiece design.

A parametric, 3D-printable two-tone pan flute generator. Define a song as JSON note pairs, and the toolchain produces a ready-to-print STL with acoustically tuned bore lengths, an engraved nameplate, and note labels on every tube.

## How It Works

Each column of the flute has **two tubes** that share a single mouthpiece. The airway is designed to route your breath into both tubes simultaneously, producing a **chord**. The tube lengths are calculated from the target frequencies using quarter-wave resonance, so the flute is (in theory) in tune right off the print bed.

### The Base Geometry

The sounding board / mouthpiece was modelled in **Rhino3D** and exported as STL. This is the part that's hard to parametrize — the airway geometry, blow edge, and air escape holes all need to be just right for the flute to actually produce sound. Two base variants exist:

| File | Description |
|------|-------------|
| `box-base.stl` | Dual rectangular-bore base with integrated air escape holes (7×7.75mm bores) |
| `pan_tube.stl` | **(deprecated)** Earlier single round-bore attempt — kept for reference |

Everything above the base — the tube extensions that determine pitch — is generated parametrically.

### The Pipeline

```
song.json ──→ Python ──→ OpenSCAD (.scad) ──→ STL
                              ↑
                         base STL from Rhino
```

Python reads your song file, calculates the extension length each tube needs to hit its target frequency, and writes out OpenSCAD code that imports the Rhino base and adds the right amount of tube on top.

## Song Format (JSON)

A song is a JSON array of note pairs. Each pair becomes one column on the flute:

```json
[
  ["C6", "E6"],
  ["G5", "B5"],
  ["E5", "G#5"],
  ["A5", "C#6"],
  ["B5", "D#6"],
  ["Bb5", "D6"],
  ["A5", "C#6"]
]
```

Each element is a two-element array: `[note_A, note_B]`. The two notes in a pair sound simultaneously as a chord when you blow into that column.

**Note name format:** `<letter><accidental?><octave>`

- **Letter:** `A` through `G`
- **Accidental (optional):** `#` (sharp) or `b` (flat)
- **Octave:** integer (pan flutes typically live in the `5`–`7` range)

Examples: `C6`, `F#5`, `Bb4`, `G#7`

See `mario.json` for a 7-column Super Mario Bros. theme, or `notes.json` for a simple diatonic scale.

## Usage

### Box-base variant (recommended)

```bash
# Generates flute.scad and renders in one step
python3 generate_flute.py mario.json MARIO
openscad -o mario.stl flute.scad
```

### Pan-tube variant (deprecated)

```bash
# 1. Generate the notes include file
python3 generate_notes.py mario.json

# 2. Render the STL (nameplate text is configurable)
openscad -D 'nameplate_text="MARIO"' -o mario.stl pan_flute.scad
```

## The Acoustic Math

Tube lengths are calculated using quarter-wave resonance for a closed-open pipe:

```
extension = speed_of_sound / (4 × freq) − end_correction − base_resonating_length
```

Where:
- **Speed of sound** = 343,000 mm/s (at ~20°C)
- **End correction** = `0.82 × bore_diameter` — accounts for the antinode extending slightly past the open end
- **Base resonating length** — the bore length already present in the imported STL (19.77mm for pan-tube, 7mm for box-base)

The `0.82` end-correction factor is empirical. If your prints are consistently sharp or flat, this is the knob to turn.

## Project Structure

```
├── pan_tube.stl          # Rhino3D base — round bore sounding board
├── box-base.stl          # Rhino3D base — rectangular dual-bore
├── pan_flute.scad        # Parametric OpenSCAD model (pan-tube variant)
├── generate_notes.py     # JSON → notes.scad (frequency arrays for pan_flute.scad)
├── generate_flute.py     # JSON → flute.scad (self-contained box-base variant)
├── notes.scad            # Generated include file (frequencies + note names)
├── flute.scad            # Generated OpenSCAD (box-base variant)
├── mario.json            # Example song: Super Mario Bros. theme
└── notes.json            # Example song: C major diatonic scale
```

## Tweaking

Key constants to adjust if things don't sound right:

| Constant | Pan-tube | Box-base | What it does |
|----------|----------|----------|-------------|
| `end_correction_factor` | 0.82 | 0.82 | Raise to sharpen, lower to flatten |
| `tube_id` / `BORE_W` | 7.022mm | 7.0mm | Bore diameter — affects end correction |
| `obj_resonating_length` / `BASE_RESONATING` | 19.768mm | 7.0mm | Must match your actual STL |
| `speed_of_sound` | 343000 | 343000 | Varies with temperature (~+0.6 m/s per °C) |
