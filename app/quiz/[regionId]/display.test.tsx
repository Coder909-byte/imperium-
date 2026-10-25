import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QuizClient } from "./QuizClient";
import { QuizResults } from "./QuizResults";
import { QuizView } from "@/lib/quiz/contracts";

describe("quiz display metadata", () => {
  it("uses the selected episode's date and name before submission", () => {
    const html = renderToStaticMarkup(<QuizClient regionId="italia" name="Italia" year="January 49 BC" />);
    expect(html).toContain("January 49 BC · Italia");
    expect(html).not.toMatch(/Gallia|52 BC|correctOptionId/);
  });

  it("labels results with supplied public metadata rather than Gallia", () => {
    // This synthetic view checks display glue, not an authored Italia bank.
    const view = QuizView.parse({
      id: "5d7b870f-c111-4c97-b631-979f91f847b0", regionId: "italia",
      questions: Array.from({ length: 5 }, (_, i) => ({ id: `fixture-${i}`, prompt: "Fixture only", options: ["a", "b", "c", "d"].map(id => ({ id, text: id })) })),
      answers: [], finished: true, score: 0, xpAwarded: 0, potentialXP: 0, authenticated: false, progress: null,
    });
    const html = renderToStaticMarkup(<QuizResults view={view} name="Italia" retry={() => {}} pending={false} />);
    expect(html).toContain("Italia · The record");
    expect(html).not.toContain("Gallia");
  });
});
