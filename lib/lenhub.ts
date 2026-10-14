// Server-only Lenhub email client. Same endpoint/payload as
// trios-staging/internal/adapters/email/mailers.utils.go (sendEmailViaLenhub).

const LENHUB_API_BASE = (process.env.LENHUB_API_BASE ?? "").replace(/\/+$/, "");
const LENHUB_CLIENT_ID = process.env.LENHUB_CLIENT_ID ?? "";
const LENHUB_API_KEY = process.env.LENHUB_API_KEY ?? "";
const LENHUB_SENDER_ID = process.env.LENHUB_SENDER_ID ?? "";

export const isLenhubConfigured = Boolean(LENHUB_API_BASE && LENHUB_CLIENT_ID && LENHUB_API_KEY && LENHUB_SENDER_ID);

export async function sendEmail(input: {
  recipient: string;
  subject: string;
  /** HTML body — Lenhub renders it as-is, like the trios templates. */
  message: string;
  greetings: string;
}): Promise<void> {
  if (!isLenhubConfigured) {
    throw new Error("Lenhub is not configured (LENHUB_API_BASE, LENHUB_CLIENT_ID, LENHUB_API_KEY, LENHUB_SENDER_ID)");
  }

  const res = await fetch(`${LENHUB_API_BASE}/send/email/api`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${LENHUB_API_KEY}`,
    },
    body: JSON.stringify({
      client_id: LENHUB_CLIENT_ID,
      subject: input.subject,
      message: input.message,
      Sender_id: LENHUB_SENDER_ID,
      recipient: input.recipient,
      greetings: input.greetings,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Lenhub send email failed (${res.status}): ${detail.slice(0, 200)}`);
  }
}
