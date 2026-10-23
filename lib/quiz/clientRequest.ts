import { z } from "zod";

export function clientError(cause: unknown, fallback: string): string {
  return cause instanceof Error && !(cause instanceof z.ZodError) && !(cause instanceof TypeError) && !(cause instanceof SyntaxError) ? cause.message : fallback;
}

export async function quizRequest(path: string, body?: unknown, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin", cache: "no-store", signal,
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : "The quiz request failed. Try again.";
    throw new Error(message);
  }
  return data;
}
