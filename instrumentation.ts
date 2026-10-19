// Runs once when the server starts. Opens the database connection, makes sure the tables exist
// and loads the book catalogue into memory — so the first visitor after a deploy gets a fast page
// instead of paying for all of that.
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
}
