import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { QuizError } from "./grading";
import type { Owner } from "./store";

export const GUEST_COOKIE = "imperium_quiz_guest";
export function hashGuest(token: string): string { return createHash("sha256").update(token).digest("hex"); }

export async function quizContext(request: Request, createGuest = false) {
  const session = await auth.api.getSession({ headers: request.headers });
  const raw = request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${GUEST_COOKIE}=`))?.slice(GUEST_COOKIE.length + 1);
  let token = raw && /^[a-f0-9]{64}$/.test(raw) ? raw : null;
  const mint = createGuest && !session && !token;
  if (mint) token = randomBytes(32).toString("hex");
  const owner: Owner = { userId: session?.user.id ?? null, guestHash: token ? hashGuest(token) : null };
  const cookie = mint ? `${GUEST_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=15552000${new URL(env.BETTER_AUTH_URL).protocol === "https:" ? "; Secure" : ""}` : null;
  return { owner, cookie };
}

export async function requestJSON(request: Request): Promise<unknown> {
  if (request.headers.get("origin") !== new URL(env.BETTER_AUTH_URL).origin) throw new QuizError(403, "This request came from another site. Reload Imperium and try again.");
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new QuizError(415, "Send this request as JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new QuizError(400, "The request is empty. Try again.");
  let bytes = 0;
  const parts: Uint8Array[] = [];
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > 16_384) { await reader.cancel(); throw new QuizError(413, "This request is too large. Reopen the quiz and try again."); }
    parts.push(part.value);
  }
  try { return JSON.parse(Buffer.concat(parts).toString("utf8")); }
  catch { throw new QuizError(400, "The request could not be read. Try again."); }
}

export function jsonResponse(data: unknown, cookie?: string | null) {
  const headers = new Headers({ "Cache-Control": "no-store", Vary: "Cookie" });
  if (cookie) headers.set("Set-Cookie", cookie);
  return Response.json(data, { headers });
}

export async function quizRoute(action: () => Promise<Response>) {
  try { return await action(); }
  catch (error) {
    const status = error instanceof QuizError ? error.status : error instanceof z.ZodError ? 400 : 503;
    const message = error instanceof QuizError ? error.message : status === 400 ? "The submitted fields are invalid. Reload the quiz and try again." : "Progress could not be saved. Check your connection and try again.";
    return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store", Vary: "Cookie" } });
  }
}
