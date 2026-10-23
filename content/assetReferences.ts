import type { ManifestEntry, Region, Rig } from "./schema";

// Same binary-MB convention as forge/budget.ts's 2.5MB / 6 ≈ 427KB.
export const SCENE_ASSET_BUDGET_BYTES = 2.5 * 1024 * 1024;

// Public URLs map to one canonical on-disk location; reject traversal,
// query strings and remote URLs rather than granting arbitrary fetches.
export function assetFile(asset: string): string | null {
  return /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.(webp|mp3|ogg|wav)$/.test(asset)
    ? `public/assets/${asset}` : null;
}

export function approvedAssetUrl(asset: string, manifest: readonly ManifestEntry[], usage: "asset" | "atmosphere" | "structure-draft" | "character-draft" | "narration" = "asset"): string | undefined {
  const file = assetFile(asset);
  const entry = manifest.find((row) => row.file === file);
  if (!file || !entry?.approval) return undefined;
  if (entry.synthesis) {
    // A model's licence never silently becomes an output licence or art
    // approval. Generated recordings need their own scoped human review.
    if (usage !== "narration" || entry.approval.scope !== "generated-narration" || entry.derivation
      || entry.licence !== "Generated stock-voice narration" || !/\.(mp3|ogg|wav)$/.test(file)
      || ![entry.synthesis.model.licence, entry.synthesis.voice.licence].every(licence => /^(Apache-2\.0|MIT|CC0|Public domain)$/.test(licence))) return undefined;
    return `/assets/${asset}`;
  }
  if (entry.derivation) {
    const source = manifest.find((row) => row.file === entry.derivation?.sourceFile);
    // Separate source/derivative approvals prevent scenery permission
    // from silently becoming permission for historical reconstruction.
    const scoped = entry.derivation.kind === "ai-assisted-atmosphere"
      ? usage === "atmosphere" && entry.approval.scope === "atmospheric-derivative"
      : entry.derivation.kind === "ai-assisted-structure-draft"
        ? usage === "structure-draft" && entry.approval.scope === "structural-draft"
        : usage === "character-draft" && entry.approval.scope === "character-draft";
    if (!scoped || !file.endsWith(".webp")
      || !source?.approval || source.derivation || !/^(CC0|Public domain)$/i.test(source.licence)) return undefined;
  } else if (!/^(CC0|Public domain)$/i.test(entry.licence)) return undefined;
  return `/assets/${asset}`;
}

export function validateAssetReferences(region: Region, manifest: readonly ManifestEntry[], exists: (file: string) => boolean): string[] {
  const issues: string[] = [];
  const check = (asset: string, usage: "asset" | "atmosphere" | "structure-draft" | "narration" = "asset") => {
    const file = assetFile(asset);
    if (!approvedAssetUrl(asset, manifest, usage)) issues.push(`asset "${asset}" needs a safe path and a human-approved rights/provenance entry for its use`);
    if (!file || !exists(file)) issues.push(`missing asset "${asset}"`);
  };
  for (const plane of region.scene.planes) if (!plane.placeholder) {
    if (!plane.asset.endsWith(".webp")) issues.push(`plane "${plane.id}" requires a WebP image`);
    check(plane.asset, plane.role === "atmosphere" ? "atmosphere" : plane.draft ? "structure-draft" : "asset");
  }
  const narrations = new Set(region.beats.flatMap(beat => beat.audio.narration ? [beat.audio.narration.asset] : []));
  const narrationAssets = new Set([...narrations].map(id => region.scene.audioAssets[id]));
  for (const [id, asset] of Object.entries(region.scene.audioAssets)) {
    if (!/\.(mp3|ogg|wav)$/.test(asset)) issues.push(`audio "${asset}" requires MP3, OGG or WAV`);
    check(asset, narrations.has(id) ? "narration" : "asset");
  }
  for (const beat of region.beats) {
    const narration = beat.audio.narration;
    if (narration && !region.scene.audioAssets[narration.asset]) issues.push(`${beat.id}: missing narration "${narration.asset}"`);
    if ([region.scene.ambientBed, beat.audio.bed, beat.audio.cue].some(id => id && (narrations.has(id) || narrationAssets.has(region.scene.audioAssets[id])))) issues.push(`${beat.id}: narration cannot also be an ambient bed or cue`);
  }
  if (!region.scene.audioPlaceholder) {
    if (region.scene.ambientBed !== "none" && !region.scene.audioAssets[region.scene.ambientBed]) issues.push(`missing ambient bed "${region.scene.ambientBed}"`);
    for (const beat of region.beats) if (beat.audio.cue && !region.scene.audioAssets[beat.audio.cue]) issues.push(`${beat.id}: missing audio cue "${beat.audio.cue}"`);
    for (const beat of region.beats) if (beat.audio.bed && !region.scene.audioAssets[beat.audio.bed]) issues.push(`${beat.id}: missing audio bed "${beat.audio.bed}"`);
  }
  return issues;
}

export function measureRegionAssets(region: Region, rigs: readonly Rig[], fileSize: (file: string) => number) {
  const usedRigIds = new Set(region.beats.flatMap((beat) => beat.actors.map((actor) => actor.rig)));
  const refs = [
    ...region.scene.planes.filter((plane) => !plane.placeholder).map((plane) => plane.asset),
    ...Object.values(region.scene.audioAssets),
    ...rigs.filter((rig) => usedRigIds.has(rig.id)).flatMap((rig) => rig.parts.map((part) => part.texture)),
  ];
  const files = [...new Set(refs.flatMap((ref) => assetFile(ref) ?? []))];
  const bytes = files.reduce((total, file) => total + fileSize(file), 0);
  const audioFiles = [...new Set(Object.values(region.scene.audioAssets).flatMap(ref => assetFile(ref) ?? []))];
  const narrationFiles = [...new Set(region.beats.flatMap(beat => {
    const ref = beat.audio.narration && region.scene.audioAssets[beat.audio.narration.asset];
    return ref ? assetFile(ref) ?? [] : [];
  }))];
  return { files, bytes, audioBytes: audioFiles.reduce((total, file) => total + fileSize(file), 0),
    narrationBytes: narrationFiles.reduce((total, file) => total + fileSize(file), 0), fits: bytes < SCENE_ASSET_BUDGET_BYTES };
}
