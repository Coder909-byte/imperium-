# 003. Art direction: painted planes over monochrome engraving

## Context

The original art direction (PRD §3, v1.0–1.1) specified animated engraving: every scene plane sourced from public-domain etchings (Piranesi, Cichorius), desaturated, levelled, and converted from luminance to alpha, then tinted at runtime with `ColorMatrixFilter`. The reason was consistency — mixing scans from different sources, papers, and eras looks like a ransom note unless something unifies them, and stripping every asset to monochrome-with-alpha and applying one palette in code was a way to get that for free.

Since that decision, the post chain (PRD §4) grew a per-scene LUT applied via `ColorMatrixFilter` over the whole stage, adopted for grading rather than for cross-source consistency. It turns out to solve the same problem the monochrome constraint was solving, for full-colour planes as well as monochrome ones. Once that's true, monochrome stops being load-bearing — it was constraining the source material for a problem already solved elsewhere in the pipeline, and 19th-century academic history painting (Gérôme, Alma-Tadema, Poynter, Bierstadt) is public domain in high resolution and materially closer to the reference photorealistic look than line art, at the same plane-separation effort.

## Decision

Primary sources move to full-colour academic history painting. Backdrop planes keep their native colour — no desaturation, no levels pass, no luminance-to-alpha conversion. Consistency across sources comes from the per-scene LUT in the post chain, not from stripping colour at the asset level. The plane-separation workflow (5–8 planes, lasso and clone-stamp) and the Pixi pipeline are unchanged.

Alpha-from-luminance is retained, scoped down: cutout character parts and foreground silhouettes, where a clean matte matters more than colour fidelity, and where engraved line art's near-binary ink/paper contrast still mattes cleanly in a way a painted figure doesn't. Engravings (Piranesi, Cichorius) demote from primary source to reference and fallback — architectural detail, figure poses, and the character-rig source library, used where no suitable painting exists or where a puppet rig needs a clean matte.

Documented but not adopted: if painted planes still read flat once grade, camera drift, and particles are in, Blender (free) rendering to layered alpha PNGs is the escape hatch, fed by Poly Haven/ambientCG (CC0 HDRIs and textures) and Mixamo (rigging and mocap, verified free for unlimited commercial use but unmaintained — keep local copies). This is a real cost (2–3 weeks learning, +5–9h per scene, ~60–100h across the launch set) taken only if the record after M8 (Gallia, painted planes) says the floor is too low, and only surgically — characters before backdrops.

## Consequences

Scenes get materially closer to the target photorealistic look at no additional art-hour cost — the per-region estimate (PRD §9) holds at ~5h, because sourcing and plane separation are unchanged and export gets simpler, not harder. The rights-verification discipline (individual asset status checked, manifest row recorded at download, artist death date is not proof) carries over unchanged and remains non-negotiable.

The cost lands on asset size: full-colour WebP planes don't compress as tightly as monochrome-with-alpha did, so the < 2.5MB scene payload budget (PRD §11) — set against the old estimate — needs re-verifying once the first painted scene ships in M8, not assumed to still hold. The schema's per-plane `tint` field now only does useful work on alpha planes (characters, silhouettes); colour backdrop planes are graded by the scene-level `lut` instead, which is a small asymmetry worth remembering when writing region JSON. Character rigs stay dependent on engraving-quality source material — profile-carved figures with clean ink/paper separation — so that pipeline, and the Cichorius library specifically, isn't going away even as backdrops move to colour.
