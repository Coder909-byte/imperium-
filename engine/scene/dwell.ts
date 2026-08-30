// Autoplay dwell time (PRD §8.3, BeatDirector.ts). Never a fixed
// interval — a long beat read at a fixed pace gets cut off mid-sentence.
const MIN_DWELL_MS = 7000;
const WORDS_PER_SECOND = 3.2;
const READING_BUFFER_MS = 2500;

export function computeAutoplayDwellMs(body: string): number {
  const wordCount = body.trim().length === 0 ? 0 : body.trim().split(/\s+/).length;
  const readingMs = (wordCount / WORDS_PER_SECOND) * 1000 + READING_BUFFER_MS;
  return Math.max(MIN_DWELL_MS, readingMs);
}
