import { z } from "zod";

export const QuizId = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/);
export const QuestionOption = z.object({ id: QuizId, text: z.string().trim().min(1) }).strict();
export const PublicQuestion = z.object({
  id: QuizId,
  prompt: z.string().trim().min(1),
  options: z.array(QuestionOption).length(4),
}).strict();
export type PublicQuestion = z.infer<typeof PublicQuestion>;
export type QuestionOption = z.infer<typeof QuestionOption>;
