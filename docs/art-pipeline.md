# Art pipeline — the manual workflow

This is the reusable guide for producing region planes; M8 supplied its original measurements. Use it when a scene needs planes and
the only question that matters is "what do I actually do." `tools/forge`'s
own `--help` covers flag syntax; this covers everything around it —
where the source comes from, how to know it's actually safe to use, how
to cut it into planes, and what resolution to bother exporting at.

Read `docs/adr/003-art-direction-painted-planes.md` first if this is the
first session touching art — it's short, and it's the reason backdrop
planes keep their colour. For the subsequently approved painted character-part path, also read ADR 014: colour and alpha are preserved, and `--matte` is not used on already separated painted parts.

**Current production, 2026-10-23:** Gallia's visuals/narration are owner-accepted. Existing atmosphere, wall, personnel and narration approvals remain limited to their documented scopes; this guide does not authorize another region's reuse/generation. Use the [region-completion checklist](region-completion-checklist.md) and obtain episode/outline approval before full narrative/art. Historical M7 measurements below remain unchanged.

## 1. Source the painting

PRD §3's list, in the order it's worth trying:

| Source | What's there |
|---|---|
| **Gérôme** (d. 1904) | Archaeologically obsessive figure/interior scenes — arenas, temples, dramatic single-point lighting. |
| **Alma-Tadema** (d. 1912) | Marble, light, crowd staging — the best reference for Roman civic space. |
| **Poynter** | Figure composition, costume detail. |
| **Bierstadt** | Landscape/atmosphere — skies, distance, weather. |

Search directly on **Wikimedia Commons** (`commons.wikimedia.org`) — it's
where this session's own two test images came from, and its API makes
rights verification (next section) fast rather than a guessing game.
**Met Open Access**, **Rijksmuseum**, and **Getty Open Content** are the
other reliable high-res CC0/PD sources named in PRD §3, worth searching
directly when Commons doesn't have what a scene needs.

**For the original engraving rig path** (ADR 003), Cichorius/Piranesi are reference candidates, with the matte cautions in §5; their imagery is not automatically period-appropriate. The implemented painted-part path (ADR 014) uses already separated full-colour alpha assemblies and the normal colour export. Do not strip painted faces/clothing/mail using `--matte`. Source rights and historical suitability are separate checks.

## 2. Verify the rights — every time, not just the first time

**An artist's death date is not proof of anything about the specific
scan.** This is CLAUDE.md's hard rule #4, and it means checking the
actual file's own metadata, not reasoning from the painter's dates.

On a Wikimedia Commons file page, check (or pull via the API —
`action=query&prop=imageinfo&iiprop=extmetadata`, which is exactly what
this session used to verify both its own test images before downloading
either one):

- `LicenseShortName` / `UsageTerms` — should read "Public domain" or
  "CC0", not something conditional.
- `Copyrighted` — should be `false` for a clean PD work (a `true` value
  next to a CC0 licence, seen on the Piranesi file this session used,
  usually means the *institution's digital reproduction record* carries
  a copyright flag independent of the underlying work's own status —
  read the actual licence text on the page, don't stop at one field).
- `AttributionRequired` — record it either way; CC-BY-style sources
  need the credit line preserved even when the work itself is old.
- `Credit` / the file's own description — this is where the holding
  institution usually shows up. **It sometimes doesn't, cleanly** — one
  of this session's two real test files (an Alma-Tadema) had no clean
  institutional credit, only a magazine reprint mention. That's exactly
  the real case `--institution "unknown"` exists for: type it, don't
  guess an institution that isn't actually stated.

If a file's rights status is genuinely unclear after this check, **don't
use it.** There is no partial credit for "probably fine."

## 3. Separate planes in Photopea

[Photopea](https://photopea.com) — browser-based, Photoshop-shaped, no
install, free. GIMP/Krita work too if you'd rather.

Per PRD §3, 5–8 planes per scene, back to front:

```
sky · far architecture · mid architecture · mid terrain
  · character stage · near terrain · foreground silhouette
```

Working method: lasso the frontmost element, cut it to its own layer,
clone-stamp the hole it leaves behind, repeat inward. ~4h by hand, ~2h
once this is routine.

**Export each plane as a separate PNG with real alpha** — the
transparent hole from the clone-stamp step *is* the plane's silhouette,
and `tools/forge`'s default (colour) path preserves whatever alpha a
source file already carries untouched. Put a whole scene's cut layers
in one folder; that folder is what batch mode takes.

**Character parts:** choose the supported rig treatment deliberately. The procedural/engraved reference path uses joint-separated parts; Gallia's painted rigs instead use six connected assemblies to hide joints under tunics/shields (ADR 014). Keep colours/alpha intact for painted parts, author actual sizes/pivots and inspect anatomy/ground contact. Separate folders by export settings, not by an assumption that all figures need matte.

## 4. What resolution to export at

**Measure the total budget first.** The M7 reference scan produced a **~385–450KB** colour plane at **1920px / quality 75–78** (§7); that is a measured example, not a six-plane allowance. The strict <2.5 MiB region budget includes all unique referenced planes, rig textures and audio. Gallia's narration alone is 1,098,432 bytes and all audio 1,653,554 bytes. Reserve the actual narration/audio/rig budget before selecting backdrop widths/quality; six ~400KB planes leave no realistic narrated-region headroom. Cropped/transparent cuts can differ substantially from the full-scan measurement. Use actual exported bytes and `npm run validate`, not an assumed per-plane average.

Work from whatever resolution the source painting was scanned at — the
whole point of sourcing from Commons/Met/Rijksmuseum is that their
scans are already far above 1920px, so there's no upscaling involved,
only `--resize 1920` cropping it back down at export time. Don't resize
*before* Photopea; cut planes at full source resolution so the
clone-stamp work has real pixels to work with, and let `--resize` do
the final downscale at forge time.

**Not every plane needs 1920px.** A sky or far-architecture plane sits
far back in the parallax stack, gets a `blur` value in the region JSON,
and is rarely the thing the camera pushes toward — 1280–1440px is
plenty and meaningfully cheaper. Save the full 1920px (or higher, for a
plane the camera actually approaches) for character-stage and
foreground planes specifically.

## 5. `--matte` — read this before using it on anything but a genuine line engraving

**`--matte` is not automatically cheaper than colour, and it is not
automatically clean.** Two real findings from this session's
measurements (§7), both worth internalizing before reaching for it:

1. **A photographed relief (Cichorius) doesn't matte as cleanly as true
   ink-on-paper line art.** Trajan's Column reliefs are carved stone,
   photographed under raking light — continuous photographic
   grayscale, not a binary ink/paper split — so the luminance-to-alpha
   conversion produces a matte with real mid-tone noise, not a clean
   silhouette. Fine for architectural reference; avoid it for a
   puppet-rig part that needs a crisp edge.
2. **A genuine etching's fine cross-hatching can compress *worse* than
   a smooth colour painting at the same resolution and quality** —
   counter-intuitively. Cross-hatched shading is high-frequency detail
   spread across the whole image, and that's exactly the kind of
   content lossy WebP struggles to compress well, regardless of it
   being "just" black ink and white paper. Don't assume a matte export
   will be small; measure it, the same as a colour plane.

Given both findings, the practical rule: pick source engravings with
**bold, simple line weight and large areas of flat white** — a single
figure study, not a densely cross-hatched full-scene etching — when the
goal is a small, clean matte. Preview the alpha before committing to a
resolution (`sharp` can composite the WebP over a bright flat colour to
make the matte visible — that's exactly how this session confirmed its
own test matte was clean, since the raw WebP itself often *looks* like
a flat rectangle in a normal image viewer until composited against
something that isn't the same tone as its own alpha-transparent areas).

**RGB defaults to white, not a baked-in colour**, because
`ParallaxPlane`/`PuppetActor` tint alpha art at *runtime* via Pixi's sprite multiply tint —
that only produces a clean, vivid result over a white base. `--tint`
exists for the rarer asset that won't go through runtime tinting at
all and should carry a fixed flat colour into the file itself instead.

## 6. Batch mode, and the two-folder workflow

Batch mode applies **one uniform set of flags to every file in a
folder** — no per-file overrides. Since a real scene's plane set
can mix colour layers with genuine engraving mattes, **separate folders by the needed flags** and run the forge once per group. Painted parts use colour mode like backdrops, though their size/quality settings often need a separate group. The two commands below show the original engraving example, not a requirement to matte painted figures:

```bash
npm run forge -- ./raw/gallia-backdrops \
  --source "https://commons.wikimedia.org/wiki/File:..." \
  --licence "Public domain" --artist "Jean-Léon Gérôme" --institution "unknown" \
  --resize 1920 --quality 78

npm run forge -- ./raw/gallia-character-parts \
  --source "https://commons.wikimedia.org/wiki/File:..." \
  --licence "CC0" --artist "unknown" --institution "unknown" \
  --matte --resize 800 --quality 82
```

This is the intended workflow, not a limitation to work around — don't
try to mix matte and colour layers in one folder and reach for a
per-file config that doesn't exist.

## 7. The real numbers (measured, M7)

Two real public-domain images, run through the actual pipeline (not
estimated):

**Colour mode** — Alma-Tadema, *The Roses of Heliogabalus*, 6000×3694
JPEG (CC0, Met/Wikimedia Commons):

| Output width | q75 | q82 | q90 |
|---|---|---|---|
| 1920 | 385KB | 521KB | 766KB |
| 2560 | 682KB | 927KB | 1364KB |
| 3840 | 1446KB | 2014KB | 2993KB |

Roughly quadruples for each doubling of width, as pixel count implies —
not a flat "colour costs more" tax, a real quadratic curve. **This is
the table §4's "1920px, quality 75–78" recommendation is read off.**

**Matte mode**, two different engravings, same quality sweep, plus
colour mode on the *same* sources for direct contrast:

*Cichorius Tafel XXX (2000×1131, a photographed relief — the "doesn't
matte cleanly" case above):*

| Output width | matte q75 | matte q82 | matte q90 | colour q82 |
|---|---|---|---|---|
| 800 | 209KB | 250KB | 261KB | 81KB |
| 1200 | 456KB | 552KB | 559KB | 172KB |
| 2000 | 1083KB | 1360KB | 1363KB | 366KB |

*Piranesi, Veduta del Colosseo (3757×2638, a genuine etching — the
"cross-hatching compresses worse than expected" case above):*

| Output width | matte q75 | matte q82 | matte q90 | colour q82 |
|---|---|---|---|---|
| 800 | 280KB | 334KB | 362KB | 163KB |
| 1200 | 630KB | 753KB | 815KB | 375KB |
| 1920 | 1622KB | 1921KB | 2087KB | 1030KB |

Matte lost to colour at every single width/quality pair measured, on
both sources. Neither is a bad-source fluke — see §5. In practice this
matters less than the table makes it look, because character-rig parts
are cropped tightly (a head, a torso — a few hundred px, not a
1200px-wide full plate), but it means never *assume* a matte export is
the cheap option; always check the number the tool prints.

One more real data point worth recording here rather than losing it:
**WebP's `quality` option only ever controls the RGB channel — alpha
compresses at its own separate `alphaQuality` setting**, which
defaults to near-lossless regardless of `quality`. `tools/forge`
already sets both from the same `--quality` flag (found by measuring —
an early version of the pipeline produced byte-identical matte output
across quality 75/82/90 before this was caught), so this isn't
something to work around by hand — just know the one `--quality` flag
genuinely controls both channels' size.

## 8. Running the forge

```bash
# One painting -> one game-ready plane.
npm run forge -- ./raw/gerome-forum.jpg \
  --source "https://commons.wikimedia.org/wiki/File:..." \
  --licence "Public domain" --artist "Jean-Léon Gérôme" --institution "unknown" \
  --resize 1920 --quality 78

# A folder of already-separated layers (batch mode).
npm run forge -- ./raw/gallia-beat3-layers \
  --source "..." --licence "..." --artist "..." --institution "..." \
  --resize 1920 --quality 78

# A character part crop, matte mode, with a preview tint.
npm run forge -- ./raw/cichorius-legionary-torso.png \
  --source "..." --licence "..." --artist "..." --institution "..." \
  --matte --resize 400 --quality 85 --tint "#3a2f1f"
```

Every run prints input/output dimensions, the real file size, and
whether it fits the per-plane budget (`tools/forge/budget.ts`) — read
it; a run that reports "OVER" is telling you to either drop `--resize`,
drop `--quality`, or reconsider whether this specific plane needs to be
full-width at all (§4).

**The command refuses to write anything — no file, no manifest row —
if `--source`, `--licence`, `--artist`, or `--institution` are missing.**
`--artist`/`--institution` accept the literal `"unknown"` for a real
unattributed case; there is no way to skip them silently. If a run
fails on this, that's the tool working as designed, not a bug to route
around.
