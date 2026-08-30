// Cross-tree trigger for the cloud sweep. CloudSweep lives once in the
// root layout so it survives the actual atlas<->scene DOM swap; the
// click that starts a sweep happens deep inside whichever page is
// currently mounted (AtlasMap, or the scene's back button). Zustand is
// the stated answer for exactly this kind of state (CLAUDE.md) — a
// plain module singleton that both sides can reach without threading a
// prop or a Context through the App Router's page boundary.
//
// No React, no content imports.
import { create } from "zustand";

export interface SweepRequest {
  id: number;
  /** Performs the actual navigation. Called once, at full occlusion. */
  navigate: () => void;
}

interface TransitionState {
  request: SweepRequest | null;
}

interface TransitionActions {
  /** Queues a sweep-covered navigation. Safe to call again before a
   *  prior request has finished — CloudSweep is responsible for
   *  interrupting whatever's in flight, not this store. */
  requestSweep: (navigate: () => void) => void;
}

let nextRequestId = 1;

export const useTransitionStore = create<TransitionState & TransitionActions>((set) => ({
  request: null,
  requestSweep: (navigate) => set({ request: { id: nextRequestId++, navigate } }),
}));
