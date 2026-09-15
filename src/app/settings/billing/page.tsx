"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { BillingManagement, type CheckoutStep } from "@/components/billing-management";
import { useCurrentSubscription } from "@/components/use-current-subscription";
import { apiGet, getErrorMessage } from "@/lib/api";
import {
  parseCheckoutReturn,
  pollPaymentAttempt,
  startCheckout,
  submitPayWayForm,
  type BillingCycleId,
  type PlanId,
} from "@/lib/subscription-checkout";
import type { BillingInterval } from "@/lib/subscription-plans";

export default function BillingPage() {
  const { user, status } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const subscription = useCurrentSubscription(user?.id, user?.organizationId, status === "authenticated", reloadKey);
  const [previewBilling, setPreviewBilling] = useState<BillingInterval>("monthly");
  const [checkout, setCheckout] = useState<CheckoutStep>({ status: "idle" });
  const handledReturn = useRef(false);
  const [billingPermission, setBillingPermission] = useState<{ userId: string; organizationId?: string; allowed: boolean } | null>(null);
  const canManageBilling = user?.role === "organization" || Boolean(
    user && billingPermission?.userId === user.id
    && billingPermission.organizationId === user.organizationId && billingPermission.allowed,
  );

  useEffect(() => {
    if (!user || status !== "authenticated") return;
    const controller = new AbortController();
    void apiGet<{ canManageBilling: boolean }>("/subscriptions/permissions", { signal: controller.signal })
      .then((permissions) => {
        if (!controller.signal.aborted) setBillingPermission({ userId: user.id, organizationId: user.organizationId, allowed: permissions.canManageBilling === true });
      })
      .catch(() => {
        if (!controller.signal.aborted) setBillingPermission(null);
      });
    return () => controller.abort();
  }, [user, status]);

  /**
   * A redirect back from PayWay proves nothing on its own, so this waits for the
   * backend to verify the transaction with ABA PayWay before showing success.
   */
  const verifyPayment = useCallback(async (tranId: string) => {
    setCheckout({ status: "verifying", tranId });
    try {
      const attempt = await pollPaymentAttempt(tranId);
      if (!attempt) {
        setCheckout({
          status: "failed",
          message: "ABA PayWay has not confirmed this payment yet. Wait a moment and reload this page to check again.",
        });
        return;
      }
      if (attempt.status === "VERIFIED") {
        setCheckout({ status: "verified", plan: attempt.plan });
        setReloadKey((key) => key + 1);
        return;
      }
      setCheckout({ status: "failed", message: attempt.failureReason ?? "This payment was not completed." });
    } catch (error) {
      setCheckout({
        status: "failed",
        message: getErrorMessage(error, "We couldn't check this payment. Reload this page to try again."),
      });
    }
  }, []);

  useEffect(() => {
    if (handledReturn.current) return;
    const returned = parseCheckoutReturn(window.location.search);
    if (!returned) return;
    handledReturn.current = true;
    // Drop the return parameters so a refresh does not replay this state.
    window.history.replaceState(null, "", window.location.pathname);
    if (returned.kind === "cancelled") {
      setCheckout({ status: "abandoned" });
      return;
    }
    void verifyPayment(returned.tranId);
  }, [verifyPayment]);

  const handleSelectPlan = (plan: PlanId, billingCycle: BillingCycleId) => {
    if (!canManageBilling) return;
    setCheckout({ status: "confirming", plan, billingCycle });
  };

  const handleConfirm = async () => {
    if (!canManageBilling || checkout.status !== "confirming") return;
    const selection = checkout;
    setCheckout({ status: "starting", plan: selection.plan, billingCycle: selection.billingCycle });
    try {
      const session = await startCheckout(selection.plan, selection.billingCycle);
      setCheckout({ status: "verifying", tranId: session.tranId });
      // Hands the signed fields to PayWay; the backend keeps the API key.
      submitPayWayForm(session);
    } catch (error) {
      setCheckout({
        status: "error",
        message: getErrorMessage(error, "We couldn't start the payment. Please try again."),
      });
    }
  };

  return (
    <AppShell active="settings" breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Billing & Subscription" }]} title="Billing & Subscription" description="Prepaid plans with manual renewal — pay for a month or a year at a time.">
      <BillingManagement
        billing={previewBilling}
        checkout={checkout}
        isOwner={canManageBilling}
        onBillingChange={setPreviewBilling}
        onConfirmCheckout={handleConfirm}
        onDismissCheckout={() => setCheckout({ status: "idle" })}
        onRetrySubscription={() => setReloadKey((key) => key + 1)}
        onSelectPlan={handleSelectPlan}
        state={subscription}
      />
    </AppShell>
  );
}
