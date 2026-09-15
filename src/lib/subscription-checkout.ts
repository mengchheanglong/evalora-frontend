import { apiGet, apiPost, invalidateGetCache } from "./api";
import { subscriptionPlans } from "./subscription-plans";
import type { CurrentSubscription } from "./current-subscription";

/**
 * Prepaid, manually renewed billing.
 *
 * Evalora billing is prepaid: one verified payment buys exactly one billing
 * cycle and nothing renews on its own. The browser never sends a price — it
 * sends a plan and a cycle, and the backend catalog decides the amount. The
 * table below exists only to render prices before checkout; the amount shown
 * after confirmation always comes back from the backend.
 */

export type PlanId = Uppercase<(typeof subscriptionPlans)[number]["id"]>;
export type BillingCycleId = "MONTHLY" | "ANNUAL";

/** Display mirror of the backend catalog, in USD cents. */
export const CHECKOUT_PRICES: Record<PlanId, Record<BillingCycleId, number>> = {
  PLUS: { MONTHLY: 2_900, ANNUAL: 27_600 },
  PRO: { MONTHLY: 7_900, ANNUAL: 75_600 },
  BUSINESS: { MONTHLY: 19_900, ANNUAL: 190_800 },
};

export const PLAN_IDS = ["PLUS", "PRO", "BUSINESS"] as const;
export const BILLING_CYCLE_IDS = ["MONTHLY", "ANNUAL"] as const;

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

export function isBillingCycleId(value: unknown): value is BillingCycleId {
  return typeof value === "string" && (BILLING_CYCLE_IDS as readonly string[]).includes(value);
}

export function checkoutPrice(plan: PlanId, billingCycle: BillingCycleId): number {
  return CHECKOUT_PRICES[plan][billingCycle];
}

export function formatUsd(amountMinor: number): string {
  return `$${(amountMinor / 100).toFixed(2)}`;
}

/** How long the payment covers. Renewal is always a new manual checkout. */
export function paidPeriodLabel(billingCycle: BillingCycleId): string {
  return billingCycle === "MONTHLY" ? "1 month" : "1 year";
}

export function planName(plan: PlanId): string {
  return subscriptionPlans.find((candidate) => candidate.id.toUpperCase() === plan)?.name ?? plan;
}

export function cycleName(billingCycle: BillingCycleId): string {
  return billingCycle === "MONTHLY" ? "Monthly" : "Annual";
}

export type CheckoutSession = {
  tranId: string;
  plan: PlanId;
  billingCycle: BillingCycleId;
  amountMinor: number;
  amountDisplay: string;
  currency: string;
  purpose: "NEW_SUBSCRIPTION" | "RENEWAL" | "PLAN_CHANGE";
  paidPeriod: string;
  checkout: { actionUrl: string; method: "POST"; fields: Record<string, string> };
};

export type PaymentAttemptStatus = {
  tranId: string;
  status: "PENDING" | "VERIFIED" | "FAILED";
  plan: PlanId;
  billingCycle: BillingCycleId;
  amountDisplay: string;
  currency: string;
  failureReason: string | null;
  verifiedAt: string | null;
  subscription: CurrentSubscription | null;
};

export async function startCheckout(plan: PlanId, billingCycle: BillingCycleId): Promise<CheckoutSession> {
  // Only the selection is sent; the authoritative price lives on the backend.
  const value = await apiPost<unknown>("/subscriptions/checkout", { plan, billingCycle });
  return parseCheckoutSession(value);
}

export async function fetchPaymentAttempt(tranId: string): Promise<PaymentAttemptStatus> {
  // Payment status must never be served from the shared GET cache: a cached
  // PENDING response would hide the moment the backend verified the payment.
  invalidateGetCache();
  const value = await apiGet<unknown>(`/subscriptions/attempts/${encodeURIComponent(tranId)}`);
  return parsePaymentAttempt(value);
}

export const PAYMENT_POLL_INTERVAL_MS = 3_000;
export const PAYMENT_POLL_ATTEMPTS = 40;

/**
 * Waits for the backend to verify the payment with ABA PayWay. The redirect
 * itself proves nothing, so this only stops when the backend reports VERIFIED,
 * FAILED, or the wait budget runs out.
 */
export async function pollPaymentAttempt(
  tranId: string,
  options: { attempts?: number; intervalMs?: number; onPending?: (attempt: PaymentAttemptStatus) => void } = {},
): Promise<PaymentAttemptStatus | null> {
  const attempts = options.attempts ?? PAYMENT_POLL_ATTEMPTS;
  const intervalMs = options.intervalMs ?? PAYMENT_POLL_INTERVAL_MS;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0 && intervalMs > 0) await new Promise((resolve) => setTimeout(resolve, intervalMs));
    const status = await fetchPaymentAttempt(tranId);
    if (status.status !== "PENDING") return status;
    options.onPending?.(status);
  }
  return null;
}

export type CheckoutReturn =
  | { kind: "return"; tranId: string }
  | { kind: "cancelled"; tranId: string | null };

/** Reads PayWay's redirect back into the billing page. Never treated as proof of payment. */
export function parseCheckoutReturn(search: string): CheckoutReturn | null {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const tranId = params.get("tran_id");
  switch (params.get("checkout")) {
    case "return":
      return tranId ? { kind: "return", tranId } : null;
    case "cancelled":
      return { kind: "cancelled", tranId };
    default:
      return null;
  }
}

/**
 * Submits the signed hosted-checkout form ABA documents: a POST of the
 * backend-signed fields to the PayWay Purchase endpoint. The API key is never
 * part of this payload — only the pre-computed hash.
 */
export function submitPayWayForm(session: CheckoutSession): void {
  const form = document.createElement("form");
  form.method = session.checkout.method;
  form.action = session.checkout.actionUrl;
  form.style.display = "none";

  for (const [name, value] of Object.entries(session.checkout.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

function parseCheckoutSession(value: unknown): CheckoutSession {
  const record = asRecord(value);
  const checkout = asRecord(record?.checkout);
  const fields = asRecord(checkout?.fields);
  const tranId = readString(record?.tranId);
  const amountMinor = readNumber(record?.amountMinor);

  if (!record || !checkout || !fields || !tranId || !isPlanId(record.plan) || !isBillingCycleId(record.billingCycle)
    || amountMinor === null || amountMinor <= 0 || readString(record.currency) !== "USD"
    || readString(checkout.method) !== "POST" || !isHttpsUrl(readString(checkout.actionUrl))
    || !Object.values(fields).every((field) => typeof field === "string")
    || !readString(fields.hash) || readString(fields.tran_id) !== tranId) {
    throw new Error("Invalid checkout response.");
  }

  return {
    tranId,
    plan: record.plan,
    billingCycle: record.billingCycle,
    amountMinor,
    amountDisplay: formatUsd(amountMinor),
    currency: "USD",
    purpose: record.purpose === "RENEWAL" || record.purpose === "PLAN_CHANGE" ? record.purpose : "NEW_SUBSCRIPTION",
    paidPeriod: paidPeriodLabel(record.billingCycle),
    checkout: { actionUrl: checkout.actionUrl as string, method: "POST", fields: fields as Record<string, string> },
  };
}

export function parsePaymentAttempt(value: unknown): PaymentAttemptStatus {
  const record = asRecord(value);
  const tranId = readString(record?.tranId);
  const status = readString(record?.status);
  if (!record || !tranId || (status !== "PENDING" && status !== "VERIFIED" && status !== "FAILED")
    || !isPlanId(record.plan) || !isBillingCycleId(record.billingCycle)) {
    throw new Error("Invalid payment attempt response.");
  }

  return {
    tranId,
    status,
    plan: record.plan,
    billingCycle: record.billingCycle,
    amountDisplay: readString(record.amountDisplay) ?? "",
    currency: readString(record.currency) ?? "USD",
    failureReason: readString(record.failureReason),
    verifiedAt: readString(record.verifiedAt),
    subscription: "subscription" in record ? (record.subscription as CurrentSubscription | null) : null,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isHttpsUrl(value: string | null): boolean {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
