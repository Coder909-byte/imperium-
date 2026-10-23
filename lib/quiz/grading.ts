import type { Question } from "@/content/questionSchema";
import type { PublicQuestion } from "@/content/quizPublicSchema";
import type { Verdict } from "./contracts";

export class QuizError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export function publicQuestion(question: Question): PublicQuestion {
  return { id: question.id, prompt: question.prompt, options: question.options.map(({ id, text }) => ({ id, text })) };
}

export function grade(question: Question, optionId: string): Verdict {
  if (!question.options.some(option => option.id === optionId)) throw new QuizError(400, "That option does not belong to this question. Choose one of the displayed options.");
  return {
    questionId: question.id, chosenOptionId: optionId, correct: optionId === question.correctOptionId,
    correctOptionId: question.correctOptionId, explanation: question.explanation,
    feedback: question.feedbackByOptionId[optionId], sources: question.sources,
  };
}
