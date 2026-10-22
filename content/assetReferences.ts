import type { ManifestEntry, Region } from "./schema";

// Public URLs map to one canonical on-disk location; reject traversal,
// query strings and remote URLs rather than granting arbitrary fetches.
export function assetFile(asset: string): string | null {
  return /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.(webp|mp3|ogg|wav)$/.test(asset)
    ? `public/assets/${asset}` : null;
}

export function approvedAssetUrl(asset: string, manifest: readonly ManifestEntry[]): string | undefined {
  const file = assetFile(asset);
  const entry = manifest.find((row) => row.file === file);
  if (!file || !entry?.approval || !/^(CC0|Public domain)$/i.test(entry.licence)) return undefined;
  return `/assets/${asset}`;
}

export function validateAssetReferences(region: Region, manifest: readonly ManifestEntry[], exists: (file: string) => boolean): string[] {
  const issues: string[] = [];
  const check = (asset: string) => {
    const file = assetFile(asset);
    if (!approvedAssetUrl(asset, manifest)) issues.push(`asset "${asset}" needs a safe path and a human-approved PD/CC0 manifest entry`);
    if (!file || !exists(file)) issues.push(`missing asset "${asset}"`);
  };
  for (const plane of region.scene.planes) if (!plane.placeholder) check(plane.asset);
  for (const asset of Object.values(region.scene.audioAssets)) check(asset);
  if (!region.scene.audioPlaceholder) {
    if (region.scene.ambientBed !== "none" && !region.scene.audioAssets[region.scene.ambientBed]) issues.push(`missing ambient bed "${region.scene.ambientBed}"`);
    for (const beat of region.beats) if (beat.audio.cue && !region.scene.audioAssets[beat.audio.cue]) issues.push(`${beat.id}: missing audio cue "${beat.audio.cue}"`);
    for (const beat of region.beats) if (beat.audio.bed && !region.scene.audioAssets[beat.audio.bed]) issues.push(`${beat.id}: missing audio bed "${beat.audio.bed}"`);
  }
  return issues;
}
