import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { updateBook } from "@/lib/books";
import { parseBookForm } from "@/lib/bookForm";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "Invalid form." }, { status: 400 });

  const parsed = await parseBookForm(form, { pdfRequired: false });
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });

  const book = await updateBook(id, parsed.input, parsed.files);
  if (!book) return NextResponse.json({ ok: false, error: "Book not found." }, { status: 404 });
  return NextResponse.json({ ok: true, id: book.id, slug: book.slug });
}
