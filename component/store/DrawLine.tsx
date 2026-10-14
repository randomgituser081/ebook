"use client";

import { motion } from "framer-motion";

/** Dashed connector that draws itself left to right when scrolled into view. */
export function DrawLine({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={className}>
      <motion.div
        className="h-0.5 origin-left bg-[repeating-linear-gradient(90deg,var(--brand)_0_10px,transparent_10px_18px)]"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{ duration: 1.4, delay: 0.3, ease: [0.65, 0, 0.35, 1] }}
      />
    </div>
  );
}
