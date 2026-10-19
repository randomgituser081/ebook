import sharp from "sharp";
import { getBookCover } from "@/lib/books";

export const runtime = "nodejs";

// Resized covers are small and the set of sizes is tiny, so keep them in memory.
const cache = new Map<string, Buffer>();
const MAX_ENTRIES = 80;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const version = url.searchParams.get("v");
  const wanted = Number(url.searchParams.get("w")) || 0;

  const cover = await getBookCover(id);
  if (!cover) return new Response(null, { status: 404 });

  let body: Buffer = cover.data;
  let type = cover.type;

  if (wanted > 0) {
    // Round up to a handful of sizes so the cache stays small.
    const width = Math.min(1000, Math.max(160, Math.ceil(wanted / 80) * 80));
    const key = `${id}:${version ?? "-"}:${width}`;
    let resized = cache.get(key);
    if (!resized) {
      resized = await sharp(cover.data, { failOn: "none" })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
      cache.set(key, resized);
    }
    body = resized;
    type = "image/webp";
  }

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": type,
      // The page appends ?v=<updatedAt>, so a changed cover is a new URL and the old one can be cached forever.
      "Cache-Control": version ? "public, max-age=31536000, immutable" : "public, max-age=3600",
    },
  });
}
