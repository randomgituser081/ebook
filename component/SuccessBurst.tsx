"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

const COLORS = ["#e8a33d", "#a24e90", "#a14f5b", "#f5eef2", "#8e427d", "#ffffff"];

/** A checkmark that draws itself, with a one-off burst of confetti behind it. */
export function SuccessBurst() {
  const reduce = useReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const angle = (i / 36) * Math.PI * 2 + (i % 3) * 0.3;
        const distance = 90 + ((i * 37) % 70);
        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 30,
          rotate: (i * 47) % 360,
          color: COLORS[i % COLORS.length],
          size: 6 + (i % 4) * 2,
          round: i % 3 === 0,
        };
      }),
    [],
  );

  return (
    <div className="relative mx-auto flex size-24 items-center justify-center">
      {!reduce &&
        pieces.map((p, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute left-1/2 top-1/2"
            style={{ width: p.size, height: p.round ? p.size : p.size * 0.45, background: p.color, borderRadius: p.round ? 999 : 2 }}
            initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.4 }}
            animate={{ x: p.x, y: [0, p.y, p.y + 60], opacity: [0, 1, 0], rotate: p.rotate + 180, scale: 1 }}
            transition={{ duration: 1.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      <motion.div
        className="flex size-24 items-center justify-center rounded-full bg-emerald-500 shadow-[0_20px_50px_-12px_rgba(16,185,129,0.6)]"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 15 }}
      >
        <svg viewBox="0 0 52 52" className="size-12" fill="none">
          <motion.path
            d="M14 27 L23 36 L39 18"
            stroke="white"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
          />
        </svg>
      </motion.div>
    </div>
  );
}
