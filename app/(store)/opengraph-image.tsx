import { ImageResponse } from "next/og";

// Share preview for the shop itself (book pages have their own).
export const alt = "Maekandex Bookstore — ebooks delivered straight to your inbox";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "70px 90px",
          background: "linear-gradient(135deg, #1c0b16 0%, #3b1d30 55%, #5b2a4a 100%)",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 26, letterSpacing: 8, color: "#e8a33d", fontWeight: 700 }}>MAEKANDEX BOOKSTORE</div>
        <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.02, marginTop: 28, maxWidth: 900 }}>
          Ebooks, delivered straight to your inbox.
        </div>
        <div style={{ fontSize: 30, marginTop: 30, color: "rgba(255,255,255,0.75)" }}>
          Pay securely in Naira · Instant PDF download
        </div>
      </div>
    ),
    size,
  );
}
