// Dev-only: re-reads and re-validates one content/regions/{id}.json file
// on every request, uncached, so /dev/scene-lab's polling actually picks
// up edits (PRD appendix — "loads any region JSON with hot reload").
// Not a route real users should ever reach.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextRequest } from "next/server";
import { Region } from "@/content/schema";

const REGIONS_DIR = join(process.cwd(), "content", "regions");
const VALID_ID = /^[a-z0-9-]+$/;

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ ok: false, error: "dev-only route" }, { status: 404 });
  }

  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!VALID_ID.test(id)) {
    return Response.json({ ok: false, error: "invalid region id" }, { status: 400 });
  }

  const path = join(REGIONS_DIR, `${id}.json`);
  if (!existsSync(path)) {
    return Response.json({ ok: false, error: `no content/regions/${id}.json` }, { status: 404 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(readFileSync(path, "utf-8"));
  } catch (error) {
    return Response.json({ ok: false, error: `invalid JSON: ${(error as Error).message}` }, { status: 400 });
  }

  const result = Region.safeParse(parsedJson);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
    return Response.json({ ok: false, error: issues }, { status: 400 });
  }

  return Response.json({ ok: true, data: result.data }, { headers: { "Cache-Control": "no-store" } });
}
