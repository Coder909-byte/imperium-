"use client";

// PRD appendix / CLAUDE.md M6 scope: "authoring rigs blind is miserable
// and this pays for itself immediately." A standalone canvas — rig
// only, no scene/planes/effects around it, isolating the puppet the way
// that scope bullet asks for — with rig/clip pickers, a scrub slider,
// and a pivot/part-bounds overlay drawn from the SAME world transforms
// PuppetActor already computed for rendering (PuppetActor.
// getWorldTransforms()), not a second, possibly-diverging calculation.
//
// Same hot-reload shape as SceneLabClient: polls app/api/dev/rig-content
// once a second and only touches state when the rig's JSON actually
// changed, so editing content/rigs/*.json by hand updates the preview
// without a manual refresh.
import { useEffect, useMemo, useRef, useState } from "react";
import { Graphics } from "pixi.js";
import { adaptRig } from "@/app/scene/[regionId]/buildSceneProps";
import type { Rig } from "@/content/schema";
import { PuppetActor } from "@/engine/scene/layers/PuppetActor";
import { buildPartTextureCache } from "@/engine/scene/layers/puppetTextures";
import { loadRig } from "@/engine/scene/puppet/rigLoader";
import { lintRig, type RigLintIssue } from "@/engine/scene/puppet/rigValidation";
import { SceneRenderer } from "@/engine/scene/SceneRenderer";

const POLL_MS = 1000;
const OVERLAY_COLOR = 0x39d0ff;

interface RigContentResponse {
  ok: boolean;
  data?: Rig;
  error?: string;
}

function drawOverlay(actor: PuppetActor, graphics: Graphics): void {
  graphics.clear();
  const transforms = actor.getWorldTransforms();
  for (let i = 0; i < actor.rig.parts.length; i++) {
    const part = actor.rig.parts[i];
    const t = transforms[i];
    const cos = Math.cos(t.rotation);
    const sin = Math.sin(t.rotation);
    const [pivotX, pivotY] = part.pivot;
    const [w, h] = part.size;
    const localCorners: [number, number][] = [
      [-pivotX, -pivotY],
      [w - pivotX, -pivotY],
      [w - pivotX, h - pivotY],
      [-pivotX, h - pivotY],
    ];
    const worldCorners = localCorners.map(([cx, cy]): [number, number] => {
      const sx = cx * t.scaleX;
      const sy = cy * t.scaleY;
      return [t.x + sx * cos - sy * sin, t.y + sx * sin + sy * cos];
    });
    graphics.moveTo(worldCorners[0][0], worldCorners[0][1]);
    for (let c = 1; c < worldCorners.length; c++) graphics.lineTo(worldCorners[c][0], worldCorners[c][1]);
    graphics.closePath();
    graphics.stroke({ width: 1.5, color: OVERLAY_COLOR, alpha: 0.85 });

    graphics.circle(t.x, t.y, 3.5);
    graphics.fill({ color: OVERLAY_COLOR, alpha: 0.95 });
  }
}

export function RigInspectorClient({ rigIds }: { rigIds: string[] }) {
  const [rigId, setRigId] = useState(rigIds[0] ?? "");
  const [rig, setRig] = useState<Rig | null>(null);
  const [clipId, setClipId] = useState("");
  const [playing, setPlaying] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [scrub, setScrub] = useState(0); // 0..1 fraction of the clip's duration
  const [error, setError] = useState<string | null>(null);

  // Not stored as state derived via an effect (react-hooks/set-state-in-effect
  // flags "auto-correct clipId in an effect when it goes stale" as a
  // cascading-render antipattern) — computed straight from render inputs
  // instead, so a rig switch or a hand-edit that removes the selected
  // clip falls back to the first clip with no extra render pass.
  const effectiveClipId = rig?.clips.some((clip) => clip.id === clipId) ? clipId : (rig?.clips[0]?.id ?? "");
  const activeClip = rig?.clips.find((clip) => clip.id === effectiveClipId) ?? null;

  // Recomputed only when the rig's actual content changes (not per
  // frame, not per clip switch) — the same lint `npm run validate` runs
  // at build time, run live here so a bad edit shows up while authoring
  // instead of only at the next validate/CI run. adaptRig+loadRig can
  // throw on a momentarily-invalid hand edit (see rigLoader.ts's own
  // header comment on this exact hazard) — caught here rather than left
  // to crash the inspector mid-edit.
  const lintIssues = useMemo<RigLintIssue[]>(() => {
    if (!rig) return [];
    try {
      return lintRig(loadRig(adaptRig(rig)));
    } catch {
      return [];
    }
  }, [rig]);
  const currentClipIssues = lintIssues.filter((issue) => issue.clipId === effectiveClipId);
  const otherClipIssues = lintIssues.filter((issue) => issue.clipId !== effectiveClipId);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const actorRef = useRef<PuppetActor | null>(null);
  const overlayRef = useRef<Graphics | null>(null);
  const tickRef = useRef<(() => void) | null>(null);
  const lastRawRef = useRef<string | null>(null);
  // Effect-closure seams: the mount effect below builds its `tick`
  // callback once (when the rig loads) and must read the LATEST
  // playing/overlay/duration values every frame after that, not the
  // values captured when the closure was created. Refs are the standard
  // way to do that without rebuilding the whole Pixi app on every
  // checkbox toggle — kept current via their own effects below, not by
  // writing `.current` directly during render (react-hooks/refs).
  const playingRef = useRef(playing);
  const showOverlayRef = useRef(showOverlay);
  const activeClipDurationRef = useRef(0);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    showOverlayRef.current = showOverlay;
  }, [showOverlay]);
  useEffect(() => {
    activeClipDurationRef.current = activeClip?.durationMs ?? 0;
  }, [activeClip]);

  // Poll the selected rig's content/rigs/{id}.json.
  useEffect(() => {
    if (!rigId) return;
    let cancelled = false;
    lastRawRef.current = null;

    async function poll() {
      let body: RigContentResponse;
      try {
        const res = await fetch(`/api/dev/rig-content?id=${encodeURIComponent(rigId)}`, { cache: "no-store" });
        body = (await res.json()) as RigContentResponse;
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
      setRig(body.data);
      setError(null);
    }

    void poll();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [rigId]);

  // Mounts a bare Pixi canvas and (re)builds the PuppetActor whenever the
  // rig's content changes. Clip selection does NOT remount this — see
  // handleClipChange below — only the rig data itself does.
  useEffect(() => {
    const hostEl = containerRef.current;
    if (!hostEl || !rig) return;
    const renderer = new SceneRenderer(hostEl);
    let cancelled = false;

    void renderer.init().then(() => {
      if (cancelled || renderer.getStatus() !== "ready") return;
      const loaded = loadRig(adaptRig(rig));
      const textures = buildPartTextureCache(loaded);
      const stage = renderer.getStageSize();
      // Unlike ScenePlayer's Camera (which centres cameraContainer on the
      // stage as part of its own beat/drift math), this inspector never
      // constructs a Camera — cameraContainer starts at its Pixi default
      // (0,0), i.e. the canvas's top-left corner. Centre it by hand so
      // an actor placed at world (0,0) actually lands mid-canvas instead
      // of at the top-left edge with half the rig clipped off-screen.
      // The legionary rig's hip (root pivot) sits well above its own
      // vertical midpoint — torso+head extend ~170px above it, legs
      // ~127px below — so centring on the hip needs the origin placed
      // somewhat below canvas-centre, not at it, for the whole figure
      // (head included) to fit the visible height.
      renderer.cameraContainer.position.set(stage.width / 2, stage.height * 0.58);
      const initialClip = loaded.clips.has(effectiveClipId) ? effectiveClipId : (rig.clips[0]?.id ?? "idle");
      const actor = new PuppetActor({
        rig: loaded,
        textures,
        clipId: initialClip,
        x: 0,
        y: 0,
        scale: (Math.min(stage.width, stage.height) / 480) * 1.25,
        flip: false,
        phaseMs: 0,
      });
      renderer.cameraContainer.addChild(actor.container);
      actorRef.current = actor;

      const overlay = new Graphics();
      renderer.cameraContainer.addChild(overlay);
      overlayRef.current = overlay;

      const tick = () => {
        if (playingRef.current) {
          actor.tick(renderer.getTicker().deltaMS);
          const duration = activeClipDurationRef.current;
          if (duration > 0) setScrub((actor.getElapsedMs() % duration) / duration);
        }
        overlay.visible = showOverlayRef.current;
        if (showOverlayRef.current) drawOverlay(actor, overlay);
      };
      renderer.getTicker().add(tick);
      tickRef.current = tick;
    });

    return () => {
      cancelled = true;
      if (tickRef.current) renderer.getTicker().remove(tickRef.current);
      tickRef.current = null;
      actorRef.current?.destroy();
      actorRef.current = null;
      overlayRef.current = null;
      renderer.destroy();
    };
    // effectiveClipId deliberately excluded — it only seeds the FIRST
    // pose on mount; handleClipChange below drives every later switch
    // on the already-live actor instead of remounting the whole Pixi app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig]);

  // User-driven clip switch: mutate the live actor and snap the slider
  // back to 0, both directly in the event handler — not in an effect
  // reacting to clipId, which would be a state update synchronously
  // cascading from another state update for no benefit here.
  function handleClipChange(nextClipId: string): void {
    setClipId(nextClipId);
    setScrub(0);
    actorRef.current?.setClip(nextClipId);
  }

  // Dragging the slider seeks the live actor directly — scrubbing is
  // the point, so this always takes effect regardless of `playing`
  // (pausing first is one extra click otherwise, for a feature whose
  // whole value is fast back-and-forth scrubbing).
  function handleScrub(fraction: number): void {
    setScrub(fraction);
    if (activeClip) actorRef.current?.seek(fraction * activeClip.durationMs);
  }

  return (
    <div>
      <label className="text-sm">
        Rig:{" "}
        <select className="border rounded px-2 py-1" value={rigId} onChange={(event) => setRigId(event.target.value)}>
          {rigIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>{" "}
      <label className="text-sm">
        Clip:{" "}
        <select
          className="border rounded px-2 py-1"
          value={effectiveClipId}
          onChange={(event) => handleClipChange(event.target.value)}
          disabled={!rig}
        >
          {rig?.clips.map((clip) => (
            <option key={clip.id} value={clip.id}>
              {clip.id} {clip.loop ? "(loop)" : "(hold)"}
            </option>
          ))}
        </select>
      </label>{" "}
      <label className="text-sm">
        <input type="checkbox" checked={playing} onChange={(event) => setPlaying(event.target.checked)} /> Playing
      </label>{" "}
      <label className="text-sm">
        <input type="checkbox" checked={showOverlay} onChange={(event) => setShowOverlay(event.target.checked)} /> Pivots/bounds overlay
      </label>
      <div className="mt-2">
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(scrub * 1000)}
          onChange={(event) => handleScrub(Number(event.target.value) / 1000)}
          className="w-full"
          aria-label="Scrub clip timeline"
        />
      </div>
      <p className="text-xs text-neutral-500 mt-1 mb-4">
        Polling content/rigs/{rigId}.json every second — edit and save to hot-reload. Dragging the slider always seeks,
        even while playing.
      </p>
      {error && <p className="text-sm text-red-600 mb-4">Error: {error}</p>}
      <div ref={containerRef} style={{ width: "100%", height: 420, background: "#111" }} data-testid="rig-inspector-canvas" />
      <div className="mt-3" data-testid="rig-lint-panel">
        {lintIssues.length === 0 ? (
          <p className="text-sm text-green-700">Rig-lint: no issues across any clip.</p>
        ) : (
          <>
            <p className="text-sm font-medium">
              Rig-lint: {lintIssues.length} issue{lintIssues.length === 1 ? "" : "s"} — same checks as{" "}
              <code>npm run validate</code>.
            </p>
            {currentClipIssues.length > 0 && (
              <ul className="text-xs text-red-700 mt-1 pl-4 list-disc" data-testid="rig-lint-current-clip">
                {currentClipIssues.map((issue, i) => (
                  <li key={i}>
                    <strong>[{issue.check}]</strong> {issue.partId ? `${issue.partId}: ` : ""}
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
            {otherClipIssues.length > 0 && (
              <details className="text-xs text-neutral-500 mt-1">
                <summary>
                  {otherClipIssues.length} more in other clip{otherClipIssues.length === 1 ? "" : "s"}
                </summary>
                <ul className="pl-4 list-disc mt-1">
                  {otherClipIssues.map((issue, i) => (
                    <li key={i}>
                      clip &quot;{issue.clipId}&quot; <strong>[{issue.check}]</strong> {issue.partId ? `${issue.partId}: ` : ""}
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}
