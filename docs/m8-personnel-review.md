# Gallia personnel preparation — M8 remains open

## Diagnosis and acceptance for this increment

The pale actors were intentional procedural shapes in `puppetTextures.ts`, not failed downloads or a tint defect. `PuppetActor` preserves incoming texture colour. Every Gallia group referenced the same `legionary` rig; its thirteen parts named `torso`, `head`, `limb` and `foot` were never replaced. `CrowdField` independently consumed a generic four-frame 24×48 silhouette canvas, so replacing puppet parts alone would leave the armies unchanged.

This increment requires readable provisional Roman/Gallic infantry at gameplay size, grounded cutout rigs, distinct inner/outer fighting in beat 5, painted instanced crowds, asynchronous motion, preserved prose/citations, and measured desktop checks. It does not complete M8's art, independent history, audience, listening or real-device acceptance gates.

## Equipment evidence and limits

| Reference | What it supports | Limits applied |
|---|---|---|
| [Musée d'Archéologie nationale: Vercingétorix et Alésia](https://musee-archeologienationale.fr/vercingetorix-et-alesia) | Site collections and simultaneous attacks from the relief army outside and Vercingetorix's army inside the Roman lines. | Research only; no museum/reconstruction pixels copied. Scene staging explains two directions without claiming a surveyed battle viewpoint. |
| [Éditions de la Sorbonne, *La bataille d'Alésia*, “Les moyens”](https://books.openedition.org/psorbonne/22565?lang=fr), especially §§4, 16–18 | Roman pilum and short pointed sword; Gallic equipment varied with wealth; long shields resemble contemporary Roman shields; mail and helmets were costly. | Full page currently has a bot challenge; indexed chapter passages were retrieved. No illustration reused. Neither side is defined by an exclusive helmet or mail type. |
| [Polybius, *Histories* 6.23](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Polybius/6*.html#23) | Earlier Republican convex scutum, central boss, Spanish sword and javelins. | Earlier than Caesar; not a complete equipment inventory for 52 BC. No Imperial rectangular scuta, segmental plate armour or parade crests introduced. |
| [Diodorus, *Library* 5.30](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Diodorus_Siculus/5B*.html#30) | Tunics, trousers, cloaks, long shields, spears, swords and some mail. | Outsider literary generalisation; neither nudity nor spectacular horned helmets made a default for Alesia. Exact colours, patterns, faces and poses remain interpretive. |
| [Met, helmet 2015.758.1](https://www.metmuseum.org/art/collection/search/684492) | Broad Montefortino-family dome/knob form; museum notes Roman adoption. | Earlier Etruscan object, late fourth/early third century BCE; modern cheekpieces are explicitly excluded as evidence for 52 BC. |

Roman mail, plain helmet and oval shield versus Gallic tunic/trousers and long shield provide a readable compositional distinction, not an assertion that every Roman was identically equipped or no Gaul wore mail. Shield colours are restrained art choices, not identified legion or tribe insignia. Formation counts are visual samples, never ancient troop totals.

## Approval and provenance

Owner explicitly approved on 2026-10-23: provisional Roman/Gallic reference pair, transparent rig parts and shared crowd atlases for Gallia's military beats, including routine variations. The approval excludes copying restricted reconstruction imagery and treating modern Met cheekpieces as period evidence. Generated work remains provisional pending historical review and is never labelled public domain.

The sole photographic input is [this exact Met image](https://collectionapi.metmuseum.org/api/collection/v1/iiif/684492/1587456/main-image), whose specific object page says **“Public Domain”**. The [Met Open Access policy](https://www.metmuseum.org/hubs/open-access) makes public-domain images available under CC0. The source record and source rights are stored separately from each generated asset's provenance and scoped owner approval in `content/assets/manifest.json`.

Preparation uses the built-in image generator, transparent alpha and full-colour WebP forge exports. Luminance-to-alpha would erase painted faces, clothing and mail; it is not used on these already separated painted parts. Distant figures are four sampled poses baked once from the same rig textures, sharing one atlas source per rig/action. No individual crowd puppet, new framework or additional network atlas payload is introduced.

## Prepared and integrated

The representative pair was first inspected at a 68px body height in desktop Chrome (`/tmp/imperium-m8-personnel-reference`). Assembled puppets were then inspected without painted crowds (`/tmp/imperium-m8-personnel-rig-pair-v2`). This caught an undersized spear and overly narrow foot separation; the corrected spear has a separate generated source, and the rear leg pivot placement was widened. Only after that check were the formations expanded.

`roman_infantry`, `gaul_warrior` and `gaul_warrior_blue` each contain six painted connected assemblies: body/tunic, head/neck, weapon arm, shield/arm, near leg/foot, far leg/foot. Tunic and shield occlusion hide hip/shoulder overlaps; full arm/leg assemblies keep natural painted anatomy during restrained rotations. This is the existing cutout hierarchy and clip solver, not a new animation system. These are infantry, not interchangeable civilian or mounted rigs. March is a restrained weight-shift cycle at this viewing distance; no claim of a full articulated gait is made.

The original procedural `legionary` stays available for engine examples/stress tests. Gallia references none of its parts or its generic crowd atlas. Every military actor in all six beats now resolves to a painted provisional rig. Beat 3's approaching forces include both clothed Gallic variations. Beat 5 retains **150 instanced crowd units and five key puppets**, with two Gallic groups beyond the inner wall, defenders at the rear line and in the corridor, and attackers on the ground outside the outer wall. Foreground attackers initially cropped at the caption edge; their ground placement and an explicit opening camera frame corrected this. The camera still travels through the unchanged reading dwell. All final prose and citation arrays are unchanged.

Crowds use four independently phased pose frames per rig/action, with deterministic random offsets, modest individual size variation and irregular rows. Phase is independent of row index; Roman and Gallic clip lengths differ. The original four authored crowd groups become eight; adjacent compatible groups share six particle containers without changing unit positions, phases, facing or draw order. key-actor sprite transforms fall from 65 to 30. Four atlases are cached over a full Gallia visit (Roman march and brace, two Gallic marches); the battle uses three. These textures cost runtime memory and upload work even though no additional atlas file is downloaded.

The rig inspector now accepts underscores in safe rig IDs and fits the painted rectangle rather than assuming a hip-centred procedural figure. Pivot overlays receive the same fit/translation as the actual puppet. The numerical linter covers all six clips on all three rigs, with actual rendered anatomy/foot placement also checked visually.

Unique referenced scene payload is **1,026,496 bytes / 25 files**, an increase of **174,804 bytes** from the previous 851,692-byte scene. Eighteen full-colour WebP parts account for the increase. Staging originals and transient atlases are excluded from the transferred-asset budget. The strict limit remains less than 2.5 MiB; no dependency was added.

## Generation briefs and reproducible preparation

Built-in imagegen was used throughout, with explicit real alpha transparency. The reference-pair prompt specified two full-body 7.5-head-proportioned figures facing three-quarter right, muted academic oil painting under diffuse overcast light, a balanced stance with visible grounded feet, no text or scenery. Roman: simple Montefortino-family helmet without crest, mail and tunic, curved oval shield with plain boss/spine, short sword, bare calves and leather sandals. Gaul: ochre belted long-sleeved tunic, blue-grey trousers, shoes, uncovered dark hair, plain green long shield and spear. No rectangular Imperial scutum, segmental armour, horned helmet, fantasy ornament, fur, tattoos or default shirtless costume. The exact Met image was the sole photographic input, explicitly limited to broad helmet family form and excluding its modern cheekpieces as evidence.

Separate six-cell cutout-sheet prompts preserved that pair's design and requested each complete connected assembly, transparent padding and hidden shoulder/hip overlap. A routine variation changed the Gallic tunic to slate blue, trousers to muted reddish brown, shield face to honey-brown wood, and hair to tied back; the palette and face changes are interpretation. A corrective portrait prompt requested the entire continuous long spear, iron leaf tip to wooden butt, with a proportionate bent ochre-sleeved arm gripping its middle. No new historical reference image was introduced.

Generated source PNGs, source URLs, output IDs, exact rights evidence and the separate scoped approvals are in the manifest. `scripts/prepare-gallia-personnel.mjs` records proportional alpha-bounded crops; crop positions are retained in its source and review JSON. It does not repaint or derive alpha from luminance. `npm run forge -- <part-directory> --source https://www.metmuseum.org/art/collection/search/684492 --licence 'Owner-approved provisional AI-assisted character draft' --artist 'AI-assisted preparation (built-in image generator)' --institution 'Imperium project' --quality 88 --out-dir public/assets/gallia/<rig-folder>` writes full-colour parts. `scripts/build-gallia-infantry-rigs.mjs` writes their authored geometry/clips and applies the already granted owner approval, preserving the separate source rights record. See ADR 014.

## Final desktop verification and performance

295 unit tests across 37 files, typecheck, lint, 34-file content validation with numerical rig lint, and the final production build pass. Across focused browser runs, 26 scene/audio/personnel checks and 8 painted-rig/legacy-inspector/region-entry checks pass. The painted atlas loader/cache test was repeated successfully after the batching optimization. The initial inspector run exposed rejected underscores; after fixing the route, an overly strict test label selector was corrected. All three painted rigs load all six clips, scrub and expose aligned pivot overlays. No auth/database-mutating tests ran. The ten-round-trip lifecycle check showed no context-exhaustion warning and -60,177 post-GC heap bytes; this is not a fixed-memory or device guarantee.

All six beats were captured and inspected separately in natural desktop low, forced high and 390px narrow modes, with no page errors or failed art responses. Beat 2 also has settled/reduced-motion captures. Final six-beat artifacts: /tmp/imperium-m8-personnel-six-final. Production beat 5 full/close captures: /tmp/imperium-m8-personnel-final. Larger rig and pivot captures: /tmp/imperium-m8-personnel-inspector. All original headlines, bodies and citation arrays were checked against HEAD and remain unchanged.

Method is unchanged: production build and local start on port 3002, then node scripts/measure-scene.mjs http://localhost:3002. Headless desktop Chrome, 1280×800, natural low tier; rAF windows are three seconds after a three-second battle lead-in at CDP CPU rates 1×/4×/6×. Exact served non-noModule script URLs are measured through real gzip HTTP response bodies. Scene-presented is the renderer postrender submission marker, not GPU completion or display scanout. This is neither a mobile GPU nor 4G test.

Raw runs are retained in [before](reviews/m8-personnel-performance-before.json), [first painted run with eight crowd containers](reviews/m8-personnel-performance-after-unbatched.json), and [final six-container run](reviews/m8-personnel-performance-after.json). Baseline was recorded at 2026-10-22T21:11:37Z; first painted at 21:52:25Z; final at 21:59:30Z (2026-10-23 locally). Each row is one three-second window; these are noisy local samples, not an isolated causal benchmark.

| Metric | Before | Final painted/batched |
|---|---:|---:|
| Scene referenced assets | 851,692 bytes / 7 files | 1,026,496 bytes / 25 files |
| Atlas initial JS, real gzip | 140,433 bytes | 140,433 bytes |
| Scene initial JS, real gzip | 138,180 bytes | 138,178 bytes |
| 1× battle rAF median / p95 | 16.7 / 83.3ms | 33.3 / 33.4ms |
| 4× battle rAF median / p95 | 33.4 / 133.3ms | 33.3 / 33.4ms |
| 6× battle rAF median / p95 | 33.4 / 150.0ms | 33.3 / 66.7ms |
| 1× direct navigation → scene-presented, three samples | 1945 / 2454 / 1283ms | 1943 / 1031 / 767ms |
| 1× fresh-context atlas click → scene-presented, three samples | 3728 / 2656 / 2767ms | 3041 / 3069 / 2616ms |
| 4× / 6× fresh atlas click → scene-presented | 6306 / 9372ms | 7072 / 11535ms |

The first painted run also had 33.3ms medians at every CPU rate. Combining compatible crowd groups reduced render submissions from eight to six, retaining all 150 units, but did not improve the measured median cadence. Relative to baseline the 1× median worsened, while tail intervals improved; an overall performance improvement is not established. The final 6× maximum was 133.4ms. First-beat scene-graph samples (which include image loading and atlas preparation) were 314/300/219ms at 1×, 284ms at 4× and 492ms at 6×. Two unthrottled atlas-entry samples exceed three seconds slightly, and throttled entry remains substantially over. The strict <16ms/device and network acceptance gates remain open; the measurements do not justify calling M8 complete or changing cloud-window initialization speculatively.

## Exact remaining blockers

- hillfort.webp in every beat; far_ridge.webp in 1–3/5–6. Missing files are explicit placeholders, not failed approved loads.
- Dedicated engineer/tool art for beat 2; expelled civilian people/crowds for beat 4; Caesar/horse/flanking cavalry for beat 5; Vercingetorix/horse for beat 6. Infantry approval does not cover these missing civilian/mounted assets.
- Final history/art/composition review of the provisional infantry and Motte wall studies, including site geometry, wall faces, engineering detail, repeated source placement, costume and interpretive colours. Beat 2 remains unfinished.
- Audible mix/listening and human end-to-end pacing acceptance; Safari, Pixel 6a-class GPU, real network and the actual M8 viewer acceptance criterion. Current desktop cadence/entry results leave a performance acceptance gap.

Open locally: /scene/gallia, beat 5, then the full six-beat sequence; /dev/scene-lab for high/low comparisons, the three named rigs and the individual approved-audio panel. Previously approved sky/ground/foreground, synthesized wind and Kenney work/cloth cues remain integrated and unchanged. M8 stays open; no M9–M11 work, commit or push was performed.
