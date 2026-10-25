# Atlas region inventory — updated 2026-10-25

The repository contains **24 map provinces, two authored playable campaigns, ten question files and two development fixtures**. Gallia's current experience is owner-accepted. Italia's outline, exact prose and artwork/use batch are approved; seven painted planes/six distinct settings, provisional commander/civic rigs, permitted infantry reuse, six new George recordings and five questions are integrated. Final Italia visual/listening/quiz acceptance remains distinct from production authorization. The other 22 provinces have no campaign file. See [Italia status](regions/italia-status.md). All IDs below are exact filenames; `africa_prov` deliberately includes an underscore.

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
| gallia | Gallia / Gallia Comata | — | — | yes | — | `/scene/gallia` | Accepted current six-beat visuals/narration and quiz; approved art, three painted provisional infantry rigs/crowds, six recordings + wind/two cues. Two placeholder planes and absent specialist roles are documented in [Gallia status](regions/gallia-status.md). |
| graecia | Achaea / Achaea et Macedonia | — | — | yes | yes | `/scene/graecia` | Unauthored; Coming soon |
| hispania | Hispania / Hispaniae | — | yes | yes | — | `/scene/hispania` | Unauthored; Coming soon |
| italia | Italia / Italia | — | yes | yes | — | `/scene/italia` | Six-beat January 49 BC episode: editorially approved prose/citations, painted river/town/courtyard art, provisional commander/civic figures, six George recordings and five questions. Locally reviewable; final experience acceptance pending. |
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

## Historical diagnosis and entry behaviour — Gallia-only checkpoint

- Every held province previously announced “open scene”, irrespective of content. Held province actions now say either “open scene preview” or “coming soon”, with solid/dashed outlines and a legend. Keyboard focus exposes the same status teaser as pointer hover.
- The default 350 BC map contains only Latium, so the sole authored campaign was undiscoverable without switching eras or typing its URL. The catalog now exposes Gallia with its explicit **52 BC** date and **six-beat / preview-artwork** status from every era. The map's historical held set remains unchanged.
- `africa_prov` was rejected by both content and province metadata route allowlists. The existing ID now resolves to **Africa / Africa Proconsularis**. No thin scene was added.
- Malformed authored JSON previously returned the same null result as missing content. Schema and filename/ID failures now surface as errors; only genuinely absent region files become Coming soon.
- Unknown IDs previously received invented title-cased campaign shells. They now return404. Known unauthored provinces retain their actual display and Latin names, accessible return control and no canvas or play action.
- The unavailable shell reused an absolutely positioned panel inside the player's narrow-screen auto-height box. It now has its own fluid dark layout and minimum height, preventing content/control clipping independently of the scene canvas.

## Historical discrepancy needing review

Gallia's province range is **50 BC–476 AD**; the scene region metadata is **58 BC–486 AD**, and all six scene beats describe **52 BC**. These are different concepts but the inconsistent end dates also merit review. No source here establishes which territorial ranges should win, so the audit preserves them. The preview card labels the actual beat date and does not imply the battle occurs in the selected 117 AD map era.

## Historical verification

`app/atlas/availability.test.ts` checks the actual catalog, all 24 ID/metadata mappings including Africa, traversal rejection and malformed/misidentified authored content. `e2e/region-entry.spec.ts` exercises keyboard entry into Gallia from the initial atlas, era status counts, Africa's named unavailable state, all 23 unauthored HTTP routes, narrow reduced-motion navigation and unknown-ID 404 behaviour. Existing atlas and transition suites are updated to assert honest Coming soon actions while preserving their held-set, hover-opacity, morph and cloud-lifecycle checks.

Focused verification passed: **13 unit tests** (availability plus held regions), TypeScript check, lint of the changed entry modules, and **22 browser tests** across `region-entry.spec.ts`, `atlas.spec.ts` and `transition.spec.ts`, using desktop Chrome against the local development server on port 3000. Every unauthored route returned HTTP 200 with its named Coming soon shell; the unknown ID returned 404. The existing cloud-transition layout-shift test recorded 0. These do not establish finished art or mobile GPU performance. Final integrated verification and screenshot inspection are recorded in the M8 handoff.

Current Gallia visuals/narration and its working quiz are owner-accepted; M8/M9 and M10 local work are complete for that baseline. The two Test fixtures are not campaigns. [Gallia status](regions/gallia-status.md) retains specific history/representation issues; [M11](m11-launch-scope.md) owns actual-device and other cross-cutting launch checks. The entry-behavior diagnosis and test counts above are historical evidence, not a fresh browser run in this reconciliation.

## Italia integration continuation — 2026-10-25

The atlas now exposes both Gallia and Italia previews from every era, with explicit episode dates independent of historical holdings. The 117 AD map has 2 scene previews and 21 Coming soon provinces; the complete inventory has 22 unauthored provinces. `app/atlas/availability.test.ts` and `e2e/region-entry.spec.ts` now assert that current inventory. Dedicated `e2e/italia.spec.ts` covers all six draft bodies/sources at desktop/narrow widths, clear temporary status, independent viewed-beat storage, campaign navigation and absence of an unwritten quiz. Exact fresh results and final-art limits live in the Italia status record; older counts above are retained as history.
