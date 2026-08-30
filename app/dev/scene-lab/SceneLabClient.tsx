"use client";

// Polls app/api/dev/region-content (which re-reads+re-validates from
// disk on every request) once a second and remounts ScenePlayer
// whenever the content actually changed — simple, robust hot reload for
// a dev-only tool, not true HMR. Reuses the exact adaptation function
// the real /scene/[regionId] route uses, so this exercises the same
// rendering path a real region gets, not a parallel mock of it.
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { buildSceneProps } from "@/app/scene/[regionId]/buildSceneProps";
import type { Region } from "@/content/schema";
import type { SceneRegion } from "@/engine/scene/types";

// Same ssr:false as the real /scene/[regionId] route (ScenePlayerClient.tsx)
// — region starts null here regardless, so this route never actually hit
// the SSR crash that made ssr:false load-bearing there, but keeping Pixi
// out of this route's server bundle too is free and consistent.
const ScenePlayer = dynamic(() => import("@/engine/scene/ScenePlayer").then((mod) => mod.ScenePlayer), { ssr: false });

const POLL_MS = 1000;

interface RegionContentResponse {
  ok: boolean;
  data?: Region;
  error?: string;
}

export function SceneLabClient({ regionIds, initialRegionId }: { regionIds: string[]; initialRegionId?: string }) {
  const [regionId, setRegionId] = useState(initialRegionId ?? regionIds[0] ?? "");
  const [region, setRegion] = useState<SceneRegion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const lastRawRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Reset the dedupe key, not the displayed region/error — the
    // previous region stays on screen (a dev tool, not a router) until
    // the first poll for the newly-selected one resolves, which
    // sidesteps a synchronous setState-in-effect for no real benefit.
    lastRawRef.current = null;

    async function poll() {
      let body: RegionContentResponse;
      try {
        const res = await fetch(`/api/dev/region-content?id=${encodeURIComponent(regionId)}`, { cache: "no-store" });
        body = (await res.json()) as RegionContentResponse;
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
        return;
      }
      if (cancelled) return;

      if (!body.ok || !body.data) {
        setError(body.error ?? "unknown error");
        return;
      }
      const raw = JSON.stringify(body.data);
      if (raw === lastRawRef.current) return;
      lastRawRef.current = raw;
      setRegion(buildSceneProps(body.data));
      setError(null);
      setVersion((v) => v + 1);
    }

    void poll();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [regionId]);

  return (
    <div>
      <label className="text-sm">
        Region:{" "}
        <select className="border rounded px-2 py-1" value={regionId} onChange={(event) => setRegionId(event.target.value)}>
          {regionIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-neutral-500 mt-1 mb-4">
        Polling content/regions/{regionId}.json every second — edit and save to hot-reload.
      </p>
      {error && <p className="text-sm text-red-600 mb-4">Error: {error}</p>}
      {region && <ScenePlayer key={`${regionId}-${version}`} region={region} onExit={() => {}} />}
    </div>
  );
}
