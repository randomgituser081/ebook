"use client";

import { useRef, type PointerEvent } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Book3D, type CoverBook } from "@/component/Book3D";

/**
 * 3D book that floats gently and turns toward the pointer, with a moving sheen.
 * `restY` is the resting angle so the spine and page edge stay visible.
 */
export function TiltBook({
  book,
  className = "",
  thickness = 28,
  restY = -24,
  float = true,
  intro = true,
}: {
  book: CoverBook;
  className?: string;
  thickness?: number;
  restY?: number;
  float?: boolean;
  intro?: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 120, damping: 18 });
  const sy = useSpring(py, { stiffness: 120, damping: 18 });

  const rotateY = useTransform(sx, [0, 1], [restY - 14, restY + 22]);
  const rotateX = useTransform(sy, [0, 1], [12, -8]);
  const gx = useTransform(sx, [0, 1], ["10%", "90%"]);
  const gy = useTransform(sy, [0, 1], ["5%", "85%"]);
  const glare = useMotionTemplate`${gx}`;
  const glareY = useMotionTemplate`${gy}`;

  const onMove = (e: PointerEvent) => {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const reset = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={reset} className={`book3d-scene relative ${className}`}>
      {/* soft floor shadow that breathes with the float */}
      <motion.div
        aria-hidden
        className="absolute -bottom-[8%] left-[12%] h-[8%] w-[76%] rounded-[50%] bg-black/45 blur-xl"
        animate={float && !reduce ? { scaleX: [1, 0.86, 1], opacity: [0.55, 0.35, 0.55] } : undefined}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className={intro ? "book-in" : undefined} style={{ transformStyle: "preserve-3d" }}>
        <motion.div
          animate={float && !reduce ? { y: [0, -14, 0] } : undefined}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <motion.div style={{ rotateY, rotateX, transformStyle: "preserve-3d", ["--gx" as string]: glare, ["--gy" as string]: glareY }}>
            <Book3D book={book} thickness={thickness} glare />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
