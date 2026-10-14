import { getBookCover } from "@/lib/books";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cover = await getBookCover(id);
  if (!cover) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(cover.data), {
    headers: {
      "Content-Type": cover.type,
      // The page appends ?v=<updatedAt>, so a changed cover gets a new URL.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
