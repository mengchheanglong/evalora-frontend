"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/button-link";
import { Icon } from "@/components/icons";
import { subscriptionPlans, type BillingInterval } from "@/lib/subscription-plans";

export function SubscriptionPlans() {
  const [billing, setBilling] = useState<BillingInterval>("monthly");

  return (
    <section aria-labelledby="pricing-heading" className="mx-auto max-w-[1200px] scroll-mt-24 px-5 py-16 sm:px-8 sm:py-20" id="pricing">
      <div className="mx-auto max-w-[680px] text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700">Simple pricing</p>
        <h2 className="mt-3 text-2xl font-extrabold leading-[1.15] tracking-[-0.02em] text-neutral-950 sm:text-4xl" id="pricing-heading">
          Choose the right plan for your team
        </h2>
        <p className="mt-4 text-sm text-neutral-500 sm:text-base">
          Everything you need to run fair, efficient, and insightful interviews — at any scale.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <div aria-label="Billing interval" className="inline-flex rounded-xl border border-neutral-200 bg-neutral-50 p-1" role="group">
            {(["monthly", "annual"] as const).map((interval) => (
              <button
                aria-pressed={billing === interval}
                className={`min-h-11 cursor-pointer rounded-lg px-5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${billing === interval ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-950"}`}
                key={interval}
                onClick={() => setBilling(interval)}
                type="button"
              >
                {interval === "monthly" ? "Monthly" : "Annual"}
              </button>
            ))}
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Save up to 20%</span>
        </div>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {subscriptionPlans.map((plan) => (
          <article
            aria-labelledby={`plan-${plan.id}`}
            className={`relative flex min-w-0 flex-col rounded-2xl border bg-white p-6 sm:p-7 ${plan.popular ? "border-blue-500 ring-1 ring-blue-500 shadow-[0_16px_48px_-20px_rgba(59,130,246,0.35)]" : "border-neutral-200 shadow-[0_12px_32px_-20px_rgba(15,23,42,0.18)]"} ${plan.id === "business" ? "md:col-span-2 md:mx-auto md:w-[calc(50%-0.75rem)] lg:col-span-1 lg:w-full" : ""}`}
            key={plan.id}
          >
            {plan.popular && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-600 px-4 py-1.5 text-xs font-bold text-white">
                Most Popular
              </span>
            )}
            <h3 className={`w-fit rounded-lg px-3 py-1.5 text-sm font-bold sm:text-sm ${plan.accent}`} id={`plan-${plan.id}`}>{plan.name}</h3>
            <p className="mt-4 min-h-12 text-sm leading-6 text-neutral-500">{plan.description}</p>
            <div aria-atomic="true" aria-live="polite" className="mt-6">
              <p className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-3xl font-extrabold tracking-tight text-neutral-950 sm:text-5xl">${plan.monthlyPrice[billing]}</span>
                <span className="text-xs text-neutral-500 sm:text-sm">/ month</span>
              </p>
              <p className="mt-2 text-[11px] text-neutral-500 sm:text-xs">
                {billing === "annual" ? `$${(plan.monthlyPrice.annual * 12).toLocaleString("en-US")} billed annually` : "Billed monthly"}
              </p>
            </div>
            <ButtonLink
              aria-label={`${plan.action} — ${plan.name}`}
              className={`mt-6 h-11 w-full !rounded-lg ${plan.popular ? "!bg-blue-600 hover:!bg-blue-700" : ""}`}
              href={plan.href}
              variant={plan.popular ? "primary" : "outline"}
            >
              {plan.action}
            </ButtonLink>
            <ul className="mb-6 mt-7 space-y-2 border-t border-neutral-100 pt-6 sm:space-y-3 sm:pt-6">
              {plan.features.map((feature) => (
                <li className="flex items-start gap-2 text-sm leading-5 text-neutral-700 sm:gap-2.5 sm:leading-6" key={feature}>
                  <span aria-hidden="true" className={`mt-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full ${plan.accent}`}>
                    <Icon name="check" size={12} />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <p className="mt-auto border-t border-neutral-100 pt-5 text-[11px] leading-4 text-neutral-500 sm:text-xs sm:leading-5">{plan.footer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
