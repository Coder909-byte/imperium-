import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Shell } from "@/app/_components/shell/Shell";
import { readQuestionBank } from "@/lib/quiz/bank";
import { loadRegionContent } from "@/app/scene/[regionId]/loadContent";
import { QuizClient } from "./QuizClient";

export const metadata: Metadata = { title: "Gallia quiz — Imperium", robots: { index: false } };

export default async function QuizPage(props: PageProps<"/quiz/[regionId]">) {
  const { regionId } = await props.params;
  const region = loadRegionContent(regionId);
  if (!region || readQuestionBank().filter(question => question.regionId === regionId).length !== 5) notFound();
  return (
    <Shell account>
      <main id="main-content" className="shell-width max-w-3xl py-10 sm:py-16">
        <QuizClient key={region.id} regionId={region.id} name={region.latinName} />
      </main>
    </Shell>
  );
}
