import type { CSSProperties } from "react";

/**
 * Headline that rises word by word. Pure CSS (no JS), so it's visible from the
 * very first paint and plays as the splash lifts.
 */
export function TextReveal({
  text,
  as: Tag = "h1",
  className,
  delay = 0,
}: {
  text: string;
  as?: "h1" | "h2" | "p";
  className?: string;
  delay?: number;
}) {
  const words = text.split(" ");
  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} aria-hidden className="inline-block overflow-hidden pb-[0.1em] align-bottom">
          <span className="word-rise" style={{ "--d": `${delay + i * 0.07}s` } as CSSProperties}>
            {word}
            {i < words.length - 1 && " "}
          </span>
        </span>
      ))}
    </Tag>
  );
}

/** Block that fades up at first paint (CSS only). Use above the fold; use Reveal below it. */
export function Rise({
  children,
  className = "",
  delay = 0,
  y = 20,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <div className={`rise ${className}`} style={{ "--d": `${delay}s`, "--rise-y": `${y}px` } as CSSProperties}>
      {children}
    </div>
  );
}
