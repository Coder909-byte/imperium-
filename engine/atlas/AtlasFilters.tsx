// Parchment aesthetic, entirely procedural SVG filters — no raster assets
// (CLAUDE.md rendering rule). Three effects: paper grain (feTurbulence +
// feDiffuseLighting), hand-inked wobble on borders/coastline
// (feTurbulence + feDisplacementMap), and a radial vignette (gradient,
// no filter needed for that one).

export function AtlasFilters() {
  return (
    <defs>
      {/* Paper grain: fractal noise lit from one side reads as fibrous
          paper texture rather than flat noise. */}
      <filter id="paperGrain" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves={3} seed={7} result="grain" />
        <feDiffuseLighting in="grain" lightingColor="#fdf6e3" surfaceScale={1.6} diffuseConstant={1.1} result="lit">
          <feDistantLight azimuth={235} elevation={55} />
        </feDiffuseLighting>
        <feColorMatrix in="lit" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.35 0.35 0.35 0 0" result="grainAlpha" />
        <feComposite in="grainAlpha" in2="SourceGraphic" operator="over" />
      </filter>

      {/* Hand-inked wobble: displaces straight vector edges along a low-
          frequency noise field so coastlines and borders read as etched
          by hand rather than plotted. */}
      <filter id="inkEdges" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="turbulence" baseFrequency="0.018" numOctaves={2} seed={11} result="wobble" />
        <feDisplacementMap in="SourceGraphic" in2="wobble" scale={3.2} xChannelSelector="R" yChannelSelector="G" />
      </filter>

      <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
        <stop offset="55%" stopColor="#2a1c0f" stopOpacity={0} />
        <stop offset="100%" stopColor="#180f06" stopOpacity={0.55} />
      </radialGradient>

      <linearGradient id="parchmentBase" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f2e2b8" />
        <stop offset="100%" stopColor="#e2c98f" />
      </linearGradient>
    </defs>
  );
}
