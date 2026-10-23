import type { Question } from "./questionSchema";
import type { Region } from "./schema";

export function validateQuizReferences(questions: readonly Question[], regions: readonly Region[]): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const question of questions) {
    if (ids.has(question.id)) issues.push(`Duplicate question ID: ${question.id}`);
    ids.add(question.id);
    const region = regions.find(region => region.id === question.regionId);
    if (!region) { issues.push(`${question.id}: unknown region`); continue; }
    const beats = region.beats.filter(beat => question.beatIds.includes(beat.id));
    if (beats.length !== new Set(question.beatIds).size) issues.push(`${question.id}: unknown beat reference`);
    if (question.sources.some(source => !beats.some(beat => beat.sources.some(reference => reference.label === source.label)))) {
      issues.push(`${question.id}: source is not cited by its referenced scene beats`);
    }
  }
  for (const regionId of new Set(questions.map(question => question.regionId))) {
    if (questions.filter(question => question.regionId === regionId).length !== 5) issues.push(`${regionId}: a quiz requires exactly five questions`);
  }
  return issues;
}
