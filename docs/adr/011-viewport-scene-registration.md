# 011. Viewport scene layout and shared world registration

## Context

Gallia's cinematic presentation needs room for both its painted composition and unchanged six-beat prose. A fixed 21:9 player with overlaid captions hides artwork and can clip long copy. Independently fitting planes, actors and particles to a changing host also breaks their registration. A source painting's aspect ratio is an art coordinate system, not a requirement that the complete player occupy a shallow strip of the viewport.

## Decision

Use a player that fills at least the viewport, with a flexible canvas area and a separate caption/control/source area in document flow. Preserve a minimum usable canvas height; allow page scrolling when prose or an open sources drawer needs more space. All scene objects share a centered canonical world of 1280×(1280×9/21) logical units and 1.35× overscan. Camera framing cover-fits this world to the actual logical stage, retaining headroom and limiting pans so drift/shake do not expose empty edges. Recompute framing from the live stage during camera updates. Read logical dimensions explicitly from Pixi's `app.screen`; the renderer applies device pixel ratio once, capped at 2, with `autoDensity`. This clarifies sizing rather than asserting a verified DPR bug. A `ResizeObserver` watches the canvas host because caption wrapping and source expansion can change it without a window resize. Authored cuts remain registered on the shared 2520×1080, 21:9 art canvas. Gallia's deliberate camera motion remains linear through at least the reading dwell; no prose is shortened. Reduced motion keeps the target framing and accessible content while cutting camera movement and disabling drift/parallax.

## Consequences

Planes, actors and particles retain one coordinate system across desktop, narrow layouts and live resize. Captions and sources do not cover the canvas. Cover-fitting crops horizontal composition on portrait screens, and safe framing may constrain an authored pan or zoom-out. Every beat therefore still needs rendered crop, actor, occlusion and wall-legibility review across the full camera move, including low tier and reduced motion; registered cuts and passing geometry tests alone do not establish a finished composition or mobile GPU performance.
