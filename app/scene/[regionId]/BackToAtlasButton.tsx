"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTransitionStore } from "@/engine/transition/transitionStore";
import styles from "@/engine/scene/ScenePlayer.module.css";

// Reverses the M3 cloud sweep back to /atlas — same requestSweep() path
// AtlasMap's province click uses, same choreography either direction
// (PRD §8.2: "reuseable in both directions" — there's no reason for a
// mirrored animation, both directions need full occlusion before the
// DOM swaps regardless of which way it's going).
//
// Styled with the scene player's own pill-button class (not a Tailwind
// site-chrome pill) because its only caller, NotYetWritten, lives inside
// the same dark cinematic shell the real player renders into.
export function BackToAtlasButton() {
  const router = useRouter();
  const requestSweep = useTransitionStore((s) => s.requestSweep);

  useEffect(() => {
    router.prefetch("/atlas");
  }, [router]);

  return (
    <button type="button" onClick={() => requestSweep(() => router.push("/atlas"))} className={styles.autoplayButton}>
      ← Return to the map
    </button>
  );
}
