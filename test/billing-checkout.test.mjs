import test from "node:test";
import assert from "node:assert/strict";
import {
  CHECKOUT_PRICES,
  checkoutPrice,
  fetchPaymentAttempt,
  formatUsd,
  paidPeriodLabel,
  parseCheckoutReturn,
  pollPaymentAttempt,
  startCheckout,
} from "../src/lib/subscription-checkout.ts";
import { parseCurrentSubscription } from "../src/lib/current-subscription.ts";

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });

const session = (overrides = {}) => ({
  attemptId: "attempt-1",
  tranId: "EVLTESTTRAN0001",
  plan: "PRO",
  billingCycle: "MONTHLY",
  amountMinor: 7900,
  amountDisplay: "79.00",
  currency: "USD",
  purpose: "NEW_SUBSCRIPTION",
  paidPeriod: "1 month",
  checkout: {
    actionUrl: "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase",
    method: "POST",
    fields: { tran_id: "EVLTESTTRAN0001", amount: "79.00", hash: "signed-hash" },
  },
  ...overrides,
});

test("the display catalog matches the backend price list", () => {
  assert.deepEqual(CHECKOUT_PRICES, {
    PLUS: { MONTHLY: 2900, ANNUAL: 27600 },
    PRO: { MONTHLY: 7900, ANNUAL: 75600 },
    BUSINESS: { MONTHLY: 19900, ANNUAL: 190800 },
  });
  assert.equal(checkoutPrice("PLUS", "MONTHLY"), 29_00);
  assert.equal(checkoutPrice("PLUS", "ANNUAL"), 276_00);
  assert.equal(checkoutPrice("PRO", "MONTHLY"), 79_00);
  assert.equal(checkoutPrice("PRO", "ANNUAL"), 756_00);
  assert.equal(checkoutPrice("BUSINESS", "MONTHLY"), 199_00);
  assert.equal(checkoutPrice("BUSINESS", "ANNUAL"), 1908_00);
  assert.equal(formatUsd(29_00), "$29.00");
  assert.equal(formatUsd(1908_00), "$1908.00");
  assert.equal(paidPeriodLabel("MONTHLY"), "1 month");
  assert.equal(paidPeriodLabel("ANNUAL"), "1 year");
});

test("checkout sends only the plan and cycle and returns the signed hosted form", async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return Response.json(session());
  };

  const result = await startCheckout("PRO", "MONTHLY");

  assert.equal(request.url, "/api/backend/subscriptions/checkout");
  assert.equal(request.options.method, "POST");
  assert.deepEqual(JSON.parse(request.options.body), { plan: "PRO", billingCycle: "MONTHLY" });
  // No amount, currency or price is ever sent by the browser.
  assert.doesNotMatch(request.options.body, /amount|price|currency/i);
  assert.equal(result.tranId, "EVLTESTTRAN0001");
  assert.equal(result.amountDisplay, "$79.00");
  assert.equal(result.checkout.fields.hash, "signed-hash");
});

test("checkout rejects responses that could not be paid safely", async () => {
  const broken = [
    session({ checkout: { ...session().checkout, actionUrl: "http://insecure.example.com/purchase" } }),
    session({ checkout: { ...session().checkout, fields: { tran_id: "EVLTESTTRAN0001" } } }),
    session({ checkout: { ...session().checkout, fields: { tran_id: "other", hash: "signed-hash" } } }),
    session({ amountMinor: 0 }),
    session({ plan: "ENTERPRISE" }),
    session({ billingCycle: "WEEKLY" }),
    "not-an-object",
  ];
  for (const payload of broken) {
    globalThis.fetch = async () => Response.json(payload);
    await assert.rejects(startCheckout("PRO", "MONTHLY"), /Invalid checkout response/);
  }
});

test("a cancelled or abandoned return never reports success", async () => {
  assert.deepEqual(parseCheckoutReturn("?checkout=cancelled&tran_id=EVLTESTTRAN0001"), { kind: "cancelled", tranId: "EVLTESTTRAN0001" });
  assert.deepEqual(parseCheckoutReturn("?checkout=cancelled"), { kind: "cancelled", tranId: null });
  assert.deepEqual(parseCheckoutReturn("?checkout=return&tran_id=EVLTESTTRAN0001"), { kind: "return", tranId: "EVLTESTTRAN0001" });
  // A return without a transaction id tells us nothing at all.
  assert.equal(parseCheckoutReturn("?checkout=return"), null);
  assert.equal(parseCheckoutReturn(""), null);
});

test("payment polling waits for backend verification instead of trusting the redirect", async () => {
  const seen = [];
  let calls = 0;
  globalThis.fetch = async (url) => {
    assert.equal(url, "/api/backend/subscriptions/attempts/EVLTESTTRAN0001");
    calls += 1;
    return Response.json({
      tranId: "EVLTESTTRAN0001",
      status: calls < 3 ? "PENDING" : "VERIFIED",
      plan: "PRO",
      billingCycle: "MONTHLY",
      amountDisplay: "79.00",
      currency: "USD",
      failureReason: null,
      verifiedAt: calls < 3 ? null : "2026-09-13T09:00:00.000Z",
      subscription: null,
    });
  };

  const result = await pollPaymentAttempt("EVLTESTTRAN0001", { attempts: 5, intervalMs: 0, onPending: (attempt) => seen.push(attempt.status) });

  assert.equal(result.status, "VERIFIED");
  assert.equal(calls, 3);
  assert.deepEqual(seen, ["PENDING", "PENDING"]);
});

test("payment polling gives up and a failed attempt explains itself", async () => {
  globalThis.fetch = async () => Response.json({
    tranId: "EVLTESTTRAN0001", status: "PENDING", plan: "PRO", billingCycle: "MONTHLY",
    amountDisplay: "79.00", currency: "USD", failureReason: null, verifiedAt: null, subscription: null,
  });
  assert.equal(await pollPaymentAttempt("EVLTESTTRAN0001", { attempts: 2, intervalMs: 0 }), null);

  globalThis.fetch = async () => Response.json({
    tranId: "EVLTESTTRAN0001", status: "FAILED", plan: "PRO", billingCycle: "MONTHLY",
    amountDisplay: "79.00", currency: "USD", failureReason: "PayWay reported declined.", verifiedAt: null, subscription: null,
  });
  const failed = await pollPaymentAttempt("EVLTESTTRAN0001", { attempts: 2, intervalMs: 0 });
  assert.equal(failed.status, "FAILED");
  assert.equal(failed.failureReason, "PayWay reported declined.");
});

test("payment attempt and subscription responses are validated before display", async () => {
  globalThis.fetch = async () => Response.json({ tranId: "EVLTESTTRAN0001", status: "UNKNOWN" });
  await assert.rejects(fetchPaymentAttempt("EVLTESTTRAN0001"), /Invalid payment attempt response/);

  globalThis.fetch = async () => Response.json({ tranId: "EVLTESTTRAN0001", status: "VERIFIED", plan: "PRO", billingCycle: "MONTHLY" });
  const attempt = await fetchPaymentAttempt("EVLTESTTRAN0001");
  assert.equal(attempt.status, "VERIFIED");
  assert.equal(attempt.subscription, null);
});

test("subscription parsing keeps manual renewal and pending changes", () => {
  const subscription = parseCurrentSubscription({
    plan: "PRO", status: "ACTIVE", billingCycle: "MONTHLY", renewalMode: "MANUAL",
    currentPeriodStart: "2026-09-01T00:00:00.000Z", currentPeriodEnd: "2026-10-01T00:00:00.000Z",
    cancelAtPeriodEnd: false, pendingPlan: "BUSINESS", pendingBillingCycle: "ANNUAL",
  });
  assert.deepEqual(subscription, {
    plan: "PRO", status: "ACTIVE", billingCycle: "MONTHLY", renewalMode: "MANUAL",
    currentPeriodStart: "2026-09-01T00:00:00.000Z", currentPeriodEnd: "2026-10-01T00:00:00.000Z",
    cancelAtPeriodEnd: false, pendingPlan: "BUSINESS", pendingBillingCycle: "ANNUAL",
  });

  // A backend that predates manual-renewal fields still renders as manual billing.
  const legacy = parseCurrentSubscription({
    plan: "PRO", status: "ACTIVE", billingCycle: "MONTHLY",
    currentPeriodStart: "2026-09-01T00:00:00.000Z", currentPeriodEnd: "2026-10-01T00:00:00.000Z", cancelAtPeriodEnd: false,
  });
  assert.equal(legacy.renewalMode, "MANUAL");
  assert.equal(legacy.pendingPlan, null);

  assert.throws(() => parseCurrentSubscription({ plan: "UNKNOWN", status: "ACTIVE", billingCycle: "MONTHLY",
    currentPeriodStart: "2026-09-01T00:00:00.000Z", currentPeriodEnd: "2026-10-01T00:00:00.000Z", cancelAtPeriodEnd: false }));
});
