# Atlas region inventory — 2026-10-22

The repository contains **24 map provinces, one authored campaign and two development fixtures**. There are no authored campaign files for the other 23 provinces. Their absence is content production work, not a failed scene load. All region IDs below are exact filenames; `africa_prov` deliberately includes an underscore.

Era columns describe whether the province can be selected on that historical map, using the province's inclusive `heldFrom`/`heldTo`. They do not claim a scene is available. Totals are 1 / 5 / 23 / 9 for 350 BC / 200 BC / 117 AD / 486 AD. Direct named Coming soon routes remain accessible outside those historical ranges.

| Region ID | Province / Latin label | 350 BC | 200 BC | 117 AD | 486 AD | Route | Authored content / asset readiness |
|---|---|---|---|---|---|---|---|
| aegyptus | Aegyptus / Aegyptus | — | — | yes | yes | `/scene/aegyptus` | Unauthored; Coming soon |
| africa_prov | Africa / Africa Proconsularis | — | — | yes | — | `/scene/africa_prov` | Unauthored; Coming soon |
| anatolia | Cappadocia & Pontus / Cappadocia et Pontus | — | — | yes | yes | `/scene/anatolia` | Unauthored; Coming soon |
| armenia | Armenia / Armenia | — | — | yes | — | `/scene/armenia` | Unauthored; Coming soon |
| asia | Asia / Provincia Asiae | — | — | yes | yes | `/scene/asia` | Unauthored; Coming soon |
| britannia | Britannia / Britannia | — | — | yes | — | `/scene/britannia` | Unauthored; Coming soon |
| corsica | Corsica / Corsica | — | yes | yes | — | `/scene/corsica` | Unauthored; Coming soon |
| creta | Creta / Creta et Cyrenaica | — | — | yes | yes | `/scene/creta` | Unauthored; Coming soon |
| cyprus | Cyprus / Cyprus | — | — | yes | yes | `/scene/cyprus` | Unauthored; Coming soon |
| dacia | Dacia / Dacia Traiana | — | — | yes | — | `/scene/dacia` | Unauthored; Coming soon |
| dalmatia | Dalmatia / Illyricum | — | — | yes | — | `/scene/dalmatia` | Unauthored; Coming soon |
| gallia | Gallia / Gallia Comata | — | — | yes | — | `/scene/gallia` | Six beats; seven explicit placeholder planes, procedural legionary/crowds, pending audio |
| graecia | Achaea / Achaea et Macedonia | — | — | yes | yes | `/scene/graecia` | Unauthored; Coming soon |
| hispania | Hispania / Hispaniae | — | yes | yes | — | `/scene/hispania` | Unauthored; Coming soon |
| italia | Italia / Italia | — | yes | yes | — | `/scene/italia` | Unauthored; Coming soon |
| judaea | Judaea / Iudaea | — | — | yes | yes | `/scene/judaea` | Unauthored; Coming soon |
| latium | Latium / Ager Romanus | yes | — | — | — | `/scene/latium` | Unauthored; Coming soon |
| mauretania | Mauretania / Mauretania | — | — | yes | — | `/scene/mauretania` | Unauthored; Coming soon |
| mesopotamia | Mesopotamia / Mesopotamia | — | — | yes | — | `/scene/mesopotamia` | Unauthored; Coming soon |
| moesia | Moesia & Thracia / Moesia et Thracia | — | — | yes | yes | `/scene/moesia` | Unauthored; Coming soon |
| raetia | Raetia & Pannonia / Prov. Danuvianae | — | — | yes | — | `/scene/raetia` | Unauthored; Coming soon |
| sardinia | Sardinia / Sardinia et Corsica | — | yes | yes | — | `/scene/sardinia` | Unauthored; Coming soon |
| sicilia | Sicilia / Provincia Siciliae | — | yes | yes | — | `/scene/sicilia` | Unauthored; Coming soon |
| syria | Syria / Provincia Syriae | — | — | yes | yes | `/scene/syria` | Unauthored; Coming soon |

`content/regions/placeholder.json` has five engine-test beats at `/scene/placeholder`; `actor-stress.json` has one performance-test beat at `/scene/actor-stress`. Both have civilisation `Test`, procedural art and no province polygon, so neither appears in the campaign catalog. The existing `?dev=1` placeholder link is still explicitly marked as development access. Germania is named in the PRD's proposed launch list but has neither a province file nor a scene file; it is not a hidden clickable region.

## Root causes and implemented entry behaviour

- Every held province previously announced “open scene”, irrespective of content. Held province actions now say either “open scene preview” or “coming soon”, with solid/dashed outlines and a legend. Keyboard focus exposes the same status teaser as pointer hover.
- The default 350 BC map contains only Latium, so the sole authored campaign was undiscoverable without switching eras or typing its URL. The catalog now exposes Gallia with its explicit **52 BC** date and **six-beat / preview-artwork** status from every era. The map's historical held set remains unchanged.
- `africa_prov` was rejected by both content and province metadata route allowlists. The existing ID now resolves to **Africa / Africa Proconsularis**. No thin scene was added.
- Malformed authored JSON previously returned the same null result as missing content. Schema and filename/ID failures now surface as errors; only genuinely absent region files become Coming soon.
- Unknown IDs previously received invented title-cased campaign shells. They now return404. Known unauthored provinces retain their actual display and Latin names, accessible return control and no canvas or play action.
- The unavailable shell reused an absolutely positioned panel inside the player's narrow-screen auto-height box. It now has its own fluid dark layout and minimum height, preventing content/control clipping independently of the scene canvas.

## Historical discrepancy needing review

Gallia's province range is **50 BC–476 AD**; the scene region metadata is **58 BC–486 AD**, and all six scene beats describe **52 BC**. These are different concepts but the inconsistent end dates also merit review. No source here establishes which territorial ranges should win, so the audit preserves them. The preview card labels the actual beat date and does not imply the battle occurs in the selected 117 AD map era.

## Verification

`app/atlas/availability.test.ts` checks the actual catalog, all 24 ID/metadata mappings including Africa, traversal rejection and malformed/misidentified authored content. `e2e/region-entry.spec.ts` exercises keyboard entry into Gallia from the initial atlas, era status counts, Africa's named unavailable state, all 23 unauthored HTTP routes, narrow reduced-motion navigation and unknown-ID 404 behaviour. Existing atlas and transition suites are updated to assert honest Coming soon actions while preserving their held-set, hover-opacity, morph and cloud-lifecycle checks.

Focused verification passed: **13 unit tests** (availability plus held regions), TypeScript check, lint of the changed entry modules, and **22 browser tests** across `region-entry.spec.ts`, `atlas.spec.ts` and `transition.spec.ts`, using desktop Chrome against the local development server on port 3000. Every unauthored route returned HTTP 200 with its named Coming soon shell; the unknown ID returned 404. The existing cloud-transition layout-shift test recorded 0. These do not establish finished art or mobile GPU performance. Final integrated verification and screenshot inspection are recorded in the M8 handoff.

Art/audio approval, final composition and real-device acceptance remain M8 gates described in [the Gallia handoff](m8-gallia-handoff.md). This inventory does not count procedural preview rendering as a finished campaign.
