"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

const STORAGE_KEY = "mkx-splash";

/**
 * Maekandex identity splash — the same white screen, logo and climbing percentage as the
 * Maekandex website — with a book above the logo that opens and turns its pages as the
 * number rises.
 *
 * Everything, including lifting the screen away, is CSS (see globals.css), so it starts at
 * first paint and ends on schedule even if the page's JavaScript is slow to arrive. JS only
 * removes the element afterwards and handles skipping. Shown once per browser session; a
 * tap or key press skips it.
 */
export function SplashScreen() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [skipping, setSkipping] = useState(false);

  const done = useCallback(() => {
    setVisible(false);
    // Lets anything waiting on the splash (page entrance delays) carry on.
    document.documentElement.dataset.splash = "done";
  }, []);

  const skip = useCallback(() => {
    setSkipping(true);
    window.setTimeout(done, 320);
  }, [done]);

  useEffect(() => {
    if (document.documentElement.dataset.splash === "seen") {
      setVisible(false);
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {}

    // The CSS exit animation may already have finished before JS arrived (slow phone):
    // `finished` resolves immediately in that case.
    const out = rootRef.current?.getAnimations().find((a) => (a as CSSAnimation).animationName === "splash-out");
    out?.finished.then(done).catch(() => undefined);

    const failsafe = window.setTimeout(done, 6000);
    window.addEventListener("keydown", skip, { once: true });
    return () => {
      window.clearTimeout(failsafe);
      window.removeEventListener("keydown", skip);
    };
  }, [done, skip]);

  if (!visible) return null;

  return (
    <div
      ref={rootRef}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading Maekandex Bookstore"
      onClick={skip}
      className={`splash-screen fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-white ${
        skipping ? "splash-skip" : ""
      }`}
    >
      <div className="splash-inner flex flex-col items-center">
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
    </div>
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
