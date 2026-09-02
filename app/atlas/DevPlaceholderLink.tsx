"use client";

// TEMPORARY — remove at M8. Only 2 of 24 provinces have authored
// content/regions/ (gallia, and this one doesn't even correspond to a
// province — placeholder.json is the M4 engine-test region), so it has
// no polygon on the map and no other way to reach it by clicking. This
// makes it reachable behind /atlas?dev=1 for testing the scene engine
// without typing the URL. Once every held province has real content
// this affordance (and the ?dev=1 branch) should come out entirely.
import { useRouter, useSearchParams } from "next/navigation";
import { useTransitionStore } from "@/engine/transition/transitionStore";

export function DevPlaceholderLink() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestSweep = useTransitionStore((s) => s.requestSweep);

  if (searchParams.get("dev") !== "1") return null;

  return (
    <button
      type="button"
      onClick={() => requestSweep(() => router.push("/scene/placeholder"))}
      className="fixed bottom-4 right-4 z-50 rounded border border-dashed border-amber-500 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 shadow-sm hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-200"
    >
      DEV — open placeholder scene (temporary, remove at M8)
    </button>
  );
}
