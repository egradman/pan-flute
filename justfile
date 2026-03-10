default_input := "mario.json"

build input=default_input:
    #!/bin/bash
    set -euo pipefail
    base="$(basename "{{input}}" .json)"
    echo "==> Generating flute.scad from {{input}}"
    python3 generate_flute.py "{{input}}"
    echo "==> Rendering ${base}.stl"
    openscad -o "${base}.stl" flute.scad
    echo "==> Done: ${base}.stl"
    scp "${base}.stl" air:/tmp/
    echo "==> Copied to air:/tmp/${base}.stl"

preview input=default_input:
    #!/bin/bash
    set -euo pipefail
    echo "==> Generating flute.scad from {{input}}"
    python3 generate_flute.py "{{input}}"
    echo "==> Opening in OpenSCAD"
    openscad flute.scad &
