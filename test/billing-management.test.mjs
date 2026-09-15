import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BillingManagement } from "../src/components/billing-management.tsx";

const NOW = new Date("2026-09-13T00:00:00Z");

const record = (plan, overrides = {}) => ({
  plan,
  status: "ACTIVE",
  billingCycle: "MONTHLY",
  renewalMode: "MANUAL",
  currentPeriodStart: "2026-09-01T00:00:00Z",
  currentPeriodEnd: "2026-10-01T00:00:00Z",
  cancelAtPeriodEnd: false,
  pendingPlan: null,
  pendingBillingCycle: null,
  ...overrides,
});

function render(state, options = {}) {
  const { billing = "monthly", isOwner = true, checkout = { status: "idle" }, now = NOW } = options;
  return renderToStaticMarkup(createElement(BillingManagement, {
    state,
    billing,
    isOwner,
    checkout,
    now,
    onRetrySubscription() {},
    onBillingChange() {},
    onSelectPlan() {},
    onConfirmCheckout() {},
    onDismissCheckout() {},
  }));
}

for (const [plan, name, upgrades, downgrades] of [["PLUS", "Plus", 2, 0], ["PRO", "Pro", 1, 1], ["BUSINESS", "Business", 0, 2]]) {
  test(`${plan} current plan shows real billing details and manual renewal`, () => {
    const html = render({ status: "ready", subscription: record(plan) });
    assert.match(html, new RegExp(`>${name}</dd>`));
    assert.match(html, />Active<\/dd>/);
    assert.match(html, />Monthly<\/dd>/);
    assert.match(html, />Renews manually<\/dt>/);
    assert.match(html, /Oct 1, 2026/);
    assert.match(html, /Manual renewal/);
    assert.match(html, /Nothing is charged automatically/);
    assert.doesNotMatch(html, /Auto-?renews?/i);
    assert.equal((html.match(/>Upgrade<\/button>/g) ?? []).length, upgrades);
    assert.equal((html.match(/>Downgrade<\/button>/g) ?? []).length, downgrades);
    assert.equal((html.match(/>Renew<\/button>/g) ?? []).length, 1);
    assert.equal((html.match(/>Current plan<\/span>/g) ?? []).length, 1);
  });
}

test("no subscription offers choices without inventing details", () => {
  const html = render({ status: "ready", subscription: null });
  assert.match(html, /No active subscription/);
  for (const name of ["Plus", "Pro", "Business"]) assert.match(html, new RegExp(`>Choose ${name}</button>`));
  assert.doesNotMatch(html, />Renews manually<\/dt>/);
});

test("loading uses skeletons without a no-subscription flash", () => {
  const html = render({ status: "loading" });
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /motion-safe:animate-pulse/);
  assert.doesNotMatch(html, /No active subscription|>Choose Plus/);
});

test("failure stays separate from an empty subscription", () => {
  const html = render({ status: "error" });
  assert.match(html, /Unable to load subscription information\./);
  assert.doesNotMatch(html, /No active subscription|Current plan|Selection unavailable/);
  assert.match(html, />Retry subscription<\/button>/);
  for (const name of ["Plus", "Pro", "Business"]) assert.match(html, new RegExp(`>Choose ${name}</button>`));
  assert.doesNotMatch(html, /disabled=""/);
});

test("subscription failures preserve owner and checkout restrictions", () => {
  for (const options of [{ isOwner: false }, { checkout: { status: "starting", plan: "PLUS", billingCycle: "MONTHLY" } }, { checkout: { status: "verifying", tranId: "EVL123" } }]) {
    const html = render({ status: "error" }, options);
    assert.equal((html.match(/disabled=""/g) ?? []).length, 3);
  }
});

test("monthly and annual previews show the prepaid totals without changing actual billing", () => {
  const state = { status: "ready", subscription: record("PRO") };
  const monthly = render(state);
  const annual = render(state, { billing: "annual" });
  for (const price of [29, 79, 199]) assert.ok(monthly.includes(`>$${price}</span>`));
  for (const price of [23, 63, 159]) assert.ok(annual.includes(`>$${price}</span>`));
  assert.match(monthly, /\$79\.00 per month/);
  assert.match(annual, /\$756\.00 prepaid for 1 year/);
  assert.match(annual, />Monthly<\/dd>/);
  assert.match(annual, /aria-pressed="true"[^>]*>Annual<\/button>/);
});

test("a scheduled cancellation shows the end date and stops promising renewal", () => {
  const html = render({ status: "ready", subscription: record("PRO", { cancelAtPeriodEnd: true, billingCycle: "ANNUAL" }) });
  assert.match(html, />Expires<\/dt>/);
  assert.match(html, />Annual<\/dd>/);
  assert.doesNotMatch(html, />Renews manually<\/dt>/);
});

test("ended subscriptions do not promise renewal", () => {
  for (const status of ["CANCELLED", "EXPIRED"]) {
    const html = render({ status: "ready", subscription: record("PRO", { status }) });
    assert.match(html, />Expires<\/dt>/);
    assert.doesNotMatch(html, />Renews manually<\/dt>/);
  }
});

test("an expiring subscription offers a manual renewal prompt", () => {
  const due = render({ status: "ready", subscription: record("PRO", { currentPeriodEnd: "2026-09-20T00:00:00Z" }) });
  assert.match(due, /Your subscription expires on Sep 20, 2026\. Renew now\./);
  assert.match(due, />Renew now<\/button>/);

  const notDue = render({ status: "ready", subscription: record("PRO") });
  assert.doesNotMatch(notDue, /Renew now/);
});

test("a paid plan change is announced for the end of the current period", () => {
  const html = render({ status: "ready", subscription: record("PRO", { pendingPlan: "BUSINESS", pendingBillingCycle: "ANNUAL" }) });
  assert.match(html, /Paid plan change: <strong>Business<\/strong> \(Annual\) starts when this period ends on Oct 1, 2026\./);
});

test("non-owners can read billing but cannot start or renew a payment", () => {
  const html = render({ status: "ready", subscription: record("PRO", { currentPeriodEnd: "2026-09-20T00:00:00Z" }) }, { isOwner: false });
  assert.match(html, /Only the workspace owner can change the plan/);
  assert.match(html, /View only\. Ask the workspace owner to start or renew a subscription\./);
  // Three plan buttons plus the renewal prompt: all visible, all disabled.
  assert.equal((html.match(/disabled=""/g) ?? []).length, 4);
  assert.match(html, /disabled=""[^>]*>Renew now<\/button>/);
  assert.match(html, /disabled=""[^>]*>Downgrade<\/button>/);
});

test("owner sees the prepaid wording and can act", () => {
  const html = render({ status: "ready", subscription: record("PRO") });
  assert.match(html, /Each payment covers one billing cycle\. Renew manually when it ends\./);
  assert.match(html, /Prepaid billing: a verified payment activates 1 month/);
  assert.doesNotMatch(html, /View only/);
});

test("confirmation dialog states plan, price, paid period and manual renewal", () => {
  const html = render({ status: "ready", subscription: record("PRO") }, { billing: "annual", checkout: { status: "confirming", plan: "BUSINESS", billingCycle: "ANNUAL" } });
  assert.match(html, /role="dialog"/);
  assert.match(html, /Confirm your payment/);
  assert.match(html, />Business<\/dd>/);
  assert.match(html, />Annual<\/dd>/);
  assert.match(html, /\$1908\.00/);
  assert.match(html, />1 year<\/dd>/);
  assert.match(html, />Manual renewal<\/dd>/);
  assert.match(html, />Confirm &amp; pay<\/button>/);
});

test("checkout lifecycle states say exactly what is known", () => {
  const ready = { status: "ready", subscription: null };
  const starting = render(ready, { checkout: { status: "starting", plan: "PRO", billingCycle: "MONTHLY" } });
  assert.match(starting, /aria-busy="true"/);
  assert.match(starting, /Starting secure PayWay checkout…/);

  const verifying = render(ready, { checkout: { status: "verifying", tranId: "EVL123" } });
  assert.match(verifying, /Confirming payment…/);
  assert.match(verifying, /activated only after the backend verifies it/);
  assert.doesNotMatch(verifying, /Payment confirmed/);

  const verified = render(ready, { checkout: { status: "verified", plan: "PRO" } });
  assert.match(verified, /Payment confirmed/);
  assert.match(verified, /Pro is active/);
  assert.doesNotMatch(verified, /Confirming payment/);

  // React escapes apostrophes in markup, so match the surrounding words.
  const failed = render(ready, { checkout: { status: "failed", message: "PayWay reported declined." } });
  assert.match(failed, /confirm that payment\./);
  assert.match(failed, /PayWay reported declined\./);
  assert.match(failed, />Try again<\/button>/);

  const abandoned = render(ready, { checkout: { status: "abandoned" } });
  assert.match(abandoned, /Checkout was cancelled/);
  assert.match(abandoned, /No payment was taken/);

  const error = render(ready, { checkout: { status: "error", message: "Card payments are not available right now." } });
  assert.match(error, /start the payment\./);
  assert.match(error, /Card payments are not available right now\./);

  assert.doesNotMatch(render(ready), /Confirming payment|Payment confirmed|Checkout was cancelled/);
});


test("backend-authorized sandbox tester can choose every plan and confirm payment", () => {
  const html = render({ status: "ready", subscription: null }, { isOwner: true });
  for (const name of ["Plus", "Pro", "Business"]) {
    const button = html.match(new RegExp(`<button[^>]*>Choose ${name}</button>`))?.[0];
    assert.ok(button);
    assert.doesNotMatch(button, / disabled=""/);
  }
  const confirmation = render({ status: "ready", subscription: null }, {
    isOwner: true, checkout: { status: "confirming", plan: "PLUS", billingCycle: "MONTHLY" },
  });
  assert.match(confirmation, /Confirm &amp; pay/);
});
