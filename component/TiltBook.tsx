"use client";

import { useRef, type CSSProperties, type PointerEvent } from "react";
import { Book3D, type CoverBook } from "@/component/Book3D";

/**
 * 3D book that floats gently (CSS) and turns toward the mouse pointer, with a moving sheen.
 * `restY` is the resting angle so the spine and page edge stay visible. On touch screens it
 * simply floats. No animation library — pointer moves just update CSS variables.
 */
export function TiltBook({
  book,
  className = "",
  thickness = 28,
  restY = -24,
  float = true,
  intro = true,
  coverWidth = 720,
}: {
  book: CoverBook;
  className?: string;
  thickness?: number;
  restY?: number;
  float?: boolean;
  intro?: boolean;
  coverWidth?: number;
}) {
  const root = useRef<HTMLDivElement>(null);

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || !root.current) return;
    const r = root.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const s = root.current.style;
    s.setProperty("--ry", `${restY - 14 + px * 36}deg`);
    s.setProperty("--rx", `${12 - py * 20}deg`);
    s.setProperty("--gx", `${10 + px * 80}%`);
    s.setProperty("--gy", `${5 + py * 80}%`);
  };
  const reset = () => {
    const s = root.current?.style;
    if (!s) return;
    s.setProperty("--ry", `${restY + 4}deg`);
    s.setProperty("--rx", "2deg");
  };

  return (
    <div
      ref={root}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={`book3d-scene relative ${className}`}
      style={{ "--ry": `${restY + 4}deg`, "--rx": "2deg" } as CSSProperties}
    >
      {/* soft floor shadow that breathes with the float */}
      <div
        aria-hidden
        className={`absolute -bottom-[8%] left-[12%] h-[8%] w-[76%] rounded-[50%] bg-black/45 blur-xl ${float ? "tilt-shadow--float" : ""}`}
      />
      <div className={intro ? "book-in" : undefined} style={{ transformStyle: "preserve-3d" }}>
        <div className={float ? "tilt-float" : undefined} style={{ transformStyle: "preserve-3d" }}>
          <div className="tilt-rotor">
            <Book3D book={book} thickness={thickness} glare coverWidth={coverWidth} />
          </div>
        </div>
      </div>
    </div>
  );
}
