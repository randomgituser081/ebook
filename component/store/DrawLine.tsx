"use client";

import { useReveal } from "@/component/motion";

/** Dashed connector that draws itself left to right when scrolled into view. */
export function DrawLine({ className = "" }: { className?: string }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} aria-hidden className={`draw-line ${className}`}>
      <div className="draw-line__bar h-0.5 bg-[repeating-linear-gradient(90deg,var(--brand)_0_10px,transparent_10px_18px)]" />
    </div>
  );
}
