// Server-only Nomba client (hosted checkout). Mirrors the Go adapter in
// trios-staging/internal/adapters/nomba: token issue → checkout/order → payment resolve,
// plus the webhook signature scheme from internal/api/handlers/payment.handler.go.
// Never import this from a "use client" file — it reads the private key.
import { createHmac, timingSafeEqual } from "crypto";

const NOMBA_API_BASE = (process.env.NOMBA_API_BASE || "https://api.nomba.com/v1").replace(/\/+$/, "");
const NOMBA_CLIENT_ID = process.env.NOMBA_CLIENT_ID ?? "";
const NOMBA_PRIVATE_KEY = process.env.NOMBA_PRIVATE_KEY ?? "";
const NOMBA_ACCOUNT_ID = process.env.NOMBA_ACCOUNT_ID ?? "";

export const isNombaServerConfigured = Boolean(NOMBA_CLIENT_ID && NOMBA_PRIVATE_KEY && NOMBA_ACCOUNT_ID);

export class NombaError extends Error {}

type CachedToken = { accessToken: string; expiresAt: number };
let cachedToken: CachedToken | null = null;
let tokenRequest: Promise<string> | null = null;

const SAFETY_BUFFER_MS = 60_000;

async function nombaFetch<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    accountId: NOMBA_ACCOUNT_ID,
  };
  if (init.auth !== false) {
    headers.Authorization = `Bearer ${await getAccessToken()}`;
  }

  const res = await fetch(`${NOMBA_API_BASE}/${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok || !body) {
    throw new NombaError(`Nomba ${path} failed (${res.status}): ${body?.description ?? body?.message ?? "no body"}`);
  }
  return body as T;
}

async function fetchToken(): Promise<string> {
  type TokenResponse = {
    code: string;
    description: string;
    data: { access_token: string; expiresAt: string };
  };

  const result = await nombaFetch<TokenResponse>("auth/token/issue", {
    method: "POST",
    auth: false,
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: NOMBA_CLIENT_ID,
      client_secret: NOMBA_PRIVATE_KEY,
    }),
  });

  if (result.code !== "00" || !result.data?.access_token) {
    throw new NombaError(`Nomba auth error: ${result.description}`);
  }

  const expiresAt = Date.parse(result.data.expiresAt);
  cachedToken = {
    accessToken: result.data.access_token,
    expiresAt: Number.isNaN(expiresAt) ? Date.now() + 30 * 60_000 : expiresAt,
  };
  return cachedToken.accessToken;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - SAFETY_BUFFER_MS) {
    return cachedToken.accessToken;
  }
  // Share one in-flight token request between concurrent callers.
  tokenRequest ??= fetchToken().finally(() => {
    tokenRequest = null;
  });
  return tokenRequest;
}

export type CreateCheckoutInput = {
  amountNaira: number;
  customerEmail: string;
  customerId: string;
  orderReference: string;
  callbackUrl: string;
  metadata?: Record<string, string>;
};

export async function createCheckoutOrder(input: CreateCheckoutInput): Promise<{ checkoutLink: string; orderReference: string }> {
  type CheckoutResponse = { data?: { checkoutLink?: string; orderReference?: string } };

  const result = await nombaFetch<CheckoutResponse>("checkout/order", {
    method: "POST",
    body: JSON.stringify({
      order: {
        callbackUrl: input.callbackUrl,
        customerEmail: input.customerEmail,
        amount: input.amountNaira,
        currency: "NGN",
        customerId: input.customerId,
        orderReference: input.orderReference,
      },
      metadata: input.metadata,
      tokenizeCard: false,
    }),
  });

  if (!result.data?.checkoutLink) {
    throw new NombaError("Nomba: invalid checkout link in response");
  }
  return {
    checkoutLink: result.data.checkoutLink,
    orderReference: result.data.orderReference || input.orderReference,
  };
}

// ---- Payment resolution ----------------------------------------------------

type OrderDetails = {
  code?: string;
  description?: string;
  data?: {
    success?: boolean | string;
    message?: string;
    order?: { orderReference?: string; customerEmail?: string; amount?: string | number; status?: string };
    transactionDetails?: {
      paymentReference?: string;
      paymentVendorReference?: string;
      statusCode?: string;
      status?: string;
    };
  };
};

async function fetchCheckoutTransaction(id: string, idType: string): Promise<OrderDetails> {
  const query = new URLSearchParams({ idType, id });
  return nombaFetch<OrderDetails>(`checkout/transaction?${query}`, { method: "GET" });
}

const FAILED = ["FAILED", "CANCELLED", "CANCELED", "ABANDONED", "EXPIRED", "DECLINED", "ERROR", "REJECTED", "UNPAID"];
const PAID = ["SUCCESS", "SUCCESSFUL", "SUCCESSFULLY", "PAID", "COMPLETED", "COMPLETE", "PAYMENT APPROVED", "APPROVED", "SETTLED", "CAPTURED", "00", "0"];

function looksFailed(raw?: string): boolean {
  const s = (raw ?? "").trim().toUpperCase();
  if (!s) return false;
  return FAILED.includes(s) || ["FAIL", "CANCEL", "ABANDON", "DECLIN", "EXPIRE", "REJECT"].some((p) => s.includes(p));
}

function looksPaid(raw?: string): boolean {
  const s = (raw ?? "").trim().toUpperCase();
  if (!s || looksFailed(s)) return false;
  return PAID.includes(s) || s.includes("APPROVED") || s.includes("SUCCESS");
}

// Port of isNombaOrderPaid — Nomba reports success in several different fields
// depending on the payment method (card vs transfer), so check them all.
function isOrderPaid(order: OrderDetails): boolean {
  const tx = order.data?.transactionDetails ?? {};
  const hasPaymentRef = Boolean(tx.paymentReference?.trim() || tx.paymentVendorReference?.trim());

  if (looksFailed(tx.status) || looksFailed(tx.statusCode)) return false;
  if (looksPaid(tx.status) || looksPaid(tx.statusCode)) return true;
  if (looksPaid(order.data?.order?.status) && hasPaymentRef) return true;

  const success = order.data?.success === true || order.data?.success === "true";
  return success && hasPaymentRef && looksPaid(order.data?.message);
}

type AccountTxRecord = { status?: string; amount?: string | number; orderReference?: string; customerEmail?: string };

// Nomba returns this payload as a bare array, a single object, or wrapped in results/transactions/data.
function accountRecords(body: unknown): AccountTxRecord[] {
  const node = (body as { data?: unknown } | null)?.data;
  if (Array.isArray(node)) return node as AccountTxRecord[];
  if (node && typeof node === "object") {
    const wrapped = node as { results?: unknown; transactions?: unknown; data?: unknown; status?: string };
    for (const list of [wrapped.results, wrapped.transactions, wrapped.data]) {
      if (Array.isArray(list) && list.length) return list as AccountTxRecord[];
    }
    if (wrapped.status) return [node as AccountTxRecord];
  }
  return [];
}

const ACCOUNT_TX_PAID = ["SUCCESS", "SUCCESSFUL", "COMPLETED", "PAID"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ResolvedPayment = {
  paid: boolean;
  orderReference: string;
  amountNaira: number | null;
  customerEmail: string | null;
};

// Port of PaymentGatewayAdapter.ResolvePayment (trios-staging). Same order of attempts:
//  1) checkout/transaction by ORDER_REFERENCE (or ORDER_ID when given Nomba's UUID)
//  2) transactions/accounts/single — the record that reflects pay-with-transfer settlement
//  3) checkout/order/retrieve
// Soft-fails to "unpaid" so a polling client is never blocked by a hard error.
export async function resolvePayment(reference: string): Promise<ResolvedPayment> {
  const ref = reference.trim();
  const unpaid: ResolvedPayment = { paid: false, orderReference: ref, amountNaira: null, customerEmail: null };
  if (!ref) return unpaid;

  const summarize = (order: OrderDetails): ResolvedPayment => {
    const amount = Number(order.data?.order?.amount);
    return {
      paid: isOrderPaid(order),
      orderReference: order.data?.order?.orderReference?.trim() || ref,
      amountNaira: Number.isFinite(amount) ? amount : null,
      customerEmail: order.data?.order?.customerEmail?.trim() || null,
    };
  };

  const idTypes = UUID_PATTERN.test(ref) ? ["ORDER_ID", "ORDER_REFERENCE"] : ["ORDER_REFERENCE"];

  for (const idType of idTypes) {
    try {
      const resolved = summarize(await fetchCheckoutTransaction(ref, idType));
      if (resolved.paid) return resolved;
    } catch (error) {
      console.warn(`[NOMBA] transaction lookup failed idType=${idType} ref=${ref}:`, (error as Error).message);
    }
  }

  try {
    const body = await nombaFetch<unknown>(
      `transactions/accounts/single?${new URLSearchParams({ orderReference: ref })}`,
      { method: "GET" },
    );
    const hit = accountRecords(body).find((r) => ACCOUNT_TX_PAID.includes((r.status ?? "").trim().toUpperCase()));
    if (hit) {
      const amount = Number(hit.amount);
      return {
        paid: true,
        orderReference: hit.orderReference?.trim() || ref,
        amountNaira: Number.isFinite(amount) ? amount : null,
        customerEmail: hit.customerEmail?.trim() || null,
      };
    }
  } catch (error) {
    console.warn(`[NOMBA] accounts/single failed ref=${ref}:`, (error as Error).message);
  }

  try {
    const order = await nombaFetch<OrderDetails>("checkout/order/retrieve", {
      method: "POST",
      body: JSON.stringify({ idType: idTypes[0], id: ref, orderReference: ref }),
    });
    return summarize(order);
  } catch (error) {
    console.warn(`[NOMBA] order/retrieve failed ref=${ref}:`, (error as Error).message);
  }

  return unpaid;
}

// ---- Webhook ---------------------------------------------------------------

export type WebhookBody = {
  event_type?: string;
  requestId?: string;
  merchant?: { userId?: string; walletId?: string };
  data?: {
    merchant?: { userId?: string; walletId?: string };
    transaction?: { transactionId?: string; type?: string; time?: string; responseCode?: string };
    order?: { orderReference?: string; reference?: string; customerEmail?: string };
    customer?: { email?: string };
    orderReference?: string;
    reference?: string;
    merchantTxRef?: string;
  };
  orderReference?: string;
  reference?: string;
  merchantTxRef?: string;
};

// Port of verifyNombaWebhookSignature: HMAC-SHA256 (base64) over a colon-joined canonical
// string plus the nomba-timestamp header. The amount is NOT signed, so never take it from here.
export function verifyWebhookSignature(body: WebhookBody, headers: Headers): boolean {
  const secret = (process.env.NOMBA_WEBHOOK_SIGNATURE_KEY ?? "").trim();
  const provided = (headers.get("nomba-signature") ?? "").trim();
  const timestamp = (headers.get("nomba-timestamp") ?? "").trim();
  if (!secret || !provided || !timestamp) return false;

  const tx = body.data?.transaction ?? {};
  const responseCode = tx.responseCode === "null" ? "" : (tx.responseCode ?? "");
  const canonical = [
    body.event_type ?? "",
    body.requestId ?? "",
    body.merchant?.userId || body.data?.merchant?.userId || "",
    body.merchant?.walletId || body.data?.merchant?.walletId || "",
    tx.transactionId ?? "",
    tx.type ?? "",
    tx.time ?? "",
    responseCode,
    timestamp,
  ].join(":");

  const expected = Buffer.from(createHmac("sha256", secret).update(canonical).digest("base64"));
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function webhookOrderReference(body: WebhookBody): string {
  const d = body.data ?? {};
  const candidates = [
    d.order?.orderReference, d.order?.reference, d.orderReference, d.reference, d.merchantTxRef,
    body.orderReference, body.reference, body.merchantTxRef,
  ];
  return candidates.find((c) => typeof c === "string" && c.trim())?.trim() ?? "";
}

export function webhookCustomerEmail(body: WebhookBody): string | null {
  return body.data?.customer?.email?.trim() || body.data?.order?.customerEmail?.trim() || null;
}
