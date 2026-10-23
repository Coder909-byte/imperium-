"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { clearImported, readLocalProgress } from "@/lib/quiz/localProgress";
import { ProgressSummary } from "@/lib/quiz/contracts";
import { clientError, quizRequest } from "@/lib/quiz/clientRequest";

const ImportResult = z.object({ acceptedIds: z.array(z.uuid()), ignoredCount: z.number(), xpAwarded: z.number(), progress: ProgressSummary });

export function ProgressImport() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const migrate = useCallback(async () => {
    await Promise.resolve();
    setBusy(true); setError(false);
    try {
      const saved = readLocalProgress();
      if (!saved.sessionIds.length && !saved.regions.length) { setStatus(""); return; }
      setStatus("Verifying saved progress from this browser…");
      const result = ImportResult.parse(await quizRequest("/api/progress/migrate", { sessionIds: saved.sessionIds, regions: saved.regions }));
      if (!clearImported(result.acceptedIds, saved.regions)) throw new Error("Progress was imported, but this browser could not clear its local record. Retry safely.");
      setStatus(result.ignoredCount ? `${result.xpAwarded} XP imported. Some attempt references could not be verified; they remain saved locally.` : `Saved progress verified. ${result.xpAwarded} new XP imported.`);
      router.refresh();
    } catch (cause) {
      setStatus(clientError(cause, "Saved progress could not be imported. Check your connection and try again."));
      setError(true);
    } finally { setBusy(false); }
  }, [router]);
  useEffect(() => {
    const timer = setTimeout(() => void migrate(), 0);
    return () => clearTimeout(timer);
  }, [migrate]);
  return status && <section className="my-6 border border-[#b2a083] p-4 text-sm leading-relaxed" aria-label="Saved progress import">
    <p role={error ? "alert" : "status"}>{status}</p>
    {error && <button type="button" onClick={() => void migrate()} disabled={busy} className="mt-3 underline">Retry progress import</button>}
  </section>;
}
