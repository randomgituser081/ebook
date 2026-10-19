// Starts the background check for unconfirmed payments (see reconcilePendingOrders).
import { reconcilePendingOrders } from "@/lib/ebookOrders";
import { isNombaServerConfigured } from "@/lib/nomba";

const g = globalThis as typeof globalThis & { __mkxReconciler?: ReturnType<typeof setInterval> };

export function startReconciler(): void {
  if (g.__mkxReconciler) return; // only one timer, even if this module is loaded twice

  const siteUrl = (process.env.SITE_URL ?? "").replace(/\/+$/, "");
  if (!siteUrl || !isNombaServerConfigured) {
    console.warn("[reconcile] not started — it needs SITE_URL and the Nomba credentials");
    return;
  }

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const { settled } = await reconcilePendingOrders(siteUrl);
      if (settled) console.log(`[reconcile] confirmed ${settled} payment(s) the buyer never came back for`);
    } catch (error) {
      console.warn("[reconcile] pass failed:", (error as Error).message);
    } finally {
      running = false;
    }
  };

  g.__mkxReconciler = setInterval(tick, 30_000);
  g.__mkxReconciler.unref?.();
  console.log("[reconcile] watching for unconfirmed payments every 30s");
}
