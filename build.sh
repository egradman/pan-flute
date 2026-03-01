#!/bin/bash
set -euo pipefail

INPUT="${1:?Usage: $0 notes.json}"
BASE="$(basename "$INPUT" .json)"
DIR="$(dirname "$INPUT")"

echo "==> Generating notes.scad from $INPUT"
python3 "$DIR/generate_notes.py" "$INPUT"

echo "==> Rendering $BASE.stl"
openscad -o "$DIR/$BASE.stl" "$DIR/pan_flute.scad"

echo "==> Done: $DIR/$BASE.stl"
