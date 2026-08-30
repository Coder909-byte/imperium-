"use client";

// Thin routing glue: page.tsx is a Server Component (can't use hooks),
// so this is where `onExit` gets wired to the M3 sweep — same
// requestSweep()-then-push() pattern BackToAtlasButton already uses.
// ScenePlayer itself stays routing-agnostic (PRD generality goal).
//
// ssr:false is load-bearing, not just a bundle optimisation: Pixi has
// no meaningful server-rendered output (there's no canvas on the
// server), and server-rendering it anyway hit a real
// "Missing getServerSnapshot" crash from BeatDirector's
// useSyncExternalStore — confirmed via a real production build +
// `next start`, not assumed. Skipping SSR here is the actual fix, and
// it also keeps Pixi out of any server-side bundle entirely. Separately
// verified (see CLAUDE.md M4 entry) that this route's *client* bundle
// doesn't leak into the atlas route either.
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTransitionStore } from "@/engine/transition/transitionStore";
import type { SceneRegion } from "@/engine/scene/types";
import styles from "@/engine/scene/ScenePlayer.module.css";

const ScenePlayer = dynamic(() => import("@/engine/scene/ScenePlayer").then((mod) => mod.ScenePlayer), {
  ssr: false,
  // Same aspect-ratio box the real player renders into — avoids a
  // layout shift between this and the mounted player.
  loading: () => <div className={styles.player} />,
});

export function ScenePlayerClient({ region }: { region: SceneRegion }) {
  const router = useRouter();
  const requestSweep = useTransitionStore((s) => s.requestSweep);

  return <ScenePlayer region={region} onExit={() => requestSweep(() => router.push("/atlas"))} />;
}
