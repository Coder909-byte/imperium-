"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { QuizView } from "@/lib/quiz/contracts";
import { clientError, quizRequest } from "@/lib/quiz/clientRequest";
import { rememberQuiz } from "@/lib/quiz/localProgress";
import { PROGRESSION } from "@/lib/quiz/progression";
import { QuizQuestion } from "./QuizQuestion";
import { QuizResults } from "./QuizResults";

export function QuizClient({ regionId, name, year }: { regionId: string; name: string; year: string }) {
  const [view, setView] = useState<QuizView | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [results, setResults] = useState(false);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const activeKey = `imperium.quiz.active.${regionId}`;

  function storeActive(id: string) {
    try { localStorage.setItem(activeKey, id); } catch { setStorageWarning(true); }
  }

  useEffect(() => {
    const controller = new AbortController();
    async function resume() {
      // No quiz/DB write on mount. A trusted Start/Retry action creates a session.
      await Promise.resolve();
      try {
        const saved = localStorage.getItem(activeKey);
        if (!saved || !z.uuid().safeParse(saved).success) return;
        const restored = QuizView.parse(await quizRequest(`/api/quiz/session?id=${saved}`, undefined, controller.signal));
        if (controller.signal.aborted) return;
        setView(restored); setResults(restored.finished);
        setIndex(Math.max(0, restored.answers.length - 1));
        setSelected(restored.answers.at(-1)?.chosenOptionId ?? "");
        if (restored.finished && !restored.authenticated && !rememberQuiz(restored.id)) setStorageWarning(true);
      } catch (cause) {
        if (!controller.signal.aborted) setError(clientError(cause, "Saved progress could not be read. Check your connection or start a new quiz."));
      } finally { if (!controller.signal.aborted) setPending(false); }
    }
    void resume();
    return () => controller.abort();
  }, [activeKey]);

  async function start() {
    if (pending) return;
    setPending(true); setError(null);
    try {
      const next = QuizView.parse(await quizRequest("/api/quiz/session", { regionId }));
      storeActive(next.id); setView(next); setIndex(0); setSelected(""); setResults(false);
    } catch (cause) { setError(clientError(cause, "The quiz could not start. Check your connection and try again.")); }
    finally { setPending(false); }
  }

  async function submit() {
    if (!view || !selected || pending) return;
    setPending(true); setError(null);
    try {
      const next = QuizView.parse(await quizRequest("/api/quiz/answer", { sessionId: view.id, questionId: view.questions[index].id, optionId: selected }));
      setView(next);
      if (next.finished && !next.authenticated && !rememberQuiz(next.id)) setStorageWarning(true);
    } catch (cause) { setError(clientError(cause, "Your answer could not be saved. Check your connection and submit it again.")); }
    finally { setPending(false); }
  }

  const verdict = view?.answers.find(answer => answer.questionId === view.questions[index]?.id);
  return <>
    {storageWarning && <p role="status" className="mb-6 border border-[#b2a083] p-4 text-sm leading-relaxed">This browser could not save a local record. Keep this page open; signup import may be unavailable.</p>}
    {error && <div role="alert" className="form-error mb-6"><p>{error}</p>{view && <button type="button" disabled={pending} onClick={start} className="mt-3 underline">Start a new quiz</button>}</div>}
    {!view ? <>
      <p className="shell-eyebrow">{year} · {name}</p>
      <h1 className="shell-heading mt-4">Test yourself on {name}.</h1>
      <p className="mt-6 text-lg leading-relaxed">Five questions. Four options each. No timer. Each answer comes with an explanation and the source behind it.</p>
      <p className="mt-4 leading-relaxed text-[#655c4d]">Complete all five to bank XP. Each question can award XP once per account; retries can earn previously missed answers.</p>
      <p className="mt-3 text-sm text-[#655c4d]">{PROGRESSION.streakNotice}</p>
      <div className="mt-8 flex flex-wrap gap-3"><button type="button" disabled={pending} onClick={start} className="shell-button shell-button-primary">{pending ? "Checking saved quiz…" : "Start quiz"}</button><Link href="/atlas" prefetch={false} className="shell-button shell-button-outline">Return to the atlas</Link></div>
    </> : results ? <QuizResults view={view} name={name} retry={start} pending={pending} /> : <>
      <h1 className="mb-6 font-[family-name:var(--font-inscription)] text-sm tracking-widest">{name} · {year}</h1>
      <QuizQuestion question={view.questions[index]} index={index} selected={selected} verdict={verdict} pending={pending} onSelect={setSelected} onSubmit={submit} onContinue={() => {
        if (index === 4) setResults(true);
        else { setIndex(index + 1); setSelected(""); }
      }} />
      <p role="status" className="sr-only">{pending ? "Saving your answer." : ""}</p>
    </>}
  </>;
}
