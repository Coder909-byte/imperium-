import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { Question } from "@/content/questionSchema";
import { PublicQuestion } from "@/content/quizPublicSchema";
import { grade, publicQuestion } from "./grading";
import { validateQuizReferences } from "@/content/quizValidation";
import { Region } from "@/content/schema";

const bank = readdirSync("content/questions").filter(file => file.endsWith(".json")).map(file => Question.parse(JSON.parse(readFileSync(`content/questions/${file}`, "utf8"))));

describe("Gallia quiz content and grading boundary", () => {
  it("has five questions grounded in the final scene's beats and citations", () => {
    expect(bank).toHaveLength(5);
    const region = Region.parse(JSON.parse(readFileSync("content/regions/gallia.json", "utf8")));
    expect(validateQuizReferences(bank, [region])).toEqual([]);
    expect(validateQuizReferences(bank.slice(1), [region])).toContain("gallia: a quiz requires exactly five questions");
  });
  it("allowlists public fields instead of subtracting a single key", () => {
    for (const question of bank) {
      const result = publicQuestion(question);
      expect(Object.keys(result).sort()).toEqual(["id", "options", "prompt"]);
      expect(PublicQuestion.safeParse(result).success).toBe(true);
      expect(JSON.stringify(result)).not.toContain(question.explanation);
      expect(JSON.stringify(result)).not.toContain("feedbackByOptionId");
    }
  });
  it("grades all twenty options and returns feedback for the selected ID, including correct answers", () => {
    for (const question of bank) for (const option of question.options) {
      const result = grade(question, option.id);
      expect(result.correct).toBe(option.id === question.correctOptionId);
      expect(result.feedback).toBe(question.feedbackByOptionId[option.id]);
      expect(result.feedback.split(/\s+/).length).toBeLessThan(30);
    }
  });
  it("rejects mismatched options and malformed or incomplete feedback", () => {
    expect(() => grade(bank[0], "foreign-option")).toThrow("does not belong");
    expect(Question.safeParse({ ...bank[0], feedbackByOptionId: { ...bank[0].feedbackByOptionId, z: "Unknown" } }).success).toBe(false);
    expect(Question.safeParse({ ...bank[0], feedbackByOptionId: { a: "Only one" } }).success).toBe(false);
    expect(Question.safeParse({ ...bank[0], options: [bank[0].options[0], ...bank[0].options.slice(0, 3)] }).success).toBe(false);
  });
});
