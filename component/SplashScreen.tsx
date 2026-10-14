"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const STORAGE_KEY = "mkx-splash";
const TOTAL_MS = 2600; // intended length on a fast device, measured from page start
const OPENING_MS = 1900; // the opening sequence always gets at least this long once JS is ready
const WORD = "Bookstore";

/**
 * First-visit intro: a closed book (visible from first paint, pure CSS) opens, flips
 * its pages and hands over to the page. Shown once per browser session — the inline
 * script in the store layout hides it before first paint for returning visitors.
 * Tap, click or any key skips it.
 */
export function SplashScreen() {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [opening, setOpening] = useState(false);
  const [speed, setSpeed] = useState(1);

  const finish = useCallback(() => {
    setVisible(false);
    // Lets the hero's CSS entrance (which waits for the splash) start right away.
    document.documentElement.dataset.splash = "done";
  }, []);

  useEffect(() => {
    if (document.documentElement.dataset.splash === "seen") {
      setVisible(false);
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    // performance.now() ≈ time since the page started loading. On a slow device the
    // opening plays at double speed so the wait doesn't grow.
    const late = performance.now() > 1800;
    setSpeed(late ? 2 : 1);
    setOpening(true);
    const remaining = reduce ? 600 : late ? OPENING_MS / 2 : Math.max(TOTAL_MS - performance.now(), OPENING_MS);
    const timer = window.setTimeout(finish, remaining);
    window.addEventListener("keydown", finish, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", finish);
    };
  }, [finish, reduce]);

  useEffect(() => {
    document.documentElement.style.overflow = visible ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          role="status"
          aria-label="Loading Maekandex Bookstore"
          onClick={finish}
          className="splash-screen grain fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,#5b2a4a_0%,#2a1222_55%,#160810_100%)]"
          exit={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
          initial={false}
          style={{ clipPath: "inset(0 0 0% 0)" }}
          transition={{ duration: reduce ? 0.3 : 0.75, ease: [0.76, 0, 0.24, 1] }}
        >
          <div aria-hidden className="animate-orb-a absolute h-[60vmax] w-[60vmax] rounded-full bg-brand-magenta/25 blur-[120px]" />

          <div className="rise" style={{ "--d": "0.05s", "--rise-y": "50px" } as CSSProperties}>
            <OpeningBook open={opening && !reduce} speed={speed} />
          </div>

          {/* wordmark */}
          <div className="rise relative mt-10 flex flex-col items-center" style={{ "--d": "0.3s", "--rise-y": "12px" } as CSSProperties}>
            <Image
              src="/branding/company_logo.png"
              alt="Maekandex"
              width={180}
              height={48}
              priority
              className="h-8 w-auto brightness-0 invert sm:h-10"
            />
            <div className="mt-3 flex overflow-hidden text-sm font-bold uppercase tracking-[0.45em] text-academy-discount sm:text-base">
              {WORD.split("").map((ch, i) => (
                <span key={i} className="word-rise" style={{ "--d": `${0.5 + i * 0.045}s` } as CSSProperties}>
                  {ch}
                </span>
              ))}
            </div>
          </div>

          {/* progress line */}
          <div className="absolute bottom-[12vh] h-px w-40 overflow-hidden bg-white/15 sm:w-56">
            <div className="splash-progress h-full bg-gradient-to-r from-academy-discount to-white" />
          </div>
          <span className="absolute bottom-[7vh] text-[11px] uppercase tracking-[0.3em] text-white/35">Tap to skip</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A closed book that swings its cover open and flips three pages once `open` is set. */
function OpeningBook({ open, speed = 1 }: { open: boolean; speed?: number }) {
  const t = (seconds: number) => seconds / speed;
  const pageFace =
    "absolute inset-0 rounded-r-md bg-[#fbf7f9] bg-[repeating-linear-gradient(180deg,transparent_0_9px,rgba(91,42,74,0.08)_9px_10px)]";
  const turn = [0.65, 0, 0.35, 1] as const;

  return (
    <div className="relative h-[150px] w-[112px] sm:h-[190px] sm:w-[142px]" style={{ perspective: 1100 }}>
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        initial={{ rotateX: 16, x: "0%" }}
        animate={open ? { rotateX: 8, x: "50%" } : undefined}
        transition={{ delay: t(0.1), duration: t(0.9), ease: [0.22, 1, 0.36, 1] }}
      >
        {/* back cover + the right-hand page that stays put */}
        <div className="absolute inset-0 rounded-r-md bg-[#2a1222] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)]" />
        <div className={`${pageFace} inset-[3px] shadow-inner`}>
          <div className="absolute right-[18%] top-0 h-[38%] w-2.5 bg-academy-discount [clip-path:polygon(0_0,100%_0,100%_100%,50%_85%,0_100%)]" />
        </div>

        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-[3px] origin-left"
            style={{ transformStyle: "preserve-3d" }}
            initial={{ rotateY: 0 }}
            animate={open ? { rotateY: -172 + i * 4 } : undefined}
            transition={{ delay: t(0.5 + i * 0.16), duration: t(0.85), ease: turn }}
          >
            <div className={pageFace} style={{ filter: `brightness(${1 - i * 0.03})` }} />
          </motion.div>
        ))}

        {/* front cover */}
        <motion.div
          className="absolute inset-0 origin-left"
          style={{ transformStyle: "preserve-3d" }}
          initial={{ rotateY: 0 }}
          animate={open ? { rotateY: -176 } : undefined}
          transition={{ delay: t(0.15), duration: t(1), ease: turn }}
        >
          <div
            className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-r-md bg-gradient-to-br from-[#8e427d] via-[#a24e90] to-[#a14f5b] shadow-[inset_6px_0_10px_-4px_rgba(0,0,0,0.45)]"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/15 blur-xl" />
            <span className="text-3xl font-black text-white sm:text-4xl">M</span>
            <span className="mt-1 h-0.5 w-8 rounded-full bg-academy-discount" />
          </div>
          <div className="absolute inset-0 rounded-l-md bg-[#efe3ea]" style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }} />
        </motion.div>
      </motion.div>
    </div>
  );
}
