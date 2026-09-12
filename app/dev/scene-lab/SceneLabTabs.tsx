"use client";

// page.tsx is a Server Component (reads content/ off disk), so the tab
// switch itself — the only stateful part — lives in this small client
// component instead, same split ScenePlayerClient.tsx uses for onExit.
import { useState } from "react";

type Tab = "scene" | "rig";

export function SceneLabTabs({ scenePreview, rigInspector }: { scenePreview: React.ReactNode; rigInspector: React.ReactNode }) {
  const [tab, setTab] = useState<Tab>("scene");

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          className={`px-3 py-1 rounded border text-sm ${tab === "scene" ? "bg-neutral-800 text-white" : ""}`}
          onClick={() => setTab("scene")}
        >
          Scene preview
        </button>
        <button
          type="button"
          className={`px-3 py-1 rounded border text-sm ${tab === "rig" ? "bg-neutral-800 text-white" : ""}`}
          onClick={() => setTab("rig")}
        >
          Rig inspector
        </button>
      </div>
      {/* Conditionally rendered, not just CSS-hidden: each tab mounts a
          real Pixi Application, and a `display:none` tree still runs its
          effects/ticker underneath — two live WebGL contexts and two
          polling loops for one visible tab. Unmounting the inactive one
          costs losing its scrub position on switch, an acceptable trade
          for a dev tool. */}
      {tab === "scene" && scenePreview}
      {tab === "rig" && rigInspector}
    </div>
  );
}
