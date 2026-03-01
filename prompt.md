we're making an OpenSCAD system to create custom pan flutes from two-tone note sequences.  A pan flute is consists of columns, which correspond to the X axis, and
  exactly two rows, which correspond to notes that will sound simultaneously (chords).  a single "tube" consists of an imported OBJ file (the complicated sounding
  board) and a "capped tube extension" which resonates in the required frequency.  there will be Nx2 tubes.  For a single chord, the two tube assemblies point in
  opposite directions (one points "up" and one points "down").  we need constants for the tube inner diameter, tube outer diameter, tube center spacing, displacement
  to where the tube extension starts.  the tube sounding OBJ is in this directory.  The input to the script will be a sequence of note pairs (JSON) of unbounded
  length.
