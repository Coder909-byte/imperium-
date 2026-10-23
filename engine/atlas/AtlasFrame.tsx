import type { RefObject } from "react";
import styles from "./AtlasMap.module.css";

interface AtlasFrameProps {
  width: number; height: number; eraLabel: string; title?: string;
  eraLabelRef?: RefObject<SVGTextElement | null>;
}
const INK = "#725a39";

function CornerRule({ x, y, rotation }: { x: number; y: number; rotation: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation})`} stroke={INK} fill="none" strokeWidth={.8}>
      <path d="M0 40V0H40M5 32V5H32M11 25V11H25M0 15H15V0" />
      <path d="M17 17Q28 19 26 30Q17 28 17 17ZM17 17Q19 28 30 26" />
      <circle cx={8} cy={8} r={1.8} fill={INK} stroke="none" />
    </g>
  );
}

function WindRose({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={INK} strokeWidth={.6} fill="none" opacity={.85}>
      <circle r={27} /><circle r={22} /><circle r={3} fill={INK} />
      <path d="M0-40 6-6 40 0 6 6 0 40-6 6-40 0-6-6ZM-23-23 0-9 23-23 9 0 23 23 0 9-23 23-9 0Z" />
      <path d="M0-40V0L6-6ZM40 0H0L6 6ZM0 40V0L-6 6ZM-40 0H0L-6-6Z" fill={INK} />
      <text y={-45} textAnchor="middle" className={styles.compassLabel}>N</text>
      <text y={51} textAnchor="middle" className={styles.compassLabel}>S</text>
      <text x={-48} y={3} textAnchor="middle" className={styles.compassLabel}>W</text>
      <text x={48} y={3} textAnchor="middle" className={styles.compassLabel}>E</text>
    </g>
  );
}

export function AtlasFrame({ width, height, eraLabel, title = "IMPERIVM ROMANVM", eraLabelRef }: AtlasFrameProps) {
  const cx = width / 2, inset = 14;
  return (
    <g pointerEvents="none">
      <rect x={inset} y={inset} width={width - inset * 2} height={height - inset * 2} fill="none" stroke={INK} strokeWidth={1.5} />
      <rect x={inset + 6} y={inset + 6} width={width - (inset + 6) * 2} height={height - (inset + 6) * 2} fill="none" stroke={INK} strokeWidth={.5} />
      <CornerRule x={inset} y={inset} rotation={0} /><CornerRule x={width - inset} y={inset} rotation={90} />
      <CornerRule x={width - inset} y={height - inset} rotation={180} /><CornerRule x={inset} y={height - inset} rotation={270} />
      <path d={`M${cx - 142} 14H${cx + 142}V65H${cx - 142}ZM${cx - 136} 20H${cx + 136}V59H${cx - 136}Z`} fill="#eee5cf" fillRule="evenodd" stroke={INK} strokeWidth={.8} />
      <rect x={cx - 135} y={21} width={270} height={37} fill="#eee5cf" opacity={.94} />
      <text x={cx} y={37} textAnchor="middle" className={styles.cartoucheTitle}>{title}</text>
      <text ref={eraLabelRef} x={cx} y={53} textAnchor="middle" className={styles.eraLabel}>{eraLabel}</text>
      <WindRose x={90} y={height - 100} />
      <path d={`M${cx - 55} ${height - 34}H${cx + 55}`} stroke={INK} strokeWidth={.5} />
      <text x={cx} y={height - 23} textAnchor="middle" className={styles.imprint}>IMPERIUM · HISTORICAL ATLAS</text>
    </g>
  );
}
