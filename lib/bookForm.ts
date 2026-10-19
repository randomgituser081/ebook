// Server-only: validates the multipart form posted by the admin "add / edit book" page.
import sharp from "sharp";
import type { BookFiles, BookInput } from "@/lib/books";

const MAX_PDF_BYTES = (Number(process.env.MAX_PDF_MB) || 100) * 1024 * 1024;
const MAX_COVER_BYTES = 5 * 1024 * 1024;

type Parsed = { ok: true; input: BookInput; files: BookFiles } | { ok: false; error: string };

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalInt(raw: string): number | null | "invalid" {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : "invalid";
}

function coverType(bytes: Buffer): "image/png" | "image/jpeg" | "image/webp" | null {
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  return null;
}

export async function parseBookForm(form: FormData, opts: { pdfRequired: boolean }): Promise<Parsed> {
  const title = text(form, "title");
  if (title.length < 2) return { ok: false, error: "Please enter the book title." };

  const priceNaira = Number(text(form, "priceNaira"));
  if (!Number.isInteger(priceNaira) || priceNaira < 100) {
    return { ok: false, error: "Price must be a whole number of at least ₦100." };
  }

  const compareAtNaira = optionalInt(text(form, "compareAtNaira"));
  const pages = optionalInt(text(form, "pages"));
  if (compareAtNaira === "invalid" || pages === "invalid") {
    return { ok: false, error: "Original price and pages must be whole numbers." };
  }
  if (compareAtNaira !== null && compareAtNaira <= priceNaira) {
    return { ok: false, error: "Original price must be higher than the selling price (or left empty)." };
  }

  const files: BookFiles = {};

  const pdf = form.get("pdf");
  if (pdf instanceof File && pdf.size > 0) {
    if (pdf.size > MAX_PDF_BYTES) return { ok: false, error: `PDF is too large (max ${MAX_PDF_BYTES / 1024 / 1024} MB).` };
    const bytes = Buffer.from(await pdf.arrayBuffer());
    if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") return { ok: false, error: "That file is not a PDF." };
    files.pdf = bytes;
  } else if (opts.pdfRequired) {
    return { ok: false, error: "Please upload the book as a PDF." };
  }

  const cover = form.get("cover");
  if (cover instanceof File && cover.size > 0) {
    if (cover.size > MAX_COVER_BYTES) return { ok: false, error: "Cover image is too large (max 5 MB)." };
    const bytes = Buffer.from(await cover.arrayBuffer());
    const type = coverType(bytes);
    if (!type) return { ok: false, error: "Cover must be a PNG, JPG or WEBP image." };
    // Store a web-sized WebP: phones never download a multi-megabyte upload.
    try {
      const data = await sharp(bytes, { failOn: "none" })
        .rotate()
        .resize({ width: 960, height: 1280, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      files.cover = { data, type: "image/webp" };
    } catch {
      return { ok: false, error: "That image could not be read. Try a different PNG, JPG or WEBP file." };
    }
  }

  return {
    ok: true,
    files,
    input: {
      title,
      subtitle: text(form, "subtitle"),
      author: text(form, "author"),
      description: text(form, "description"),
      highlights: text(form, "highlights").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 12),
      priceNaira,
      compareAtNaira,
      pages,
      published: form.get("published") === "on",
    },
  };
}
