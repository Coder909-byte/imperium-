import { useEffect, useRef } from "react";
import type { PublicQuestion } from "@/content/quizPublicSchema";
import type { Verdict } from "@/lib/quiz/contracts";

export function QuizQuestion({ question, index, selected, verdict, pending, onSelect, onSubmit, onContinue }: {
  question: PublicQuestion; index: number; selected: string; verdict: Verdict | undefined; pending: boolean;
  onSelect: (id: string) => void; onSubmit: () => void; onContinue: () => void;
}) {
  const heading = useRef<HTMLLegendElement>(null);
  const feedback = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [question.id]);
  useEffect(() => { if (verdict) feedback.current?.focus(); }, [verdict]);
  return (
    <>
      <p className="shell-eyebrow mb-5">Question {index + 1} of 5 · No timer</p>
      <form onSubmit={event => { event.preventDefault(); onSubmit(); }} aria-busy={pending}>
        <fieldset disabled={pending || Boolean(verdict)}>
          <legend ref={heading} tabIndex={-1} className="mb-7 text-2xl leading-snug sm:text-3xl">{question.prompt}</legend>
          <div className="grid gap-3">
            {question.options.map(option => (
              <label key={option.id} className={`flex min-h-16 cursor-pointer items-start gap-4 border p-4 leading-relaxed focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#682c2e] ${verdict?.correctOptionId === option.id ? "border-[#3e563d] bg-[#e0e5d6]" : selected === option.id ? "border-[#682c2e] bg-[#e9decb]" : "border-[#b2a083] bg-[#fbf6e955]"}`}>
                <input type="radio" name={question.id} value={option.id} required checked={selected === option.id} onChange={() => onSelect(option.id)} className="mt-1 h-5 w-5 shrink-0 accent-[#682c2e]" />
                <span>{option.text}{verdict?.correctOptionId === option.id && <span className="mt-1 block font-sans text-xs font-semibold text-[#30462e]">Correct answer</span>}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {!verdict && <button type="submit" disabled={!selected || pending} className="shell-button shell-button-primary mt-7 w-full sm:w-auto">{pending ? "Submitting answer…" : "Submit answer"}</button>}
      </form>
      {verdict && <section className="mt-7 border-t border-[#c9baa0] pt-6" aria-label="Answer feedback">
        <h2 ref={feedback} tabIndex={-1} className="text-xl">{verdict.correct ? "Correct." : "The record says otherwise."}</h2>
        <p className="mt-3 text-lg leading-relaxed">{verdict.feedback}</p>
        <p className="mt-3 leading-relaxed text-[#655c4d]">{verdict.explanation}</p>
        <ul className="mt-4 space-y-2 text-xs leading-relaxed text-[#655c4d]">{verdict.sources.map(source => <li key={source.label}>{source.url ? <a href={source.url} className="underline">{source.label}</a> : source.label}</li>)}</ul>
        <button type="button" onClick={onContinue} className="shell-button shell-button-primary mt-6 w-full sm:w-auto">{index === 4 ? "View results" : "Next question"}</button>
      </section>}
    </>
  );
}
