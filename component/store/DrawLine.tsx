/** Dashed connector that draws itself left to right as it scrolls into view (where supported). */
export function DrawLine({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`draw-line ${className}`}>
      <div className="draw-line__bar h-0.5 bg-[repeating-linear-gradient(90deg,var(--brand)_0_10px,transparent_10px_18px)]" />
    </div>
  );
}
