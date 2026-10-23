import { z } from "zod";
import { StartRequest } from "@/lib/quiz/contracts";
import { startQuiz, getQuiz } from "@/lib/quiz/service";
import { quizRoute, requestJSON, quizContext, jsonResponse } from "@/lib/quiz/http";

export async function POST(request: Request) {
  return quizRoute(async () => {
    const input = StartRequest.parse(await requestJSON(request));
    const { owner, cookie } = await quizContext(request, true);
    return jsonResponse(await startQuiz(owner, input.regionId), cookie);
  });
}

export async function GET(request: Request) {
  return quizRoute(async () => {
    const id = z.uuid().parse(new URL(request.url).searchParams.get("id"));
    const { owner } = await quizContext(request);
    return jsonResponse(await getQuiz(owner, id));
  });
}
