// Filesystem access keeps the authored answer bank on the server/CLI boundary.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Question } from "@/content/questionSchema";
import { QuizError } from "./grading";

export function readQuestionBank(regionId?: string): Question[] {
  const path = join(process.cwd(), "content", "questions");
  const questions = readdirSync(path).filter(file => file.endsWith(".json")).sort()
    .map(file => Question.parse(JSON.parse(readFileSync(join(path, file), "utf8"))));
  const bank = regionId ? questions.filter(question => question.regionId === regionId) : questions;
  if (regionId && bank.length !== 5) throw new QuizError(404, "A quiz has not been written for this region. Return to the atlas.");
  return bank;
}
