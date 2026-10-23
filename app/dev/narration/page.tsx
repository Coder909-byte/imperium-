import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { loadManifest } from "@/app/scene/[regionId]/loadManifest";

export const metadata: Metadata = { title: "Gallia narration sample — Imperium" };

export default function NarrationReviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const sample = loadManifest().find(row => row.file.endsWith("/narration-george-sample.wav"))?.synthesis;
  if (!sample) notFound();
  return (
    <main className="mx-auto max-w-2xl p-6 text-neutral-100">
      <h1 className="text-2xl font-semibold">Gallia narration sample</h1>
      <p className="my-4">Press Play to hear the {sample.durationMs / 1000}-second sample. George is a stock synthetic British male voice, reading at 92% speed.</p>
      <audio className="w-full" controls preload="none" src="/api/dev/narration-sample" aria-label="Play Gallia narration sample" />
      <blockquote className="my-6 border-l border-neutral-500 pl-4">{sample.transcript}</blockquote>
      <p>The voice and pace are approved. This original review sample is separate from the scene player.</p>
      <p className="mt-4"><Link className="underline" href="/scene/gallia">Return to Gallia</Link></p>
    </main>
  );
}
