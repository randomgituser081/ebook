// Runs once when the server starts.
//  1. Warms up: opens the database connection, makes sure the tables exist and loads the book
//     catalogue into memory, so the first visitor after a deploy gets a fast page.
//  2. Starts the background check that confirms payments even if the buyer never returns to
//     the site after paying on Nomba.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.DATABASE_URL) return;

  try {
    const { listBooks } = await import("@/lib/books");
    await listBooks();
    console.log("[startup] database ready, catalogue loaded");
  } catch (error) {
    // Never stop the site from starting; requests will retry the connection themselves.
    console.warn("[startup] warm-up skipped:", (error as Error).message);
  }

  try {
    const { startReconciler } = await import("@/lib/reconciler");
    startReconciler();
  } catch (error) {
    console.warn("[startup] payment watcher not started:", (error as Error).message);
  }
}
