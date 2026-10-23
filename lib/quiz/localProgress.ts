import { LocalProgress } from "./contracts";
import type { ProgressInput } from "./contracts";

export const LOCAL_PROGRESS_KEY = "imperium.progress.v1";
const empty = (): LocalProgress => ({ version: 1, sessionIds: [], regions: [] });

export function readLocalProgress(): LocalProgress {
  try {
    const raw = localStorage.getItem(LOCAL_PROGRESS_KEY);
    if (!raw) return empty();
    return LocalProgress.parse(JSON.parse(raw));
  } catch { throw new Error("Saved progress could not be read. Enable browser storage or clear Imperium's local data, then try again."); }
}

export function writeLocalProgress(progress: LocalProgress): boolean {
  try { localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(LocalProgress.parse(progress))); return true; }
  catch { return false; }
}

export function rememberQuiz(id: string): boolean {
  try {
    const progress = readLocalProgress();
    progress.sessionIds = [...new Set([...progress.sessionIds, id])].slice(-50);
    return writeLocalProgress(progress);
  } catch { return false; }
}

export function rememberBeat(regionId: string, beatId: string): ProgressInput | null {
  try {
    const progress = readLocalProgress();
    const existing = progress.regions.find(region => region.regionId === regionId);
    const region = { regionId, beatIds: [...new Set([...(existing?.beatIds ?? []), beatId])] };
    progress.regions = [...progress.regions.filter(region => region.regionId !== regionId), region].slice(-24);
    writeLocalProgress(progress);
    return region;
  } catch { return null; }
}

export function clearImported(acceptedIds: string[], regions: ProgressInput[]) {
  const latest = readLocalProgress();
  return writeLocalProgress({
    version: 1,
    sessionIds: latest.sessionIds.filter(id => !acceptedIds.includes(id)),
    regions: latest.regions.flatMap(region => {
      const imported = regions.find(item => item.regionId === region.regionId);
      const beatIds = region.beatIds.filter(id => !imported?.beatIds.includes(id));
      return beatIds.length ? [{ regionId: region.regionId, beatIds }] : [];
    }),
  });
}
