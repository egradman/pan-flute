default_input := "mario.json"

build input=default_input:
    #!/bin/bash
    set -euo pipefail
    base="$(basename "{{input}}" .json)"
    echo "==> Generating notes.scad from {{input}}"
    python3 generate_notes.py "{{input}}"
    echo "==> Rendering ${base}.stl"
    openscad -o "${base}.stl" pan_flute.scad
    echo "==> Done: ${base}.stl"
    scp "${base}.stl" air:/tmp/
    echo "==> Copied to air:/tmp/${base}.stl"
