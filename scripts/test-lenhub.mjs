// Sends one real test email through Lenhub using the LENHUB_* values from your env file.
//   node --env-file=.env.local scripts/test-lenhub.mjs you@example.com
const recipient = process.argv[2];
if (!recipient || !recipient.includes("@")) {
  console.error("Usage: node --env-file=.env.local scripts/test-lenhub.mjs you@example.com");
  process.exit(1);
}

const { LENHUB_API_BASE, LENHUB_CLIENT_ID, LENHUB_API_KEY, LENHUB_SENDER_ID } = process.env;
if (!LENHUB_API_BASE || !LENHUB_CLIENT_ID || !LENHUB_API_KEY || !LENHUB_SENDER_ID) {
  console.error("Missing one of LENHUB_API_BASE, LENHUB_CLIENT_ID, LENHUB_API_KEY, LENHUB_SENDER_ID");
  process.exit(1);
}

const res = await fetch(`${LENHUB_API_BASE.replace(/\/+$/, "")}/send/email/api`, {
  method: "POST",
  headers: { accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${LENHUB_API_KEY}` },
  body: JSON.stringify({
    client_id: LENHUB_CLIENT_ID,
    subject: "Maekandex Bookstore — test email",
    message: "<p>If you can read this, email delivery from the Maekandex Bookstore works.</p>",
    Sender_id: LENHUB_SENDER_ID,
    recipient,
    greetings: "Hello",
  }),
});

console.log(`HTTP ${res.status}`, await res.text());
console.log("Now check the inbox (and spam folder) of", recipient);
