import { bookPdfSize, getBook, getBookPdf } from "@/lib/books";
import { bookIdFromReference, checkDownloadLink, consumeDownload } from "@/lib/ebookOrders";

export const runtime = "nodejs";

function page(status: number, heading: string, body: string) {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${heading}</title>
<body style="font-family:Arial,sans-serif;max-width:480px;margin:15vh auto;padding:0 20px;color:#1a1a1a;text-align:center">
<h1 style="color:#5b2a4a">${heading}</h1><p style="line-height:1.6;color:#555">${body}</p>
<p><a href="/" style="color:#a14f5b">Back to the bookstore</a></p>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// Link scanners and download managers often send HEAD first — don't count those.
export async function HEAD(req: Request) {
  const params = new URL(req.url).searchParams;
  const ok = checkDownloadLink(params.get("ref") ?? "", params.get("exp"), params.get("sig")) === "ok";
  return new Response(null, { status: ok ? 200 : 403 });
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const ref = params.get("ref") ?? "";

  const link = checkDownloadLink(ref, params.get("exp"), params.get("sig"));
  if (link === "invalid") {
    return page(403, "Invalid download link", "This link isn't valid. Please use the link from your purchase email.");
  }
  if (link === "expired") {
    return page(
      410,
      "This link has expired",
      `Download links last 7 days. Contact us with your payment reference <strong>${ref}</strong> and we'll send a new one.`,
    );
  }

  const bookId = bookIdFromReference(ref);
  const book = bookId ? await getBook(bookId) : undefined;
  const size = book ? await bookPdfSize(book.id) : null;

  // Check the file exists before counting, so a missing file never burns the buyer's downloads.
  if (!book || !size) {
    console.error(`Ebook file missing for ref=${ref} book=${bookId}`);
    return page(
      503,
      "File unavailable",
      `Your payment is confirmed but the file is unavailable right now. Please contact us with your payment reference <strong>${ref}</strong>.`,
    );
  }

  if (!(await consumeDownload(ref))) {
    return page(
      410,
      "Download limit reached",
      `This link has already been used the maximum number of times. Contact us with your payment reference <strong>${ref}</strong> and we'll help.`,
    );
  }

  const file = await getBookPdf(book.id);
  if (!file) return page(503, "File unavailable", "Please try again in a moment.");

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(file.length),
      "Content-Disposition": `attachment; filename="${book.slug}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
