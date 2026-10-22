# Gallia asset decisions and preparation — 2026-10-22

**Personnel approval update — 2026-10-23:** the owner explicitly approved provisional AI-assisted Roman/Gallic infantry references, transparent parts and shared crowd atlases, including routine variations. The sole photographic input is the specific [Met Montefortino-family helmet image](https://www.metmuseum.org/art/collection/search/684492), explicitly marked “Public Domain”; its earlier Etruscan date and modern cheekpieces are not evidence for Alesia equipment. This permission is separate from the NGA atmospheric and Motte structure approvals. Generated assets remain provisional, never public domain. Source rights, research, preparation and limitations are recorded in `docs/m8-personnel-review.md` and the manifest; civilians, horses/riders and the hillfort are outside this infantry preparation approval.

## Visual continuation — 2026-10-23

The existing atmospheric approval now also supplies `public/assets/gallia/foreground.webp` (60,650 bytes), prepared through built-in imagegen and forge from the same exact NGA source. It is a full-colour alpha cut of near grass/earth banks with an open centre. This is atmospheric preparation; it introduces no structures or figures.

**New explicit owner approval:** the exact [Motte postcard scan](https://commons.wikimedia.org/wiki/File:Motte_Le_si%C3%A8ge_d%27Al%C3%A9sia_(carte_postale_noir_et_blanc).jpg) for an AI-assisted **provisional siege tower/rampart draft**, granted in chat on 2026-10-23. The specific-file rights statement is recorded verbatim in the manifest; the Commons page identifies the reproduction as public domain, with jurisdictional qualifications. `content/assets/staging/gallia/motte-siege-source.jpg` retains the source; `public/assets/gallia/siege-rampart-draft.webp` (78,338 bytes) retains distinct AI-derivative provenance and structural-draft scope. The second image edit corrected an oversized first result into a registered wide cut (1920×823 after forge). Scene reuse mirrors and lowers the same draft for the outer wall; neither geometry nor layout is a verified reconstruction. No final art, hillfort or figure approval was inferred.

The source's existing monochrome scan was interpreted in colour; generated colour/details are not labelled public domain. This draft does not resolve the missing Alesia hill/oppidum, detailed obstacles or period-character art. Candidate B/C costume reservations still stand. See `docs/m8-visual-review.md` for remaining per-beat gaps.

The owner explicitly approved **candidate A's exact NGA reproduction and AI-assisted sky/ground preparation for atmospheric scenery only**, plus **candidate E's synthesized wind and candidate F's exact Kenney cloth/chop cues**, in chat on 2026-10-22. The source and atmospheric staging rows now record that approval. Audio integration owns the approved audio records and final encodes. Candidates B/C/D remain unapproved and unused.

Approval does not extend to Alesia's hill/oppidum, fortifications, period equipment, figures or Royer reproductions. It does not establish final composition, a finished mix or historical acceptance. The AI-assisted derivatives remain explicitly identified; **generated pixels are not labelled public domain** merely because the NGA source reproduction is public domain. Their manifest approval quotes that source's exact rights statement and records the owner as reviewer; the derivative licence stays distinct. Production copies must retain the source linkage and approval limits.

The scoped integration record uses `derivation.kind: "ai-assisted-atmosphere"`, `sourceFile` pointing to the approved NGA source row, and an explicit account of the edits in `modifications`. Its approval scope is `atmospheric-derivative`; the source's scope is `asset`. The loading boundary must require both approvals and a plane authored as `role: "atmosphere"`. Structure planes, rig textures and audio cannot acquire approval through this derivative branch.

## Integration update — 2026-10-23

The approved atmospheric sky/terrain and synthesized wind were integrated at checkpoint `06f67dc`. The two unchanged approved Kenney files are now mapped as beat-entry cues: timber work in beat 2 at .18 gain; cloth movement in beat 6 at .12. The Mandubii beat has no cue. Levels and loop preparation are provisional pending listening review. Combined referenced payload is 712,704 bytes across five files. The source/preparation notes below record earlier stages; they do not override the production mappings or approval records in the manifest. Five historical planes, all real character/crowd art and final art/history/device acceptance remain open.

## Compact source list

### A. Painted sky and generic ground — approved for atmospheric preparation

**Charles-François Daubigny, _Landscape, Distant Village_, c. 1870/1875.** National Gallery of Art, Washington, Corcoran Collection, accession 2015.19.10.

- [Institution object and rights page](https://www.nga.gov/artworks/177919-landscape-distant-village).
- [Full image download linked by the institution](https://api.nga.gov/iiif/35295bb4-6f47-432f-9253-f1c2e6fa4ce4/full/full/0/default.jpg?attachment_filename=landscape_distant_village_2015.19.10.jpg).
- [Exact technical-review download used here](https://api.nga.gov/iiif/35295bb4-6f47-432f-9253-f1c2e6fa4ce4/full/!2560,2560/0/default.jpg), 2560×1609, 979,826 bytes.
- Object-specific rights statement, verbatim: **“This object’s media is free and in the public domain.”**
- Intended use: overcast `sky`; grass/earth surface for `mid_ground` and restrained near-edge `foreground`. A suitable shared painted palette for an initial reference treatment.
- Mismatches: this is a nineteenth-century rural landscape, not the Alesia site. The village/church, cart, road scene and people cannot be passed off as Gaul in 52 BCE. Its low horizon supplies neither the Alesia hill nor either siege wall. Do not simply ship the whole painting behind actors.
- Prepared: local source, sky restoration draft and terrain separation draft. No colour stripping or luminance matte was applied to either backdrop.
- Owner decision: approved this exact NGA reproduction and AI-assisted sky/ground preparation. The modern painting is still neither an accurate Alesia reconstruction nor permission to invent historical structures. The source staging row is `Public domain`; derivative staging rows say `Owner-approved AI-assisted derivative of Public domain source` and retain their own approval records.

### B. Painted surrender — relevant composition, substantial reservations

**Lionel Royer, _Vercingétorix jette ses armes aux pieds de Jules César_, 1899.** Original painting: Musée Crozatier, Le Puy-en-Velay, accession 1903.59. The specific Commons scan's provenance is less direct than candidate A or C.

- [Specific file and rights page](https://commons.wikimedia.org/wiki/File:Lionel_Royer_-_Vercingetorix_Throwing_down_His_Weapons_at_the_feet_of_Julius_Caesar.jpg).
- [Exact original-file download](https://upload.wikimedia.org/wikipedia/commons/a/ae/Lionel_Royer_-_Vercingetorix_Throwing_down_His_Weapons_at_the_feet_of_Julius_Caesar.jpg), page reports 2204×1469, 920 KB.
- Specific-file rights statement, verbatim: **“This file has been identified as being free of known restrictions under copyright law, including all related and neighboring rights.”** The file page also explains jurisdictional limitations on faithful reproductions; review those linked terms as part of the decision.
- Intended use: beat 6 framing and horse/rider silhouette reference. Potential full-colour cuts only if the owner accepts both reproduction rights and historical adaptation.
- Mismatches: the file explicitly flags the Percheron horse, rectangular shields and lorica segmentata as period problems. The painting is a later historical interpretation, not evidence of the exact surrender tableau. A dramatic armour/horse crop would carry those problems into the product. **Do not use unchanged as the flagship's historical visual answer.**
- Not downloaded into the repository. No cut or manifest row is claimed for an asset that has not entered it.

### C. Surrender figure poses — stronger institutional reproduction rights

**Figaro-Salon, publisher, after Lionel Royer, _Lionel Royer. Vercingétorix devant César._** Photomechanical periodical illustration, Musée Carnavalet – Histoire de Paris, Paris Musées, inventory G.41040.

- [Institution object and rights page](https://www.parismuseescollections.paris.fr/fr/musee-carnavalet/oeuvres/lionel-royer-vercingetorix-devant-cesar).
- [Institution IIIF manifest, including image-specific rights](https://apicollections.parismusees.paris.fr/iiif/320167680/manifest).
- [Exact institution image download from that manifest](https://apicollections.parismusees.paris.fr/sites/default/files/styles/4k/collections/atoms/images/CAR/aze_carg041040_001.jpg?itok=t1edky3l), manifest canvas 2970×2160.
- [Institution download package](https://www.parismuseescollections.paris.fr/fr/zip/oeuvre/353089).
- Image-specific rights statement, verbatim: **“CC0 Paris Musées / Musée Carnavalet - Histoire de Paris”**. The manifest links the [CC0 1.0 deed](https://creativecommons.org/publicdomain/zero/1.0/).
- Intended use: reference/cut study for the beat 6 central horse and rider, with any rear soldiers kept separate. The source is monochrome; it is not a substitute for full-colour painted backdrop planes. A relief/print does not automatically become a clean puppet matte.
- Mismatches: inherits candidate B's nineteenth-century staging and equipment issues. Historical correction remains a separate art decision. The horse/rider are one visible pose; hidden limbs need authored reconstruction before a convincing animated rig exists.
- Not downloaded into the repository. No finished cavalry rig or numerical rig-lint pass is claimed.

### D. Natural field wind — preferred bed candidate to audition

**Uganda, _WIND, Wind through Wheatfield.wav_, 2007.** Freesound contributor; recorded at Haywards Heath, West Sussex, England.

- [Specific sound and rights page](https://freesound.org/people/Uganda/sounds/38976/).
- [Exact original-file download link exposed by that page](https://freesound.org/people/Uganda/sounds/38976/download/38976__uganda__wind-wind-through-wheatfield.wav). The page requires login for original download; no credentials were requested or used.
- Specific-sound rights label, verbatim: **“Creative Commons 0”**, linked to the [CC0 1.0 deed](https://creativecommons.org/publicdomain/zero/1.0/).
- Page reports stereo WAV, 48 kHz/24 bit, 104.352 seconds, 28.7 MB; described as field wind with plant crackle and background birds.
- Intended use: a quiet edited loop for `wind_plains`, retaining the six existing intensity values. Trim a clean section and encode only after listening, checking birds, modern noise and the loop seam.
- Mismatches: a modern English field recording, not recorded Gaul. Generic environmental use is plausible; bird species, crop sound and season still need judgement. The full WAV exceeds the entire region's 2.5 MB transfer budget before art is added, so it cannot ship as-is. No seamless loop, finished encode, audition or approved mix is claimed.
- Not downloaded into the repository.

### E. Account-free wind fallback — synthesized, owner approved

**Luke.RUSTLTD, _wind1_, 2010.** OpenGameArt uploader. The source explicitly says the winds were synthesized using PureData.

- [Specific upload and rights page](https://opengameart.org/content/wind1).
- [Exact download](https://opengameart.org/sites/default/files/wind1.wav).
- Specific-upload rights label, verbatim: **“CC0”**, linked to the [CC0 1.0 deed](https://creativecommons.org/publicdomain/zero/1.0/).
- Downloaded into temporary work space for technical inspection only: mono PCM WAV, 44.1 kHz/16 bit, 59.9989 seconds. No repository copy was added.
- Intended use: owner-selected synthesized bed for `wind_plains`, to be encoded, loop-checked and integrated by the audio increment. This is an explicit owner choice; no claim of a natural recording is made.
- Mismatches: synthesized ambience, not a field recording. The source suggests looping, but that is not an audible seam test. Raw download is about 5.3 MB and also needs an edited, measured encode. Local `ffmpeg` is unavailable; no new encoder dependency was installed just for this candidate.

### F. Quiet cloth and work cues — exact candidates owner approved

**Kenney Vleugels, _RPG Audio_, version 1.0 (2014).** Kenney.nl.

- [Pack and rights page](https://kenney.nl/assets/rpg-audio).
- [Exact official archive download](https://kenney.nl/media/pages/assets/rpg-audio/8e99002d76-1677590336/kenney_rpg-audio.zip).
- Included `License.txt` rights label, verbatim: **“License (Creative Commons Zero, CC0)”**. It links `http://creativecommons.org/publicdomain/zero/1.0/`; the pack page independently labels the pack Creative Commons CC0.
- Prepared unchanged archive members: `Audio/cloth1.ogg` → `content/assets/staging/gallia/audio/kenney-cloth1.ogg` (16,508 bytes, 0.66104 seconds); `Audio/chop.ogg` → `content/assets/staging/gallia/audio/kenney-chop.ogg` (9,370 bytes, 0.24025 seconds). Both identify 48 kHz Vorbis; duration was calculated from Ogg granule positions. Each has its own unapproved manifest row.
- Owner approved these exact source candidates. Intended use to review in the mix: cloth movement in beat 6, and restrained timber-working punctuation in beat 2. Cue timing and levels still require audible judgement. Do not put a chopping sound under the Mandubii beat or imply a recorded historical event.
- Mismatches: generic game foley; exact timbre, levels, timing and historical fit need listening. These do not supply battle beds, cavalry, narration or a finished mix. No production audio is audible as a consequence of this staging.

## Supported preparation actually attempted

The available raster editor is the built-in image generation/editing tool, used under `/Users/kokila/.codex/skills/.system/imagegen/SKILL.md`. `view_image` was used to inspect the local source before editing and both generated images before export. No segmentation script, monochrome conversion or invented licence approval was substituted.

The sky edit removed the foreground elements and restored sky over their former area. Its inspected output is 1916×821; the forge produced **1440×617, 57,886 bytes**, full colour, at quality 75. It visually retains slate/cream cloud brushwork and has no land, people, buildings or obvious rectangular patch edge. This establishes a usable preparation draft, not pixel identity with Daubigny or a judgement that a finished Alesia scene exists.

- Source: `content/assets/staging/gallia/daubigny-source.jpg`.
- Selected export: `content/assets/staging/gallia/daubigny-sky-draft.webp`.
- Terrain export: `content/assets/staging/gallia/daubigny-mid-ground-draft.webp`.
- Tool mode: built-in image editor, not a paid API/CLI path.
- Source approval and AI-edit acceptance were explicitly granted for atmospheric sky/ground only. Final grade/composition remain for review. The derivative manifest `licence` remains distinct from `Public domain`; no public-domain status is assigned to generated pixels.

Sky prompt used:

> Use case: precise-object-edit. Asset type: non-shipping draft sky plane for a historical painted-parallax scene. Edit target: the attached National Gallery of Art public-domain reproduction of Charles-François Daubigny's Landscape, Distant Village. Primary request: extract and restore a clean painted sky-only background. Preserve the existing full-colour grey-blue overcast cloud brushwork, pigments, value range and large cloud masses as closely as possible. Remove ALL land, trees, village roofs, people, animals and road; continue only the existing sky into the removed lower regions in matching painterly brushwork, without adding any sun disk, rays or extra dramatic weather. Compose as a wide 21:9 landscape texture with continuous painted sky covering every edge, intended registered canvas 2520x1080. This is an asset-preparation draft, not a new depiction of Alesia. No text, labels, logos, watermark, border or frame. Keep muted natural colour; do not convert to monochrome or photographic realism.

Original staging forge command used before the owner's approval (the input is the generated PNG reported by the built-in tool, kept outside production). The approval was subsequently recorded in the manifest, without reclassifying generated pixels as public domain:

```sh
npm run forge -- "$SKY_DRAFT_PNG" \
  --source https://www.nga.gov/artworks/177919-landscape-distant-village \
  --licence 'Pending owner review: AI-edited derivative of Public domain source' \
  --artist 'Charles-François Daubigny; AI-assisted sky restoration using OpenAI imagegen' \
  --institution 'National Gallery of Art, Washington (source reproduction)' \
  --resize 1440 --quality 75 --name daubigny-sky-draft \
  --out-dir content/assets/staging/gallia \
  --notes 'UNAPPROVED DRAFT ONLY. AI-assisted sky restoration. No production references. See docs/m8-asset-candidates.md.'
```

The second edit separated and reconstructed terrain with real alpha. The forge produced **1920×823, 99,696 bytes**, quality 78. Alpha inspection of the forged WebP confirms its top 30% is entirely transparent; sampled columns first become opaque at rows 361–448 (44–54% down). The model did **not** obey the requested exact 58% horizon. A small distant grey smudge also needs paint review. Do not call it a finished registered cut or silently stretch it to correct placement. Both drafts retain full canvas area and have distinct source/derivative provenance rows.

Terrain prompt used:

> Use case: precise-object-edit. Asset type: UNAPPROVED technical draft parallax terrain cut. Edit target: the attached National Gallery of Art reproduction of Daubigny's Landscape, Distant Village. Extract the open grassy middle and near ground, including the low banks and a quiet dirt corridor. Remove sky entirely to true transparent alpha; remove all trees, buildings, village/church silhouettes, people, cart and animal, restoring their ground gaps with matching grass/earth brushwork. Keep original full-colour green/ochre/slate pigments, painterly surface and muted overcast illumination. Avoid inventing structures, fortifications, costumes, rocks, battle or figures. Wide 21:9 registered scene canvas 2520x1080: land occupies the bottom 42% of the canvas, simple distant field horizon near y=626/1080, fully transparent above that silhouette, terrain fully opaque through bottom/side edges. Keep the full canvas; do not tightly crop the foreground. Its road/corridor should run diagonally from lower centre-right toward the left-centre distant horizon, with empty room above for a separate hill. Preserve painted irregular edge detail with a clean alpha, not rectangular selection. No sky colour fringe. No text, labels, frame, watermark, sun or godrays. This is preparation from a modern landscape for review, not a factual picture of Alesia.

Terrain export used the same source/pending-licence/institution flags above, `--resize 1920 --quality 78 --name daubigny-mid-ground-draft`, and artist `Charles-François Daubigny; AI-assisted terrain separation using OpenAI imagegen`. It stayed in `content/assets/staging/gallia`; colour mode preserved alpha.

## Cuts still requiring authored art or judgement

Keep every backdrop registered to the same 2520×1080 canvas, centered pivot; only the sky is fully opaque. Current camera travel must be reviewed on each cut. The draft canvas is a 21:9 reference; do not stretch a tightly cropped painting fragment to fill it.

| Required plane | Concrete source/cut or remaining work |
|---|---|
| `sky`, depth .02 | Candidate A; inspect the prepared sky. Export 1440px wide, quality 75. An alternative with no generated pixels requires manually cloning the trees/roofs out of the source sky and extending it over the lower removed areas. |
| `far_ridge`, .18 | No source found in this compact search that depicts the Alesia relief approach accurately. Paint a restrained distant ridge against a separately transparent horizon; do not use Daubigny's village as an ancient settlement. 1440px wide. |
| `hillfort`, .30 | Still needs an authored Alesia hill/oppidum silhouette and historical/topographical judgement. No discovered painting or generated sky establishes its shape. Keep its upper silhouette clear against sky. 1920px wide. |
| `mid_ground`, .42 | Candidate A's lower field/earth, with cart, people, buildings and trees removed. Keep a broad empty corridor for beat 4; preserve transparent sky area above its irregular terrain edge. 1920px wide. |
| `inner_wall`, .52 | Still needs circumvallation art. Keep the continuous wall/timber silhouette and corridor-facing edge legible; transparent above it and through intentional gaps. Do not clone a second wall from unreviewed modern reconstruction photographs. 1920px wide. |
| `outer_wall`, .68 | Still needs separate outward-facing contravallation art, with a visually distinct silhouette and visible corridor between walls. Compose with the inner wall simultaneously in frame in beats 3–5 and low tier. 1920px wide. |
| `foreground`, .90 | Candidate A's near grass/earth banks may supply surface colour, but not a full opaque rectangle. Cut the extreme lower-left/lower-right banks with irregular alpha along their top edge, keeping the central story area open. 1920px wide. |

For a manual source-preserving mid-ground pass, use the staged 2560×1609 source at original size. Its upper half is sky; the cart/figure sits near the central road, and modern roofs/trees break the distant horizon. Separate those objects rather than retaining them in a generic Gaul layer. Restore the ground behind them before defining the alpha silhouette. Retain canvas around the cut and check a bright-colour alpha preview plus the complete camera sweep; a clean still cut may expose its repaired edge under parallax.

For figures, candidate C makes the horse/rider cut concrete: separate the central mounted figure and horse from the background soldiers/ground, retaining tail, mane, reins and all visible hooves; paint overlap behind rider/horse intersections before attempting joints. Target logical dimensions and pivots must follow the corrected silhouette, not the existing 50px human head pivot. The current legionary's exact sizes/pivots remain in `m8-gallia-handoff.md`. No suitable civilian family source has been selected: the Mandubii need original restrained, non-gory silhouettes and a judgement about distance/visibility; a chained captive from a triumph painting would introduce a different event. Gallic crowd costumes also need a distinct corrected silhouette; tinting the Roman atlas does not supply one.

Run `npm run validate` after rig work; it includes the rig linter. Inspect every authored clip with pivot overlays in the rig inspector. A staged horse image alone cannot pass locomotion/ground-contact checks for a rig that does not yet exist.

## Remaining owner judgement

1. Review one corrected Alesia composition with both walls before more historical cuts: hill/topography, Republican equipment and cavalry silhouette; choose restrained civilian treatment for beat 4. Candidate A's approval covers atmospheric scenery only. The Royer sources remain unapproved references; shipping their known period errors unchanged is not recommended.
2. Review the integrated atmospheric framing, grade and repaired terrain edge across the entire camera sweep. The source/preparation decision is settled, but draft horizon placement and distant artifacts are still visible art issues to resolve.
3. Audition the approved synthesized wind and two Kenney cues in context, including loop seam, fade, levels and the quiet Mandubii beat. Source approval does not establish a finished mix; natural wind D is unapproved and unused.

No asset/source in this list resolves final historical review, human pacing/LUT/light-source judgement or mobile GPU acceptance. Integration should report the exact approved atmospheric/audio files it consumes and preserve the remaining placeholder boundary.
