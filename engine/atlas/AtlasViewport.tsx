"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./AtlasWorkspace.module.css";

export function AtlasViewport({ children }: { children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const element = viewport.current;
    if (element) {
      element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2;
      element.scrollTop = (element.scrollHeight - element.clientHeight) / 2;
    }
  }, []);

  function changeZoom(next: number, reset = false) {
    const element = viewport.current;
    if (!element) return;
    const centreX = reset ? .5 : (element.scrollLeft + element.clientWidth / 2) / element.scrollWidth;
    const centreY = reset ? .5 : (element.scrollTop + element.clientHeight / 2) / element.scrollHeight;
    setZoom(next);
    requestAnimationFrame(() => {
      if (!viewport.current) return;
      viewport.current.scrollLeft = centreX * viewport.current.scrollWidth - viewport.current.clientWidth / 2;
      viewport.current.scrollTop = centreY * viewport.current.scrollHeight - viewport.current.clientHeight / 2;
    });
  }

  return (
    <div className={styles.mapStage}>
      <div ref={viewport} className={styles.mapViewport} tabIndex={0} role="region" aria-label="Map viewport. Scroll to explore, or use the zoom controls.">
        <div className={styles.mapSurface} style={{ width: `max(${zoom * 100}%, ${zoom * 860}px)` }}>{children}</div>
      </div>
      <div className={styles.zoomControls} role="group" aria-label="Map zoom">
        <button type="button" onClick={() => changeZoom(Math.min(2, zoom + .25))} disabled={zoom === 2} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => changeZoom(1, true)} aria-label="Reset map zoom">
          <span aria-live="polite" aria-atomic="true">{Math.round(zoom * 100)}%</span>
        </button>
        <button type="button" onClick={() => changeZoom(Math.max(1, zoom - .25))} disabled={zoom === 1} aria-label="Zoom out">−</button>
      </div>
      <p className={styles.panHint}>Scroll to explore the map</p>
    </div>
  );
}
