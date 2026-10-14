import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { createBook } from "@/lib/books";
import { parseBookForm } from "@/lib/bookForm";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "Invalid form." }, { status: 400 });

  const parsed = await parseBookForm(form, { pdfRequired: true });
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });

  const book = await createBook(parsed.input, { ...parsed.files, pdf: parsed.files.pdf! });
  return NextResponse.json({ ok: true, id: book.id, slug: book.slug });
}
