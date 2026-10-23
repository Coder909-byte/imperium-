export function AtlasFilters() {
  return (
    <defs>
      <filter id="paperGrain" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves={2} seed={7} />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer><feFuncA type="linear" slope={.075} /></feComponentTransfer>
      </filter>
      <filter id="inkEdges" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="turbulence" baseFrequency="0.018" numOctaves={2} seed={11} result="wobble" />
        <feDisplacementMap in="SourceGraphic" in2="wobble" scale={.65} xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
        <stop offset="60%" stopColor="#715936" stopOpacity={0} />
        <stop offset="100%" stopColor="#715936" stopOpacity={.2} />
      </radialGradient>
      <linearGradient id="parchmentBase" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f3eddd" /><stop offset="100%" stopColor="#ded3b8" />
      </linearGradient>
      <linearGradient id="seaWash" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9cbcb8" /><stop offset="100%" stopColor="#b5cdca" />
      </linearGradient>
    </defs>
  );
}
