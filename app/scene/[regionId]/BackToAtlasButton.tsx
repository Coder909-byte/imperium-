"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTransitionStore } from "@/engine/transition/transitionStore";

// Reverses the M3 cloud sweep back to /atlas — same requestSweep() path
// AtlasMap's province click uses, same choreography either direction
// (PRD §8.2: "reuseable in both directions" — there's no reason for a
// mirrored animation, both directions need full occlusion before the
// DOM swaps regardless of which way it's going).
export function BackToAtlasButton() {
  const router = useRouter();
  const requestSweep = useTransitionStore((s) => s.requestSweep);

  useEffect(() => {
    router.prefetch("/atlas");
  }, [router]);

  return (
    <button
      type="button"
      onClick={() => requestSweep(() => router.push("/atlas"))}
      className="rounded-full border border-black/[.15] px-5 py-3 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-[#1a1a1a]"
    >
      ← Return to the map
    </button>
  );
}
