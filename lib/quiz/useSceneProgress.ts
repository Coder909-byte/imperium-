"use client";

import { useCallback, useEffect, useRef } from "react";
import { rememberBeat } from "./localProgress";
import type { ProgressInput } from "./contracts";

export function useSceneProgress(regionId: string) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<ProgressInput | null>(null);
  const flush = useCallback(() => {
    const input = pending.current;
    pending.current = null;
    if (input) void fetch("/api/progress/scene", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), keepalive: true }).catch(() => {});
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); flush(); }, [flush]);
  return useCallback((beatId: string) => {
    pending.current = rememberBeat(regionId, beatId) ?? { regionId, beatIds: [beatId] };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  }, [regionId, flush]);
}
