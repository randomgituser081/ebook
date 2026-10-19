import { SplashScreen } from "@/component/SplashScreen";

// Runs before first paint: returning visitors (this session) skip the intro with no flash;
// first-timers get data-splash="playing", which holds the hero's CSS entrance until the intro lifts.
const SPLASH_SEEN_SCRIPT = `try{document.documentElement.dataset.splash=sessionStorage.getItem("mkx-splash")?"seen":"playing"}catch(e){document.documentElement.dataset.splash="playing"}`;

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SPLASH_SEEN_SCRIPT }} />
      <noscript>
        <style>{`.splash-screen{display:none}`}</style>
      </noscript>
      <SplashScreen />
      {children}
    </>
  );
}
