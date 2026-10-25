import Link from "next/link";
import { useEffect, useRef } from "react";
import type { QuizView } from "@/lib/quiz/contracts";
import { PROGRESSION } from "@/lib/quiz/progression";

export function QuizResults({ view, name, retry, pending }: { view: QuizView; name: string; retry: () => void; pending: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <>
    <p className="shell-eyebrow">{name} · The record</p>
    <h1 ref={heading} tabIndex={-1} className="shell-heading mt-4">{view.score} out of 5</h1>
    <p className="mt-5 leading-relaxed">{view.authenticated ? `${view.xpAwarded} new XP banked. Previously credited questions do not award XP again.` : `Up to ${view.potentialXP} XP from this attempt. Signup verifies the record; previously credited questions do not award XP again.`}</p>
    {view.progress && <p className="mt-3 text-lg">{view.progress.rank} · {view.progress.xp} XP · {view.progress.streakDays}-day streak</p>}
    <p className="mt-3 text-sm text-[#655c4d]">{PROGRESSION.streakNotice}</p>
    {!view.authenticated && <div className="mt-6 border border-[#b2a083] p-5">
      <h2 className="text-xl">Keep your record.</h2>
      <p className="mt-2 leading-relaxed text-[#655c4d]">This browser keeps the attempt reference. Signup verifies the server record; local XP and old activity dates are never imported.</p>
      <Link href="/signup" className="shell-button shell-button-primary mt-4">Create an account</Link>
      <Link href="/login" className="ml-5 inline-block py-3 text-sm underline">Log in</Link>
    </div>}
    <div className="mt-7 flex flex-wrap gap-3">
      <button type="button" disabled={pending} onClick={retry} className="shell-button shell-button-primary">{pending ? "Preparing retry…" : "Retry quiz"}</button>
      <Link href="/atlas" prefetch={false} className="shell-button shell-button-outline">Return to the atlas</Link>
      {view.authenticated && <Link href="/profile" className="shell-button shell-button-outline">Your record</Link>}
    </div>
    <p className="mt-4 text-sm leading-relaxed text-[#655c4d]">Retries have no limit. Complete all five questions to bank XP for answers you have not previously earned. A completed practice retry can maintain your streak.</p>
    <section aria-label="Quiz explanations" className="mt-10 border-t border-[#c9baa0] pt-7">
      <h2 className="text-2xl">The answers, with context.</h2>
      <ol className="mt-6 space-y-8">{view.questions.map((question, index) => {
        const answer = view.answers.find(answer => answer.questionId === question.id);
        return answer && <li key={question.id}>
          <h3 className="text-lg leading-relaxed">{index + 1}. {question.prompt}</h3>
          <p className="mt-2 text-sm font-semibold">{answer.correct ? "Correct" : "Incorrect"} · {question.options.find(option => option.id === answer.correctOptionId)?.text}</p>
          <p className="mt-2 leading-relaxed">{answer.feedback}</p>
          <p className="mt-2 leading-relaxed text-[#655c4d]">{answer.explanation}</p>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-[#655c4d]">{answer.sources.map(source => <li key={source.label}>{source.url ? <a href={source.url} className="underline">{source.label}</a> : source.label}</li>)}</ul>
        </li>;
      })}</ol>
    </section>
  </>;
}
