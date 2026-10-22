# 008. Explicit placeholders, approved scene assets and reading-time camera moves

## Context

At M8 entry Gallia had six complete prose beats, but `buildSceneProps` dropped plane paths and sources, and the renderer always drew procedural bands. A missing asset therefore looked indistinguishable from intentional placeholder art. Beat one's 9s camera move left roughly 17s of its reading dwell without a deliberate move. Longer camera durations also controlled opacity, making siege walls spend most of a beat fading in.

## Decision

Declare missing plane art explicitly with `placeholder: true`. Real assets use relative names under `public/assets/`, with provenance and a separate human `approval` record (reviewer, date, exact rights statement and URL) in the manifest. Only approved PD/CC0 references enter scene props. Forge records provenance; it cannot grant approval. Scene-owned image textures load before graph readiness, outside Pixi's global Assets cache, and are disposed on cancellation/exit. Missing real files produce an error while captions and sources stay accessible. Kinematic rig lint remains mandatory, independent of texture appearance. Content can mark up to four planes essential; low tier keeps these within the existing four-plane cap before filling spare slots by depth. Gallia retains sky, hillfort and both walls, because the old evenly spaced selection dropped the outer wall for the entire second-wall story.

Gallia opts into `camera.durationMode: "dwell"`: the existing camera move lasts at least the unmodified reading dwell, with a linear ease to avoid long near-stationary easing tails. Other scenes retain authored timing by default. The first layer set cuts in immediately; subsequent reveals take 600ms, independently of camera travel. Reduced motion cuts both. Source citations pass through unchanged into a per-beat drawer. Narrow screens place the caption panel in document flow so long copy remains accessible.

## Consequences

No approval or historical authority is inferred from a manifest licence string. Procedural previews are clearly incomplete. Real plane cuts must share a registered scene canvas with overscan margins; rig part geometry must match the declared sizes/pivots. The unrelated Alma-Tadema forge sample remains unused. Camera intent is explicit content data rather than a global dwell change. Placeholder pacing can now be reviewed before cutting art, but real-art composition, grading, texture payload, audible mix and mobile GPU checks remain M8 gates.
