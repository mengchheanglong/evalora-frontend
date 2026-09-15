import { apiGet } from "./api";
import { subscriptionPlans } from "./subscription-plans";

export type SubscriptionPlan = Uppercase<(typeof subscriptionPlans)[number]["id"]>;
export type BillingCycle = "MONTHLY" | "ANNUAL";
export type RenewalMode = "MANUAL" | "AUTOMATIC";

export type CurrentSubscription = {
  plan: SubscriptionPlan;
  status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELLED" | "EXPIRED";
  billingCycle: BillingCycle;
  /** MVP billing never renews on its own, so this is MANUAL for every paid period. */
  renewalMode: RenewalMode;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  /** A plan already paid for that starts when the current period ends. */
  pendingPlan: SubscriptionPlan | null;
  pendingBillingCycle: BillingCycle | null;
};
export type SubscriptionState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; subscription: CurrentSubscription | null };

export const subscriptionLoading: SubscriptionState = { status: "loading" };

/** How close to expiry the billing page starts asking the customer to renew. */
export const RENEWAL_NOTICE_DAYS = 14;

export function subscriptionLabel(state: SubscriptionState): string {
  if (state.status === "loading") return "Loading subscription…";
  if (state.status === "error") return "Subscription unavailable";
  if (state.subscription === null) return "No active plan";
  return subscriptionPlans.find((plan) => plan.id.toUpperCase() === state.subscription?.plan)?.name
    ?? "Subscription unavailable";
}

export function formatPeriodDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** True when the paid period is over or close enough that a manual renewal should be offered. */
export function isRenewalDue(subscription: CurrentSubscription, now: Date = new Date()): boolean {
  if (subscription.status !== "ACTIVE" || subscription.cancelAtPeriodEnd) return false;
  const end = new Date(subscription.currentPeriodEnd);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() - now.getTime() <= RENEWAL_NOTICE_DAYS * 24 * 60 * 60 * 1000;
}

export function hasEnded(subscription: CurrentSubscription, now: Date = new Date()): boolean {
  if (subscription.status === "CANCELLED" || subscription.status === "EXPIRED") return true;
  const end = new Date(subscription.currentPeriodEnd);
  return !Number.isNaN(end.getTime()) && end.getTime() <= now.getTime();
}

export async function fetchCurrentSubscription(signal: AbortSignal): Promise<CurrentSubscription | null> {
  // A signal bypasses the API helper's shared GET cache and cancels stale workspace requests.
  const value = await apiGet<unknown>("/subscriptions/current", { signal });
  if (value === null) return null;
  return parseCurrentSubscription(value);
}

/**
 * Tolerates a backend that predates manual-renewal fields: the only renewal
 * behavior that exists is manual, so a missing value can safely default rather
 * than turning a working page into an error state.
 */
export function parseCurrentSubscription(value: unknown): CurrentSubscription {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  const plan = record?.plan;
  const status = record?.status;
  const billingCycle = record?.billingCycle;

  if (!record
    || typeof plan !== "string" || !subscriptionPlans.some((candidate) => candidate.id.toUpperCase() === plan)
    || typeof status !== "string" || !["ACTIVE", "TRIALING", "PAST_DUE", "CANCELLED", "EXPIRED"].includes(status)
    || typeof billingCycle !== "string" || !["MONTHLY", "ANNUAL"].includes(billingCycle)
    || typeof record.currentPeriodStart !== "string" || typeof record.currentPeriodEnd !== "string"
    || typeof record.cancelAtPeriodEnd !== "boolean") {
    throw new Error("Invalid subscription response.");
  }

  return {
    plan: plan as SubscriptionPlan,
    status: status as CurrentSubscription["status"],
    billingCycle: billingCycle as BillingCycle,
    renewalMode: record.renewalMode === "AUTOMATIC" ? "AUTOMATIC" : "MANUAL",
    currentPeriodStart: record.currentPeriodStart,
    currentPeriodEnd: record.currentPeriodEnd,
    cancelAtPeriodEnd: record.cancelAtPeriodEnd,
    pendingPlan: isPlan(record.pendingPlan) ? (record.pendingPlan as SubscriptionPlan) : null,
    pendingBillingCycle: record.pendingBillingCycle === "MONTHLY" || record.pendingBillingCycle === "ANNUAL"
      ? record.pendingBillingCycle
      : null,
  };
}

function isPlan(value: unknown): boolean {
  return typeof value === "string" && subscriptionPlans.some((candidate) => candidate.id.toUpperCase() === value);
}
