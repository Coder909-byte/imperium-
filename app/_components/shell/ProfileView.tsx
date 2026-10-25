import Link from "next/link";
import type { ReactNode } from "react";
import { Shell, Compass } from "./Shell";
import type { ProfileRecord } from "@/lib/quiz/contracts";
import { PROGRESSION } from "@/lib/quiz/progression";
import { RANKS } from "@/lib/ranks";
import { ProgressImport } from "./ProgressImport";
import { readCampaignCatalog } from "@/app/scene/catalog";

export function ProfileView({ email, logout, record }: { email: string; logout: ReactNode; record?: ProfileRecord }) {
  const campaigns = readCampaignCatalog();
  const names = new Map(campaigns.map(campaign => [campaign.id, campaign.name]));
  return (
    <Shell account>
      <main id="main-content" className="shell-width profile-main py-14 sm:py-20">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div><p className="shell-eyebrow">Your account</p><h1 className="shell-heading mt-4">Your record.</h1></div>
          {logout}
        </div>
        <dl className="profile-details mt-10 py-6"><dt className="shell-eyebrow mb-2">Email</dt><dd className="break-all text-lg">{email}</dd></dl>
        {record && <>
          <ProgressImport />
          <dl className="my-8 grid grid-cols-1 gap-6 border-b border-[#c9baa0] pb-8 sm:grid-cols-3" aria-label="Progress summary">
            <div><dt className="shell-eyebrow">Rank</dt><dd className="mt-2 text-2xl">{record.progress.rank}</dd></div>
            <div><dt className="shell-eyebrow">Experience</dt><dd className="mt-2 text-2xl">{record.progress.xp} XP</dd></div>
            <div><dt className="shell-eyebrow">Daily streak</dt><dd className="mt-2 text-2xl">{record.progress.streakDays} {record.progress.streakDays === 1 ? "day" : "days"}</dd></div>
          </dl>
          <p className="text-sm text-[#655c4d]">{PROGRESSION.streakNotice}</p>
          <section className="mt-10" aria-label="Quiz history">
            <h2 className="text-2xl">Quiz history</h2>
            {record.history.length ? <ol className="mt-5 divide-y divide-[#c9baa0]">{record.history.map(attempt => <li key={attempt.id} className="flex flex-wrap justify-between gap-3 py-4 leading-relaxed">
              <div><Link href={`/quiz/${attempt.regionId}`} className="underline">{names.get(attempt.regionId) ?? attempt.regionId}</Link><p className="mt-1 text-xs text-[#655c4d]">{new Date(attempt.finishedAt).toISOString().slice(0, 10)} · UTC</p></div>
              <p>{attempt.score} / {attempt.total} · {attempt.xpAwarded} new XP</p>
            </li>)}</ol> : <p className="mt-4 leading-relaxed text-[#655c4d]">No completed quizzes yet. Choose a quiz below.</p>}
            <div className="mt-5 flex flex-wrap gap-3">{campaigns.filter(campaign => campaign.quizAvailable).map(campaign =>
              <Link key={campaign.id} href={`/quiz/${campaign.id}`} className="shell-button shell-button-primary">Take the {campaign.name} quiz</Link>
            )}</div>
          </section>
          <section className="mt-10 border-t border-[#c9baa0] pt-7" aria-label="Scene progress">
            <h2 className="text-2xl">Scenes visited</h2>
            {record.regions.length ? <ul className="mt-4 space-y-3">{record.regions.map(region => <li key={region.regionId}><Link href={`/scene/${region.regionId}`} prefetch={false} className="underline">{names.get(region.regionId) ?? region.regionId}</Link> · {region.beatsViewed.length} beats viewed{region.completed ? " · All beats viewed" : ""}</li>)}</ul> : <p className="mt-4 text-[#655c4d]">No scene visits saved yet.</p>}
            <Link href="/atlas#stories" prefetch={false} className="mt-5 inline-block underline">Explore the stories and previews</Link>
          </section>
          <section className="mt-10 border-t border-[#c9baa0] pt-7" aria-label="Rank thresholds">
            <h2 className="text-2xl">The ranks</h2>
            <dl className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">{RANKS.map((rank, index) => <div key={rank}><dt>{rank}</dt><dd className="mt-1 text-sm text-[#655c4d]">{PROGRESSION.rankThresholds[index]} XP</dd></div>)}</dl>
            <p className="mt-5 text-sm leading-relaxed text-[#655c4d]">The available quizzes cannot unlock every rank yet. These thresholds are provisional and will be reassessed as more quizzes become available.</p>
          </section>
        </>}
        {!record &&
        <section className="profile-empty flex flex-col items-center px-5 py-14 text-center" aria-labelledby="profile-empty-title">
          <Compass className="mb-7 h-20 w-20" />
          <p className="shell-eyebrow">Still being charted</p>
          <h2 id="profile-empty-title" className="mt-4 text-3xl">Your journeys will have a home here.</h2>
          <p className="mt-4 max-w-md leading-relaxed">This sample shows the profile layout. Explore the atlas for available stories and previews.</p>
          <Link href="/atlas" prefetch={false} className="shell-button shell-button-primary mt-8">Explore the Atlas <span aria-hidden="true">↗</span></Link>
        </section>
        }
      </main>
    </Shell>
  );
}
