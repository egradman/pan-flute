"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { FluteDesign } from "@/lib/notes";
import { noteToFreq } from "@/lib/notes";

// ---------------------------------------------------------------------------
// Physical constants from pan_flute.scad
// ---------------------------------------------------------------------------
const TUBE_ID = 7.022; // inner diameter mm
const TUBE_OD = 9.994; // outer diameter mm
const TUBE_SPACING = 8.5; // center-to-center mm
const OBJ_TOTAL_LENGTH = 34.766; // total tube length mm
const OBJ_RESONATING_LENGTH = 19.768; // resonating portion mm
const SPEED_OF_SOUND = 343000; // mm/s
const END_CORRECTION_FACTOR = 0.82;
const ROW_OFFSET = TUBE_OD / 2 - 0.75;

/** Scale factor: divide mm by this to get scene units. */
const SCALE = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute total tube length in mm for a given note. */
function tubeLength(noteName: string): number {
  const freq = noteToFreq(noteName);
  const extension =
    SPEED_OF_SOUND / (4 * freq) -
    END_CORRECTION_FACTOR * TUBE_ID -
    OBJ_RESONATING_LENGTH;
  return OBJ_TOTAL_LENGTH + Math.max(0, extension);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface TubeProps {
  x: number;
  y: number;
  length: number;
}

/** A single cylindrical tube, standing upright along Y. */
function Tube({ x, y, length }: TubeProps) {
  const scaledLength = length / SCALE;
  const scaledOD = TUBE_OD / SCALE;

  return (
    <mesh position={[x, scaledLength / 2, y]}>
      <cylinderGeometry args={[scaledOD / 2, scaledOD / 2, scaledLength, 16]} />
      <meshStandardMaterial color="#c4915e" roughness={0.7} metalness={0.05} />
    </mesh>
  );
}

/** Small gap-fill cylinder between two adjacent columns at a given row. */
function GapFill({
  x1,
  x2,
  y,
  height,
}: {
  x1: number;
  x2: number;
  y: number;
  height: number;
}) {
  const midX = (x1 + x2) / 2;
  const scaledHeight = height / SCALE;
  const gapWidth = (TUBE_SPACING - TUBE_OD) / SCALE;

  if (gapWidth <= 0) return null;

  return (
    <mesh position={[midX, scaledHeight / 2, y]}>
      <boxGeometry
        args={[gapWidth, scaledHeight, (TUBE_OD * 0.6) / SCALE]}
      />
      <meshStandardMaterial color="#b07d4a" roughness={0.8} metalness={0.02} />
    </mesh>
  );
}

/** Simple sounding board — a thin box spanning the full width at the top. */
function SoundingBoard({
  width,
  y,
  boardHeight,
}: {
  width: number;
  y: number;
  boardHeight: number;
}) {
  const scaledBoardHeight = boardHeight / SCALE;
  const thickness = 2 / SCALE; // 2mm thick

  return (
    <mesh position={[0, scaledBoardHeight / 2, y]}>
      <boxGeometry args={[width, scaledBoardHeight, thickness]} />
      <meshStandardMaterial
        color="#a06830"
        roughness={0.9}
        metalness={0.0}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Scene contents
// ---------------------------------------------------------------------------

function FluteScene({ design }: { design: FluteDesign }) {
  const { tubes, gapFills, boards, centerOffset } = useMemo(() => {
    const numCols = design.pairs.length;
    if (numCols === 0) return { tubes: [], gapFills: [], boards: [], centerOffset: 0 };

    const scaledSpacing = TUBE_SPACING / SCALE;
    const totalWidth = (numCols - 1) * scaledSpacing;
    const offset = totalWidth / 2;

    const upperY = ROW_OFFSET / SCALE;
    const lowerY = -ROW_OFFSET / SCALE;

    const tubeData: TubeProps[] = [];
    const gapData: { x1: number; x2: number; y: number; height: number }[] = [];

    // Compute tube lengths for sounding board height
    let maxUpperLen = 0;
    let maxLowerLen = 0;

    for (let i = 0; i < numCols; i++) {
      const [upperNote, lowerNote] = design.pairs[i];
      const upperLen = tubeLength(upperNote);
      const lowerLen = tubeLength(lowerNote);

      if (upperLen > maxUpperLen) maxUpperLen = upperLen;
      if (lowerLen > maxLowerLen) maxLowerLen = lowerLen;

      const x = i * scaledSpacing - offset;

      tubeData.push({ x, y: upperY, length: upperLen });
      tubeData.push({ x, y: lowerY, length: lowerLen });

      // Gap fills between adjacent columns
      if (i < numCols - 1) {
        const nextUpperLen = tubeLength(design.pairs[i + 1][0]);
        const nextLowerLen = tubeLength(design.pairs[i + 1][1]);
        const nextX = (i + 1) * scaledSpacing - offset;

        const upperGapH = Math.min(upperLen, nextUpperLen);
        const lowerGapH = Math.min(lowerLen, nextLowerLen);

        gapData.push({ x1: x, x2: nextX, y: upperY, height: upperGapH });
        gapData.push({ x1: x, x2: nextX, y: lowerY, height: lowerGapH });
      }
    }

    // Sounding boards: thin panels at front and back of each row
    const boardWidth = totalWidth + (TUBE_OD / SCALE);
    const boardsData = [
      { width: boardWidth, y: upperY, boardHeight: OBJ_RESONATING_LENGTH },
      { width: boardWidth, y: lowerY, boardHeight: OBJ_RESONATING_LENGTH },
    ];

    return {
      tubes: tubeData,
      gapFills: gapData,
      boards: boardsData,
      centerOffset: offset,
    };
  }, [design]);

  return (
    <group>
      {tubes.map((t, i) => (
        <Tube key={`tube-${i}`} x={t.x} y={t.y} length={t.length} />
      ))}
      {gapFills.map((g, i) => (
        <GapFill
          key={`gap-${i}`}
          x1={g.x1}
          x2={g.x2}
          y={g.y}
          height={g.height}
        />
      ))}
      {boards.map((b, i) => (
        <SoundingBoard
          key={`board-${i}`}
          width={b.width}
          y={b.y}
          boardHeight={b.boardHeight}
        />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Exported component
// ---------------------------------------------------------------------------

interface FlutePreviewProps {
  design: FluteDesign;
}

export default function FlutePreview({ design }: FlutePreviewProps) {
  if (design.pairs.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <div
        className="w-full h-64 sm:h-96 rounded-xl border border-bamboo-200 bg-gradient-to-b from-bamboo-50 to-white shadow-sm overflow-hidden"
      >
        <Canvas
          camera={{ position: [0, 8, 16], fov: 45 }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 10, 7]} intensity={0.8} />
          <directionalLight position={[-3, 5, -5]} intensity={0.3} />
          <FluteScene design={design} />
          <OrbitControls
            makeDefault
            enablePan
            enableZoom
            enableRotate
            minDistance={3}
            maxDistance={40}
          />
        </Canvas>
      </div>
      <p className="mt-2 text-center text-xs text-bamboo-500 italic">
        Preview is approximate. Final STL may differ slightly.
      </p>
    </div>
  );
}
