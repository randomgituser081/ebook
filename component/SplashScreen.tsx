"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const STORAGE_KEY = "mkx-splash";
// If the counter animation can't be observed for some reason, never hold the page longer than this.
const FALLBACK_MS = 4500;

/**
 * Maekandex identity splash — the same white screen, logo and climbing percentage as the
 * Maekandex website — with a book above the logo that opens and turns its pages as the
 * number rises.
 *
 * The book and the counter are pure CSS (see globals.css), so they start at first paint,
 * before JavaScript loads. JS only waits for the counter to reach 100% and then lifts the
 * screen. Shown once per browser session; a tap or key press skips it.
 */
export function SplashScreen() {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  const finish = useCallback(() => {
    setExiting(true);
    window.setTimeout(() => {
      setVisible(false);
      // Lets the page's own entrance (held while the splash plays) carry on.
      document.documentElement.dataset.splash = "done";
    }, 300);
  }, []);

  useEffect(() => {
    if (document.documentElement.dataset.splash === "seen") {
      setVisible(false);
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {}

    let timer = window.setTimeout(finish, FALLBACK_MS);
    const counter = rootRef.current?.querySelector(".splash-pct");
    const animations = counter?.getAnimations?.() ?? [];
    if (animations.length) {
      // Finish as soon as the counter hits 100% (immediately if it already has, on a slow phone).
      Promise.all(animations.map((a) => a.finished))
        .then(() => {
          window.clearTimeout(timer);
          timer = window.setTimeout(finish, 250);
        })
        .catch(() => undefined);
    }

    window.addEventListener("keydown", finish, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", finish);
    };
  }, [finish]);

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
          ref={rootRef}
          key="splash"
          role="status"
          aria-busy="true"
          aria-live="polite"
          aria-label="Loading Maekandex Bookstore"
          onClick={finish}
          className="splash-screen fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-white"
          initial={false}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.25 : 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className={`flex flex-col items-center transition-all duration-300 ease-out ${
              exiting ? "-translate-y-2 scale-[0.98] opacity-0" : ""
            }`}
          >
            <SplashBook />
            <Image
              src="/branding/company_logo.png"
              alt="Maekandex Communications Limited"
              width={351}
              height={86}
              priority
              className="h-auto w-55 object-contain sm:w-70 md:w-80"
            />
            <p className="mt-1 text-lg font-semibold tracking-wide tabular-nums text-[#0a0f2b] sm:text-base">
              <span className="splash-pct" aria-hidden />
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A closed book that swings open and turns five pages — CSS only, styled by `.sb*` in globals.css. */
function SplashBook() {
  return (
    <div className="sb" aria-hidden>
      <div className="sb__shadow" />
      <div className="sb__stage">
        <div className="sb__back" />
        <div className="sb__page">
          <span className="sb__ribbon" />
        </div>
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className={`sb__leaf sb__leaf--${n}`} />
        ))}
        <div className="sb__cover">
          <div className="sb__cover-front">
            <b>M</b>
            <i />
          </div>
          <div className="sb__cover-inside" />
        </div>
      </div>
    </div>
  );
}
