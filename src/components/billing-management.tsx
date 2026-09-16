"use client";

import { SubscriptionUsage } from "@/components/subscription-usage";
import { Icon } from "@/components/icons";
import { hasEnded, isRenewalDue, formatPeriodDate, subscriptionLabel, type SubscriptionState } from "@/lib/current-subscription";
import { subscriptionPlans, type BillingInterval } from "@/lib/subscription-plans";
import {
  checkoutPrice,
  cycleName,
  formatUsd,
  paidPeriodLabel,
  planName,
  type BillingCycleId,
  type PlanId,
} from "@/lib/subscription-checkout";

const statusLabels = {
  ACTIVE: "Active", TRIALING: "Trialing", PAST_DUE: "Past due", CANCELLED: "Cancelled", EXPIRED: "Expired",
};

/**
 * Every step of the checkout is explicit, so the page can never claim a
 * subscription is active before the backend has verified the payment with ABA
 * PayWay.
 */
export type CheckoutStep =
  | { status: "idle" }
  | { status: "confirming"; plan: PlanId; billingCycle: BillingCycleId }
  | { status: "starting"; plan: PlanId; billingCycle: BillingCycleId }
  | { status: "verifying"; tranId: string }
  | { status: "verified"; plan: PlanId }
  | { status: "failed"; message: string }
  | { status: "abandoned" }
  | { status: "error"; message: string };

export function BillingManagement({ state, billing, onBillingChange, isOwner, checkout, onSelectPlan, onConfirmCheckout, onDismissCheckout, onRetrySubscription, now = new Date() }: {
  state: SubscriptionState;
  billing: BillingInterval;
  onBillingChange: (billing: BillingInterval) => void;
  isOwner: boolean;
  checkout: CheckoutStep;
  onSelectPlan: (plan: PlanId, billingCycle: BillingCycleId) => void;
  onConfirmCheckout: () => void;
  onDismissCheckout: () => void;
  onRetrySubscription?: () => void;
  now?: Date;
}) {
  const subscription = state.status === "ready" ? state.subscription : null;
  const currentIndex = subscriptionPlans.findIndex((plan) => plan.id.toUpperCase() === subscription?.plan);
  const previewCycle = (billing === "annual" ? "ANNUAL" : "MONTHLY") as BillingCycleId;
  const ended = subscription ? hasEnded(subscription, now) : false;
  const formattedEnd = subscription ? formatPeriodDate(subscription.currentPeriodEnd) : "Date unavailable";
  const periodLabel = !subscription ? "Renews manually"
    : subscription.cancelAtPeriodEnd || ended ? "Expires"
    : subscription.status === "TRIALING" ? "Trial ends"
    : subscription.status === "PAST_DUE" ? "Period ends" : "Renews manually";
  const renewDue = subscription ? isRenewalDue(subscription, now) : false;
  const paidRenewal = Boolean(subscription && !subscription.cancelAtPeriodEnd && !ended && subscription.renewalMode === "MANUAL");
  const busy = checkout.status === "starting" || checkout.status === "verifying";

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      <section aria-labelledby="subscription-title" className="card p-5 sm:p-6">
        <h2 className="text-base font-bold text-[var(--theme-heading)]" id="subscription-title">Current subscription</h2>
        {state.status === "loading" ? (
          <div aria-busy="true" aria-label="Loading subscription information" className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4" role="status">
            <span className="sr-only">Loading subscription information</span>
            {[0, 1, 2, 3].map((item) => <div aria-hidden="true" className="space-y-3 motion-safe:animate-pulse" key={item}><div className="h-3 w-16 rounded bg-neutral-200" /><div className="h-6 w-24 rounded bg-neutral-200" /></div>)}
          </div>
        ) : state.status === "error" ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-[var(--theme-muted)]" role="alert">Unable to load subscription information. {isOwner ? "You can still choose a plan below." : "Please try again."}</p>
            {onRetrySubscription && <button className="min-h-11 rounded-lg border border-[var(--theme-border)] px-4 text-sm font-semibold" onClick={onRetrySubscription} type="button">Retry subscription</button>}
          </div>
        ) : !subscription ? (
          <div className="mt-4"><p className="text-lg font-bold">No active subscription</p><p className="mt-2 text-sm text-[var(--theme-muted)]">Compare plans below to find the right fit for your workspace.</p></div>
        ) : (
          <>
            <dl className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
              <div><dt className="text-xs text-[var(--theme-muted)]">Current Plan</dt><dd className={`mt-2 w-fit rounded-full px-3 py-1 text-sm font-bold ${subscriptionPlans[currentIndex]?.accent ?? ""}`}>{subscriptionLabel(state)}</dd></div>
              <div><dt className="text-xs text-[var(--theme-muted)]">Status</dt><dd className="mt-2 text-sm font-semibold">{statusLabels[subscription.status]}</dd></div>
              <div><dt className="text-xs text-[var(--theme-muted)]">Billing</dt><dd className="mt-2 text-sm font-semibold">{subscription.billingCycle === "ANNUAL" ? "Annual" : "Monthly"}</dd></div>
              <div><dt className="text-xs text-[var(--theme-muted)]">{periodLabel}</dt><dd className="mt-2 text-sm font-semibold">{formattedEnd}</dd></div>
            </dl>

            <div className="mt-5 rounded-xl border border-[var(--theme-border)] p-4"><SubscriptionUsage subscription={subscription} /></div>

            {paidRenewal ? (
              <p className="mt-5 flex flex-wrap items-center gap-2 text-sm text-[var(--theme-muted)]">
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">Manual renewal</span>
                <span>Nothing is charged automatically. Pay again before {formattedEnd} to keep access.</span>
              </p>
            ) : null}

            {subscription.pendingPlan ? (
              <p className="mt-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] px-4 py-3 text-sm text-[var(--theme-muted)]">
                Paid plan change: <strong>{planName(subscription.pendingPlan)}</strong>
                {subscription.pendingBillingCycle ? ` (${cycleName(subscription.pendingBillingCycle)})` : ""} starts when this period ends on {formattedEnd}.
              </p>
            ) : null}

            {renewDue ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] px-4 py-3">
                <p className="text-sm text-[var(--theme-muted)]">Your subscription expires on {formattedEnd}. Renew now.</p>
                <button
                  className="min-h-11 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!isOwner || busy}
                  onClick={() => onSelectPlan(subscription.plan, subscription.billingCycle)}
                  type="button"
                >
                  Renew now
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section aria-labelledby="plans-title">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="text-xl font-bold text-[var(--theme-heading)]" id="plans-title">Choose the right plan for your team</h2><p className="mt-2 text-sm text-[var(--theme-muted)]">{isOwner ? "Each payment covers one billing cycle. Renew manually when it ends." : "Only the workspace owner can change the plan."}</p></div>
          <div aria-label="Billing interval" className="inline-flex rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-1" role="group">
            {(["monthly", "annual"] as const).map((interval) => <button aria-pressed={billing === interval} className={`min-h-11 rounded-lg px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary ${billing === interval ? "bg-primary-50 text-primary-700" : "text-[var(--theme-muted)]"}`} key={interval} onClick={() => onBillingChange(interval)} type="button">{interval === "monthly" ? "Monthly" : "Annual"}</button>)}
          </div>
        </div>

        <p className="mt-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] px-4 py-3 text-sm text-[var(--theme-muted)]" id="payment-note">
          {isOwner
            ? `Prepaid billing: a verified payment activates ${paidPeriodLabel(previewCycle)}. There is no automatic charge — you renew manually.`
            : "View only. Ask the workspace owner to start or renew a subscription."}
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {subscriptionPlans.map((plan, index) => {
            const planId = plan.id.toUpperCase() as PlanId;
            const current = currentIndex === index;
            const action = state.status === "loading" ? "Loading subscription…"
              : current ? "Renew" : currentIndex < 0 ? `Choose ${plan.name}` : index > currentIndex ? "Upgrade" : "Downgrade";
            return (
              <article aria-labelledby={`billing-plan-${plan.id}`} className={`card flex min-w-0 flex-col p-6 ${current ? "!border-primary-500 ring-1 ring-primary-500" : ""}`} key={plan.id}>
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className={`w-fit rounded-full px-3 py-1 text-sm font-bold ${plan.accent}`} id={`billing-plan-${plan.id}`}>{plan.name}</h3>{current && <span className="inline-flex items-center gap-1 text-xs font-bold text-primary-700"><Icon name="check" size={13} />Current plan</span>}</div>
                <p className="mt-4 min-h-12 text-sm leading-6 text-[var(--theme-muted)]">{plan.description}</p>
                <div aria-atomic="true" aria-live="polite" className="mt-5">
                  <p><span className="text-4xl font-extrabold">${plan.monthlyPrice[billing]}</span><span className="text-sm text-[var(--theme-muted)]"> / month</span></p>
                  <p className="mt-2 text-xs text-[var(--theme-muted)]">{billing === "annual" ? `${formatUsd(checkoutPrice(planId, "ANNUAL"))} prepaid for 1 year` : `${formatUsd(checkoutPrice(planId, "MONTHLY"))} per month`}</p>
                </div>
                <ul className="mb-6 mt-6 space-y-3 border-t border-[var(--theme-border)] pt-5 text-sm leading-6 text-[var(--theme-muted)]">{plan.features.map((feature) => <li className="flex items-start gap-2" key={feature}><Icon className="mt-1 shrink-0 text-primary-600" name="check" size={14} /><span>{feature}</span></li>)}</ul>
                <button
                  aria-describedby="payment-note"
                  className={`mt-auto min-h-11 w-full rounded-lg px-3 text-sm font-semibold ${isOwner ? "bg-primary-600 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60" : "cursor-not-allowed border border-[var(--theme-border)] bg-[var(--theme-panel-soft)] text-[var(--theme-muted)]"}`}
                  disabled={!isOwner || busy || state.status === "loading"}
                  onClick={() => onSelectPlan(planId, previewCycle)}
                  type="button"
                >
                  {action}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <CheckoutStatus checkout={checkout} onConfirm={onConfirmCheckout} onDismiss={onDismissCheckout} />
    </div>
  );
}

function CheckoutStatus({ checkout, onConfirm, onDismiss }: {
  checkout: CheckoutStep;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  if (checkout.status === "idle") return null;

  if (checkout.status === "confirming") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-4">
        <div aria-labelledby="checkout-confirm-title" aria-modal="true" className="card w-full max-w-md p-6" role="dialog">
          <h3 className="text-lg font-bold text-[var(--theme-heading)]" id="checkout-confirm-title">Confirm your payment</h3>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4"><dt className="text-[var(--theme-muted)]">Plan</dt><dd className="font-semibold">{planName(checkout.plan)}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-[var(--theme-muted)]">Billing</dt><dd className="font-semibold">{cycleName(checkout.billingCycle)}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-[var(--theme-muted)]">Amount</dt><dd className="font-semibold">{formatUsd(checkoutPrice(checkout.plan, checkout.billingCycle))}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-[var(--theme-muted)]">Paid period</dt><dd className="font-semibold">{paidPeriodLabel(checkout.billingCycle)}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-[var(--theme-muted)]">Renewal</dt><dd className="font-semibold">Manual renewal</dd></div>
          </dl>
          <p className="mt-5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] px-4 py-3 text-sm text-[var(--theme-muted)]">
            Manual renewal — nothing is charged automatically, and upgrades activate after payment is verified and keep your remaining paid time. Downgrades and billing-cycle-only changes start when the current paid period ends. You will be redirected to ABA PayWay to pay securely.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button className="min-h-11 rounded-lg border border-[var(--theme-border)] px-4 text-sm font-semibold" onClick={onDismiss} type="button">Cancel</button>
            <button className="min-h-11 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700" onClick={onConfirm} type="button">Confirm &amp; pay</button>
          </div>
        </div>
      </div>
    );
  }

  if (checkout.status === "starting") {
    return (
      <section aria-busy="true" aria-live="polite" className="card p-5" role="status">
        <p className="text-sm font-semibold">Starting secure PayWay checkout…</p>
        <p className="mt-2 text-sm text-[var(--theme-muted)]">Preparing a signed payment request for {planName(checkout.plan)} ({cycleName(checkout.billingCycle)}).</p>
      </section>
    );
  }

  if (checkout.status === "verifying") {
    return (
      <section aria-busy="true" aria-live="polite" className="card p-5" role="status">
        <p className="text-sm font-semibold">Confirming payment…</p>
        <p className="mt-2 text-sm text-[var(--theme-muted)]">Waiting for ABA PayWay to confirm this payment. Your subscription is activated only after the backend verifies it.</p>
      </section>
    );
  }

  if (checkout.status === "verified") {
    return (
      <section aria-live="polite" className="card p-5" role="status">
        <p className="text-sm font-semibold text-emerald-700">Payment confirmed</p>
        <p className="mt-2 text-sm text-[var(--theme-muted)]">{planName(checkout.plan)} is active. Your next renewal is a manual payment when this period ends.</p>
      </section>
    );
  }

  if (checkout.status === "abandoned") {
    return (
      <section aria-live="polite" className="card p-5" role="status">
        <p className="text-sm font-semibold">Checkout was cancelled</p>
        <p className="mt-2 text-sm text-[var(--theme-muted)]">No payment was taken and your current plan is unchanged.</p>
      </section>
    );
  }

  return (
    <section aria-live="polite" className="card p-5" role="alert">
      <p className="text-sm font-semibold text-red-700">{checkout.status === "failed" ? "We couldn't confirm that payment." : "We couldn't start the payment."}</p>
      <p className="mt-2 text-sm text-[var(--theme-muted)]">{checkout.message}</p>
      <button className="mt-4 min-h-11 rounded-lg border border-[var(--theme-border)] px-4 text-sm font-semibold" onClick={onDismiss} type="button">Try again</button>
    </section>
  );
}
