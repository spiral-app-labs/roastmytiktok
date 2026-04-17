"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

const PRO_PRICE = 9.99;

const FAQ = [
  {
    q: "What counts as a roast?",
    a: "One roast is one uploaded video analyzed across the full critique stack: hook, pacing, clarity, retention risk, and reshoot direction.",
  },
  {
    q: "How does paid access work?",
    a: "Checkout runs through Stripe. Once Stripe confirms the subscription, your account gets a server-side paid entitlement for Go Viral.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Paid subscribers can open the Stripe billing portal from Settings to cancel or manage billing details.",
  },
  {
    q: "What comes with Pro?",
    a: "You get the full six-agent roast workflow, account-backed access, and Stripe billing management tied to your subscription.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-zinc-200 transition-colors hover:text-white"
      >
        {q}
        <span className="ml-4 shrink-0 text-lg leading-none text-zinc-500">{open ? "−" : "+"}</span>
      </button>
      {open ? <p className="px-5 pb-4 text-sm leading-relaxed text-zinc-400">{a}</p> : null}
    </div>
  );
}

function PricingPageContent() {
  const searchParams = useSearchParams();
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (cancelled) return;

      const hasSession = Boolean(session?.user);
      setSignedIn(hasSession);
      setSessionLoaded(true);

      if (!hasSession) {
        if (searchParams.get("checkout") === "cancelled") {
          setMessage("Checkout was cancelled. You can restart it whenever you’re ready.");
        }
        return;
      }

      const res = await fetch("/api/usage").catch(() => null);
      const data = await res?.json().catch(() => null) as { subscription?: { isSubscribed?: boolean } } | null;

      if (!cancelled) {
        setIsPaid(Boolean(data?.subscription?.isSubscribed));
        if (searchParams.get("checkout") === "cancelled") {
          setMessage("Checkout was cancelled. You can restart it whenever you’re ready.");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  async function startCheckout() {
    setCheckoutLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!signedIn) {
        window.location.href = "/login?redirect=/pricing&intent=subscribe&plan=pro";
        return;
      }

      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json().catch(() => null) as { error?: string; url?: string; redirectTo?: string } | null;

      if (res.status === 409 && data?.redirectTo) {
        window.location.href = data.redirectTo;
        return;
      }

      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Failed to start checkout");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function openBillingPortal() {
    setBillingLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/settings/billing-portal", { method: "POST" });
      const data = await res.json().catch(() => null) as { error?: string; url?: string } | null;

      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Failed to open billing");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open billing");
    } finally {
      setBillingLoading(false);
    }
  }

  return (
    <main className="relative flex flex-1 flex-col items-center overflow-x-hidden px-4 py-16 md:py-24">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-orange-500/7 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[360px] w-[360px] rounded-full bg-rose-500/6 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 max-w-2xl text-center"
      >
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-400">
          🔥 Live Stripe checkout for Go Viral
        </div>
        <h1 className="mb-3 text-4xl font-bold text-white md:text-5xl">
          Go Viral is a paid product.
        </h1>
        <p className="text-lg text-zinc-400">
          Subscribe for the full six-agent roast workflow, account-backed access, and Stripe-managed billing.
        </p>
      </motion.div>

      {(message || error) ? (
        <div className={`mb-8 w-full max-w-4xl rounded-2xl border px-4 py-3 text-sm ${
          error
            ? "border-red-900/50 bg-red-950/20 text-red-300"
            : "border-sky-900/50 bg-sky-950/20 text-sky-200"
        }`}>
          {error ?? message}
        </div>
      ) : null}

      <div className="mb-16 grid w-full max-w-5xl grid-cols-1 gap-5 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-7"
        >
          <div className="mb-6">
            <h2 className="mb-1 text-lg font-semibold text-zinc-300">What your subscription includes</h2>
            <p className="text-sm text-zinc-500">One product, one workflow, and the full roast stack attached to your account.</p>
          </div>

          <div className="mb-8">
            <span className="text-5xl font-bold text-white">Full access</span>
          </div>

          <Link
            href={signedIn ? "/dashboard" : "/"}
            className="mb-8 block rounded-xl border border-zinc-700 px-6 py-3 text-center font-semibold text-zinc-300 transition-all hover:border-orange-500/40 hover:text-white"
          >
            {signedIn ? "Open Dashboard" : "Back to Home"}
          </Link>

          <div className="flex-1 space-y-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-600">Included</p>
            {[
              "Full upload + roast workflow",
              "Score, verdict, and six-agent breakdown",
              "Hook rewrites and reshoot direction",
              "Account-backed history and settings",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-sm text-zinc-400">
                <span className="mt-0.5 shrink-0">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative flex flex-col rounded-2xl border border-orange-500/30 bg-zinc-900/70 p-7 shadow-lg shadow-orange-500/10"
        >
          <div className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
            Pro
          </div>

          <div className="mb-6">
            <h2 className="mb-1 text-lg font-semibold text-white">Go Viral Pro</h2>
            <p className="text-sm text-zinc-400">Server-backed entitlements, live checkout, and billing managed through Stripe.</p>
          </div>

          <div className="mb-8">
            <span className="text-5xl font-bold text-white">${PRO_PRICE.toFixed(2)}</span>
            <span className="ml-2 text-sm text-zinc-500">/mo</span>
          </div>

          <div className="mb-8 space-y-3">
            {isPaid ? (
              <button
                onClick={openBillingPortal}
                disabled={billingLoading}
                className="block w-full rounded-xl bg-gradient-to-r from-sky-500 via-blue-500 to-violet-500 px-6 py-4 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {billingLoading ? "Opening…" : "Manage Billing"}
              </button>
            ) : (
              <button
                onClick={startCheckout}
                disabled={checkoutLoading || !sessionLoaded}
                className="block w-full rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-4 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {checkoutLoading ? "Redirecting…" : signedIn ? "Start Pro Checkout" : "Sign In to Subscribe"}
              </button>
            )}
            <p className="text-center text-xs text-zinc-500">
              {isPaid
                ? "Your subscription is already active. Open Stripe billing to manage it."
                : "Checkout is handled by Stripe. Paid access is applied to your account by webhook after purchase."}
            </p>
          </div>

          <div className="flex-1 space-y-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">What you get</p>
            {[
              "Full six-agent analysis on every roast",
              "Paid access follows your signed-in account across devices",
              "Stripe billing portal for cancellation and payment updates",
              "Clean paid access without roast quota popups",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-sm text-zinc-200">
                <span className="mt-0.5 shrink-0">⚡</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-16 w-full max-w-5xl rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
      >
        <h3 className="mb-6 text-center text-sm font-semibold uppercase tracking-wider text-zinc-300">
          What your subscription covers
        </h3>
        <div className="grid grid-cols-[1fr_auto] gap-3 text-sm">
          <div className="text-zinc-500 font-medium"></div>
          <div className="text-center font-semibold text-white">Pro</div>
          {[
            ["Full roast breakdown", "Included"],
            ["Hook rewrites", "Included"],
            ["Reshoot plan", "Included"],
            ["Account-backed access", "Included"],
            ["Checkout", "Live Stripe checkout"],
            ["Billing management", "Stripe portal in Settings"],
          ].map(([feature, value]) => (
            <div key={feature} className="contents">
              <div className="border-t border-zinc-800/50 py-2 text-zinc-400">{feature}</div>
              <div className="border-t border-zinc-800/50 py-2 text-center font-medium text-orange-300">{value}</div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-16 w-full max-w-2xl"
      >
        <h3 className="mb-8 text-center text-2xl font-bold text-white">Frequently asked</h3>
        <div className="space-y-2">
          {FAQ.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mx-auto max-w-lg text-center"
      >
        <h3 className="mb-2 text-2xl font-bold text-white">Ready to pressure-test your next post?</h3>
        <p className="mb-6 text-sm text-zinc-500">
          Start your subscription when you’re ready for account-backed access and the full Go Viral workflow.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={isPaid ? openBillingPortal : startCheckout}
            disabled={(isPaid ? billingLoading : checkoutLoading) || !sessionLoaded}
            className="inline-block rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-10 py-4 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isPaid ? "Manage Billing" : signedIn ? "Start Pro Checkout" : "Sign In to Subscribe"}
          </button>
          <Link
            href={signedIn ? "/dashboard" : "/"}
            className="inline-block rounded-xl border border-zinc-700 px-10 py-4 text-base font-semibold text-zinc-300 transition-all hover:border-orange-500/40 hover:text-white"
          >
            {signedIn ? "Open Dashboard" : "Back to Home"}
          </Link>
        </div>
      </motion.div>
    </main>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <PricingPageContent />
    </Suspense>
  );
}
