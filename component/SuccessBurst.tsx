import type { CSSProperties } from "react";

const COLORS = ["#e8a33d", "#a24e90", "#a14f5b", "#f5eef2", "#8e427d", "#ffffff"];

// Fixed layout (no randomness), so server and browser always agree.
const PIECES = Array.from({ length: 36 }, (_, i) => {
  const angle = (i / 36) * Math.PI * 2 + (i % 3) * 0.3;
  const distance = 90 + ((i * 37) % 70);
  const size = 6 + (i % 4) * 2;
  const round = i % 3 === 0;
  return {
    x: Math.round(Math.cos(angle) * distance),
    y: Math.round(Math.sin(angle) * distance - 30),
    rotate: (i * 47) % 360,
    color: COLORS[i % COLORS.length],
    width: size,
    height: round ? size : Math.round(size * 0.45),
    radius: round ? 999 : 2,
  };
});

/** A checkmark that draws itself, with a one-off burst of confetti behind it. Pure CSS. */
export function SuccessBurst() {
  return (
    <div className="relative mx-auto flex size-24 items-center justify-center">
      {PIECES.map((p, i) => (
        <span
          key={i}
          aria-hidden
          className="burst-piece"
          style={
            {
              "--x": `${p.x}px`,
              "--y": `${p.y}px`,
              "--r": `${p.rotate + 180}deg`,
              width: p.width,
              height: p.height,
              background: p.color,
              borderRadius: p.radius,
            } as CSSProperties
          }
        />
      ))}
      <div className="burst-badge flex size-24 items-center justify-center rounded-full bg-emerald-500 shadow-[0_20px_50px_-12px_rgba(16,185,129,0.6)]">
        <svg viewBox="0 0 52 52" className="size-12" fill="none">
          <path
            className="burst-check"
            d="M14 27 L23 36 L39 18"
            pathLength={1}
            stroke="white"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
