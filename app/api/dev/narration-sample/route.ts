import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export async function GET() {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  const path = join(process.cwd(), "content/assets/staging/gallia/audio/narration-george-sample.wav");
  if (!existsSync(path)) return new Response("Narration sample is missing. Generate the review sample first.", { status: 404 });
  const bytes = new Uint8Array(readFileSync(path));
  return new Response(bytes, { headers: { "Content-Type": "audio/wav", "Content-Length": String(bytes.byteLength), "Cache-Control": "no-store" } });
}
