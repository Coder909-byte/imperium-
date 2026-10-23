import { createHash } from "node:crypto";
import type { ManifestEntry, Region } from "./schema";
import { assetFile } from "./assetReferences";

/** Server/CI only: keep recorded prose tied to the authored body without
 * adding a hashing runtime or answer/content imports to the engine. */
export function validateNarrationTranscripts(region: Region, manifest: readonly ManifestEntry[]): string[] {
  const issues: string[] = [];
  for (const beat of region.beats) {
    const narration = beat.audio.narration;
    if (!narration) continue;
    const hash = createHash("sha256").update(beat.body).digest("hex");
    if (hash !== narration.transcriptSha256) issues.push(`${beat.id}: narration transcript does not match the verbatim beat body`);
    const asset = region.scene.audioAssets[narration.asset];
    const source = manifest.find(row => row.file === (asset && assetFile(asset)));
    if (source?.synthesis && (source.synthesis.transcript !== beat.body
      || source.synthesis.transcriptSha256 !== hash || source.synthesis.durationMs !== narration.durationMs)) {
      issues.push(`${beat.id}: generated narration provenance differs from the body or duration`);
    }
  }
  return issues;
}

export function validateSynthesisTranscripts(manifest: readonly ManifestEntry[]): string[] {
  return manifest.flatMap(row => row.synthesis
    && createHash("sha256").update(row.synthesis.transcript).digest("hex") !== row.synthesis.transcriptSha256
    ? [`${row.file}: generated transcript hash does not match its text`] : []);
}
