import type { SceneBeat, ScenePlane, SceneRegion } from "./types";

export function SceneArtDiagnostics({ region, beat, planes }: { region: SceneRegion; beat: SceneBeat; planes: readonly ScenePlane[] }) {
  const active = new Set(beat.visibleLayers);
  return (
    <details style={{ padding: "1rem", color: "#e6dfd2", background: "#171410" }}>
      <summary>Art diagnostics — {beat.headline}</summary>
      <p>{planes.length} rendered planes. Grouped atmosphere shares one low-tier sprite.</p>
      <ul>
        {region.planes.map((plane) => <li key={plane.id} data-art-plane={plane.id} data-art-visible={active.has(plane.id)} data-art-kind={plane.draft ? "draft" : plane.assetUrl ? "approved" : "placeholder"}>
          {plane.id}: {active.has(plane.id) ? "visible" : "hidden"}; {plane.assetUrl ?? "procedural placeholder"}{plane.draft ? " (provisional structure draft)" : ""}
        </li>)}
      </ul>
      <p>Actor entries: {beat.actors.filter((actor) => actor.count === 1).length} puppets, {beat.actors.filter((actor) => actor.count > 1).length} crowd groups. Fully painted rigs bake their own four-pose atlas; procedural rigs retain the generic march atlas.</p>
      <p>Rig parts: {region.rigs.flatMap((rig) => rig.parts).filter((part) => !part.texture.startsWith("/assets/")).length} procedural placeholders.</p>
      <p>Provisional personnel: {region.rigs.filter((rig) => rig.draft).map((rig) => rig.id).join(", ") || "none"}.</p>
    </details>
  );
}
