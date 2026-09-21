import test from "node:test";
import assert from "node:assert/strict";
import { fetchCurrentSubscription, subscriptionLabel, subscriptionLoading } from "../src/lib/current-subscription.ts";

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });
const fixture = (plan) => ({ plan, status: "ACTIVE", billingCycle: "MONTHLY",
  currentPeriodStart: "2026-09-01T00:00:00.000Z", currentPeriodEnd: "2026-10-01T00:00:00.000Z", cancelAtPeriodEnd: false });

for (const [plan, label] of [["PLUS", "Plus"], ["PRO", "Pro"], ["BUSINESS", "Business"]]) {
  test(`${plan} response uses authenticated proxy and displays ${label}`, async () => {
    const controller = new AbortController();
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "/api/backend/subscriptions/current");
      assert.equal(options.credentials, "same-origin");
      assert.equal(options.cache, "no-store");
      assert.equal(options.signal, controller.signal);
      return Response.json(fixture(plan));
    };
    const subscription = await fetchCurrentSubscription(controller.signal);
    assert.equal(subscriptionLabel({ status: "ready", subscription }), label);
  });
}
test("explicit null displays No active plan", async () => {
  globalThis.fetch = async () => Response.json(null);
  const subscription = await fetchCurrentSubscription(new AbortController().signal);
  assert.equal(subscription, null);
  assert.equal(subscriptionLabel({ status: "ready", subscription }), "No active plan");
});
test("HTTP and network failures reject and have a separate unavailable label", async () => {
  globalThis.fetch = async () => Response.json({ message: "failure" }, { status: 500 });
  await assert.rejects(fetchCurrentSubscription(new AbortController().signal));
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(fetchCurrentSubscription(new AbortController().signal));
  assert.equal(subscriptionLabel({ status: "error" }), "Subscription unavailable");
});
test("loading remains distinct while the request is pending", async () => {
  let finish;
  globalThis.fetch = () => new Promise((resolve) => { finish = resolve; });
  let state = subscriptionLoading;
  const pending = fetchCurrentSubscription(new AbortController().signal).then((subscription) => {
    state = { status: "ready", subscription };
  });
  assert.equal(subscriptionLabel(state), "Loading subscription…");
  finish(Response.json(null));
  await pending;
  assert.equal(subscriptionLabel(state), "No active plan");
});
test("workspace requests do not reuse the shared GET cache", async () => {
  let calls = 0;
  globalThis.fetch = async () => Response.json(fixture(++calls === 1 ? "PLUS" : "BUSINESS"));
  assert.equal((await fetchCurrentSubscription(new AbortController().signal)).plan, "PLUS");
  assert.equal((await fetchCurrentSubscription(new AbortController().signal)).plan, "BUSINESS");
  assert.equal(calls, 2);
});
test("unknown plans and malformed responses are errors, not no-plan states", async () => {
  for (const payload of [{}, fixture("UNKNOWN"), { ...fixture("PRO"), status: "UNKNOWN" }]) {
    globalThis.fetch = async () => Response.json(payload);
    await assert.rejects(fetchCurrentSubscription(new AbortController().signal), /Invalid subscription response/);
  }
});
