import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getBookBySlug, getBookCover } from "@/lib/books";
import { formatNaira } from "@/lib/format";

// The preview card shown when a book link is shared (WhatsApp, X, Facebook, LinkedIn…).
export const runtime = "nodejs";
export const alt = "Ebook on Maekandex Bookstore";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getBookBySlug(slug);
  const book = found?.published ? found : undefined;

  // Embed the real cover (converted to PNG, which the image renderer understands).
  let cover: string | null = null;
  if (book?.hasCover) {
    try {
      const c = await getBookCover(book.id);
      if (c) {
        const png = await sharp(c.data).resize({ width: 360, height: 480, fit: "cover" }).png().toBuffer();
        cover = `data:image/png;base64,${png.toString("base64")}`;
      }
    } catch {}
  }

  const title = book?.title ?? "Maekandex Bookstore";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: "60px 76px",
          background: "linear-gradient(135deg, #1c0b16 0%, #3b1d30 55%, #5b2a4a 100%)",
          color: "#fff",
        }}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} width={330} height={440} alt="" style={{ borderRadius: 14, boxShadow: "0 30px 60px rgba(0,0,0,0.55)" }} />
        ) : (
          <div
            style={{
              width: 330,
              height: 440,
              display: "flex",
              flexDirection: "column",
              padding: 34,
              borderRadius: 14,
              background: "linear-gradient(135deg, #8e427d 0%, #a24e90 55%, #a14f5b 100%)",
              boxShadow: "0 30px 60px rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ fontSize: 16, letterSpacing: 5, opacity: 0.75 }}>MAEKANDEX</div>
            <div style={{ fontSize: 40, fontWeight: 700, marginTop: 44, lineHeight: 1.1 }}>{title}</div>
            <div style={{ width: 70, height: 5, background: "#e8a33d", borderRadius: 3, marginTop: 26 }} />
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 22, letterSpacing: 7, color: "#e8a33d", fontWeight: 700 }}>MAEKANDEX BOOKSTORE</div>
          <div style={{ fontSize: title.length > 40 ? 54 : 66, fontWeight: 700, lineHeight: 1.05, marginTop: 24 }}>{title}</div>
          {book?.author ? (
            <div style={{ fontSize: 28, marginTop: 20, color: "rgba(255,255,255,0.75)" }}>{`by ${book.author}`}</div>
          ) : null}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 44 }}>
            {book ? (
              <div style={{ fontSize: 38, fontWeight: 700, background: "#e8a33d", color: "#1a1a1a", padding: "10px 28px", borderRadius: 999 }}>
                {/* the image font has no ₦ glyph */ formatNaira(book.priceNaira).replace("₦", "NGN ")}
              </div>
            ) : null}
            <div style={{ fontSize: 24, color: "rgba(255,255,255,0.7)" }}>Instant PDF · Pay with Nomba</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
