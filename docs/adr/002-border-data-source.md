# 002. Border data source

## Context

The atlas needs coastlines, rivers, lakes, and Roman provincial boundaries as SVG paths (PRD §17). The obvious source for the provincial boundaries was `aourednik/historical-basemaps`, a ready-made GeoJSON dataset of historical political boundaries by period. It is licensed GPL-3.0. GPL §0 defines "propagate" to exclude mere network interaction that doesn't transfer a copy, so using the raw data server-side only — computing something from it and returning a result — would not by itself trigger the copyleft. But the atlas' job is to project this boundary data into SVG paths and ship them to every browser that loads the page. That is transferring a copy of a work based on the GPL-licensed data, which is "conveying" under §0. GPL §5(c) then requires that "the entire work, as a whole" — under this reading, the atlas bundle the paths ship in, and by extension whatever it's inseparable from at runtime — be licensed under the GPL. Imperium has a paid tier planned; that's not a constraint the project can accept for engine and content code.

## Decision

Two sources, split by what's actually copyrightable. Coastlines, rivers, and lakes come from Natural Earth's 1:50m physical vectors, which are public domain with no attribution requirement — geography with no authored expression to license. Roman provincial boundaries are self-authored: facts aren't copyrightable, and a boundary's location is a fact, so hand-drawing provincial borders from scholarly references and citing those references in each region's `sources` array carries no GPL exposure, because there is no GPL-derived work to convey in the first place.

## Consequences

No GPL obligation attaches to the atlas or to any content built on top of it, and Natural Earth's public-domain terms mean no attribution burden either. In exchange, boundary accuracy becomes Imperium's own responsibility — every province needs its cited references, checked, not inherited from a maintained upstream dataset. This is not entirely a downside: Roman provincial borders were themselves genuinely approximate in period, so hand-authored paths with acknowledged imprecision are a more honest representation than false survey-grade precision would be, and the style suits the engraved-atlas aesthetic better than a clean modern GIS import would. DARE (Digital Atlas of the Roman Empire) remains a candidate as a visual reference during hand-authoring; its terms haven't been checked and must be verified separately before any such use.

This is the team's own reading of the GPL, not legal advice, and should be revisited by counsel before any commercial launch.
