// Ornate double border, corner rules, and a title cartouche with a
// vector-drawn aquila — static decoration, no raster assets.
import styles from "./AtlasMap.module.css";

interface AtlasFrameProps {
  width: number;
  height: number;
  eraLabel: string;
  title?: string;
}

const INK = "#3a2510";

function CornerRule({ x, y, rotation }: { x: number; y: number; rotation: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation})`} stroke={INK} fill="none" strokeWidth={1.5}>
      <path d="M 0,22 Q 0,0 22,0" />
      <path d="M 6,26 L 6,10 M 6,10 L 22,10" strokeWidth={1} />
      <circle cx={4} cy={4} r={2.5} fill={INK} stroke="none" />
    </g>
  );
}

function Aquila({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale}) translate(-50 -32)`} fill={INK}>
      <path
        d="M 50,8 C 39,8 24,17 13,30 C 21,26 30,25 37,27
           C 30,32 21,37 10,41 C 23,41 34,38 41,34
           C 43,41 46,49 50,57 C 54,49 57,41 59,34
           C 66,38 77,41 90,41 C 79,37 70,32 63,27
           C 70,25 79,26 87,30 C 76,17 61,8 50,8 Z"
      />
    </g>
  );
}

export function AtlasFrame({ width, height, eraLabel, title = "IMPERIVM ROMANVM" }: AtlasFrameProps) {
  const cx = width / 2;
  const inset = 14;

  return (
    <g pointerEvents="none">
      <rect x={inset} y={inset} width={width - inset * 2} height={height - inset * 2} fill="none" stroke={INK} strokeWidth={4} />
      <rect x={inset + 8} y={inset + 8} width={width - (inset + 8) * 2} height={height - (inset + 8) * 2} fill="none" stroke={INK} strokeWidth={1} />

      <CornerRule x={inset} y={inset} rotation={0} />
      <CornerRule x={width - inset} y={inset} rotation={90} />
      <CornerRule x={width - inset} y={height - inset} rotation={180} />
      <CornerRule x={inset} y={height - inset} rotation={270} />

      {/* Title cartouche — a banner with pointed ends, top-centre */}
      <path
        d={`M ${cx - 150},28 L ${cx - 128},14 L ${cx + 128},14 L ${cx + 150},28
            L ${cx + 150},58 L ${cx + 128},72 L ${cx - 128},72 L ${cx - 150},58 Z`}
        fill="#e2c98f"
        stroke={INK}
        strokeWidth={2}
      />
      <text x={cx} y={32} textAnchor="middle" className={styles.cartoucheTitle}>
        {title}
      </text>
      <Aquila cx={cx} cy={48} scale={0.22} />
      <text x={cx} y={65} textAnchor="middle" className={styles.eraLabel}>
        {eraLabel}
      </text>
    </g>
  );
}
