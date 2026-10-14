/** Little book whose pages keep turning. Pure CSS, so it works in loading.tsx. */
export function BookLoader({ label = "Loading", className = "" }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="page-loader" aria-hidden>
        <div className="page-loader__base page-loader__base--left" />
        <div className="page-loader__base page-loader__base--right" />
        <div className="page-loader__page" />
        <div className="page-loader__page" />
        <div className="page-loader__page" />
      </div>
      <span className="text-sm font-semibold tracking-wide text-current opacity-70">{label}…</span>
    </div>
  );
}
