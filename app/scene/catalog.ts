// Server adapter: only this allowlist reaches display components, never
// the private question bank or a complete region's art/rig definitions.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { loadProvinceMeta } from "./[regionId]/loadProvince";
import { loadRegionContent } from "./[regionId]/loadContent";
import { readQuestionBank } from "@/lib/quiz/bank";

export function readCampaignCatalog() {
  const questions = readQuestionBank();
  return readdirSync(join(process.cwd(), "content", "regions"))
    .filter(file => file.endsWith(".json")).sort()
    .flatMap(file => {
      const id = file.slice(0, -5);
      if (!loadProvinceMeta(id)) return [];
      const region = loadRegionContent(id);
      if (!region || region.civilisation === "Test") return [];
      return [{ id: region.id, name: region.latinName, year: region.beats[0].year,
        quizAvailable: questions.filter(question => question.regionId === id).length === 5 }];
    });
}
