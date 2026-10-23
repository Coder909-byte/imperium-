import { AnswerRequest } from "@/lib/quiz/contracts";
import { answerQuiz } from "@/lib/quiz/service";
import { quizRoute, requestJSON, quizContext, jsonResponse } from "@/lib/quiz/http";

export async function POST(request: Request) {
  return quizRoute(async () => {
    const input = AnswerRequest.parse(await requestJSON(request));
    const { owner } = await quizContext(request);
    return jsonResponse(await answerQuiz(owner, input));
  });
}
