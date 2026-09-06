"use client";

// Polls app/api/dev/region-content (which re-reads+re-validates from
// disk on every request) once a second and remounts ScenePlayer
// whenever the content actually changed — simple, robust hot reload for
// a dev-only tool, not true HMR. Reuses the exact adaptation function
// the real /scene/[regionId] route uses, so this exercises the same
// rendering path a real region gets, not a parallel mock of it.
//
// M5 adds three preview-only overrides (never available on the real
// /scene/[regionId] route): device tier (pinned — disables the runtime
// auto-downgrade so a chosen tier can be held and watched), LUT preset
// (hot-swapped live, no remount — see ScenePlayer's forcedLut effect),
// and the post chain's whole-chain on/off switch (for the chain-on vs
// chain-off comparison). Tier and chain-on/off both change what
// SceneEffects builds at construction time, so those two remount via
// `key`; LUT doesn't need to.
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { buildSceneProps } from "@/app/scene/[regionId]/buildSceneProps";
import type { Region } from "@/content/schema";
import type { DeviceTier } from "@/engine/scene/deviceTier";
import { LUT_PRESETS } from "@/engine/scene/post/lut";
import type { SceneRegion } from "@/engine/scene/types";

type TierOverride = "auto" | DeviceTier;
type LutOverride = "auto" | string;
type ChainOverride = "on" | "off";

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
  const [tierOverride, setTierOverride] = useState<TierOverride>("auto");
  const [lutOverride, setLutOverride] = useState<LutOverride>("auto");
  const [chainOverride, setChainOverride] = useState<ChainOverride>("on");
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
      </label>{" "}
      <label className="text-sm">
        Tier:{" "}
        <select
          className="border rounded px-2 py-1"
          value={tierOverride}
          onChange={(event) => setTierOverride(event.target.value as TierOverride)}
        >
          <option value="auto">Auto (heuristic + runtime monitor)</option>
          <option value="high">Force high (pinned)</option>
          <option value="low">Force low (pinned)</option>
        </select>
      </label>{" "}
      <label className="text-sm">
        LUT:{" "}
        <select className="border rounded px-2 py-1" value={lutOverride} onChange={(event) => setLutOverride(event.target.value)}>
          <option value="auto">Auto (region&apos;s authored lut)</option>
          {Object.entries(LUT_PRESETS).map(([key, preset]) => (
            <option key={key} value={key}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>{" "}
      <label className="text-sm">
        Post chain:{" "}
        <select
          className="border rounded px-2 py-1"
          value={chainOverride}
          onChange={(event) => setChainOverride(event.target.value as ChainOverride)}
        >
          <option value="on">On</option>
          <option value="off">Off (for a chain-on/chain-off comparison)</option>
        </select>
      </label>
      <p className="text-xs text-neutral-500 mt-1 mb-4">
        Polling content/regions/{regionId}.json every second — edit and save to hot-reload. Changing tier or the post
        chain remounts the engine; LUT swaps live.
      </p>
      {error && <p className="text-sm text-red-600 mb-4">Error: {error}</p>}
      {region && (
        <ScenePlayer
          key={`${regionId}-${version}-${tierOverride}-${chainOverride}`}
          region={region}
          onExit={() => {}}
          forcedTier={tierOverride === "auto" ? undefined : tierOverride}
          forcedLut={lutOverride === "auto" ? undefined : lutOverride}
          forcedChainEnabled={chainOverride === "off" ? false : undefined}
        />
      )}
    </div>
  );
}
