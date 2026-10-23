import { z } from "zod";
import { PublicQuestion, QuizId as Id } from "./quizPublicSchema";
export { QuestionOption } from "./quizPublicSchema";

const Quip = z.string().trim().min(1).refine(text => text.split(/\s+/).length < 30, "Feedback must be under 30 words")
  .refine(text => !/\b(oof|yikes|bruh)\b|!{2,}/i.test(text), "Use restrained feedback");

export const Question = PublicQuestion.extend({
  regionId: Id,
  beatIds: z.array(Id).min(1),
  era: z.string().min(1),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  correctOptionId: Id,
  explanation: z.string().trim().min(1),
  feedbackByOptionId: z.record(Id, Quip),
  sources: z.array(z.object({ label: z.string().min(1), url: z.string().url().optional() }).strict()).min(1),
}).strict().superRefine((question, ctx) => {
  const ids = new Set(question.options.map(option => option.id));
  if (ids.size !== 4) ctx.addIssue({ code: "custom", message: "Option IDs must be unique", path: ["options"] });
  if (!ids.has(question.correctOptionId)) ctx.addIssue({ code: "custom", message: "Correct option is not in this question", path: ["correctOptionId"] });
  if (Object.keys(question.feedbackByOptionId).length !== 4 || [...ids].some(id => !Object.hasOwn(question.feedbackByOptionId, id))) {
    ctx.addIssue({ code: "custom", message: "Feedback must match all four option IDs, including the correct option", path: ["feedbackByOptionId"] });
  }
});

export type Question = z.infer<typeof Question>;
