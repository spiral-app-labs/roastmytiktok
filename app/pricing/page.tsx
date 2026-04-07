"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

const FREE_FEATURES = [
  { text: `Full video upload + roast flow`, icon: `🎬` },
  { text: `Overall score, verdict, and full agent breakdowns`, icon: `📊` },
  { text: `Actionable fixes on every roast`, icon: `💬` },
  { text: `Saved history and replays`, icon: `🤖` },
];

const PRO_FEATURES = [
  { text: `Everything in Monthly`, icon: `♾️`, highlight: true },
  { text: `Lower effective monthly price`, icon: `🔍`, highlight: true },
  { text: `Higher limits and extras as they roll out`, icon: `💡`, highlight: true },
  { text: `Account-level analysis`, icon: `📈`, highlight: false },
  { text: `Priority processing`, icon: `⚡`, highlight: false },
  { text: `Export reports`, icon: `📄`, highlight: false },
  { text: `Best value for frequent creators`, icon: `🏆`, highlight: false },
];

const SOCIAL_PROOF = [
  { name: `@brayden.creates`, text: `went from 200 to 14k followers in 3 weeks after fixing what Go Viral flagged. no cap.` },
  { name: `@liftwithlaura`, text: `the hook agent roasted me so hard I completely rethought my content. 10/10 worth it.` },
  { name: `@techwithterry`, text: `this thing found issues my editor didn't even catch. brutal but accurate every time.` },
];

const FAQ = [
  {
    q: `What counts as a "roast"?`,
    a: `One roast = one uploaded video analyzed by all of the AI agents. The full breakdown is included on every subscription tier.`,
  },
  {
    q: `Can I cancel anytime?`,
    a: `Yes. Cancel in your account settings and you keep access through the end of your billing period. No games.`,
  },
  {
    q: `What file types do you support?`,
    a: `MP4, MOV, AVI - basically anything TikTok lets you upload. Max 500MB per video.`,
  },
  {
    q: `Is there a free trial for Pro?`,
    a: `Yes - there is still a 7-day trial before the subscription kicks in.`,
  },
  {
    q: `What's the difference between free and paid?`,
    a: `Free gets you a full roast with all 6 agents, a score, and actionable fixes. Paid plans unlock unlimited roasts, account-level analysis, priority processing, and export reports.`,
  },
  {
    q: `Will this actually help me grow?`,
    a: `We focus on the first 2-3 seconds - the hook - because that's what TikTok's algorithm tests first. Fix the hook, and the algorithm gives you more distribution. Creators who apply the reshoot plan typically see 5-40x improvement on their next video.`,
  },
  {
    q: `How is this different from other TikTok analytics tools?`,
    a: `Most tools show you what happened (views, likes, retention). We show you why it happened and what to change. Six specialized AI agents give you a specific diagnosis and a reshoot plan - not just charts.`,
  },
];

function PlanSignupPanel({ plan, label, buttonClass }: { plan: "monthly" | "yearly"; label: string; buttonClass: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setEmail(session.user.email);
    });
  }, []);

  useEffect(() => {
    if (open && status === "idle") inputRef.current?.focus();
  }, [open, status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, intent: "subscribe", plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong");
        setStatus("error");
      } else {
        setStatus("success");
      }
    } catch {
      setErrorMsg("Network error - please try again");
      setStatus("error");
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={buttonClass}
      >
        {label}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl border border-zinc-700 bg-zinc-950/80 p-4">
              {status === "success" ? (
                <p className="text-sm text-zinc-300 text-center py-1">
                  You&apos;re on the list - we&apos;ll activate your plan and email you when billing goes live.
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <p className="text-xs text-zinc-400">
                    Selected plan: <span className="text-white font-medium capitalize">{plan}</span>
                  </p>
                  <input
                    ref={inputRef}
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/60"
                  />
                  {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="w-full py-2.5 rounded-lg font-semibold text-sm fire-gradient text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {status === "loading" ? "Saving…" : "Lock in beta rate →"}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left flex justify-between items-center px-5 py-4 text-sm font-medium text-zinc-200 hover:text-white transition-colors"
      >
        {q}
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-zinc-500 text-lg leading-none ml-4 shrink-0"
        >
          +
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-sm text-zinc-400 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  const monthlyPrice = 9.99;
  const yearlyMonthly = 7.99;
  const yearlyTotal = 95.88;

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-16 md:py-24 relative overflow-x-hidden">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-orange-500/6 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-pink-500/4 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 mb-6">
          🔥 Every subscription unlocks the full roast
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-center fire-text mb-3">
          Pick your cadence. Get the full teardown either way.
        </h1>
        <p className="text-zinc-400 text-center max-w-lg mx-auto text-lg">
Every plan starts with the same analysis-first teardown: why the opener lost attention, what to rewrite, and what to reshoot next. The difference is how much usage and support you unlock.
        </p>
      </motion.div>

      {/* Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-3 mb-12"
      >
        <button
          onClick={() => setYearly(false)}
          className={`text-sm font-medium transition-colors ${!yearly ? "text-white" : "text-zinc-500"}`}
        >
          Monthly
        </button>

        <button
          onClick={() => setYearly((v) => !v)}
          className="relative w-14 h-8 rounded-full bg-zinc-800 border border-zinc-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
          aria-label="Toggle yearly billing"
        >
          <motion.div
            className="absolute top-1 left-1 w-6 h-6 rounded-full fire-gradient"
            animate={{ x: yearly ? 22 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </button>

        <button
          onClick={() => setYearly(true)}
          className={`text-sm font-medium transition-colors ${yearly ? "text-white" : "text-zinc-500"}`}
        >
          Yearly
        </button>

        <AnimatePresence>
          {yearly && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8, x: -4 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -4 }}
              className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30"
            >
              Save 20%
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-5xl mb-20">
        {/* Free */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-7 flex flex-col"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-zinc-300 mb-1">Free</h2>
            <p className="text-zinc-500 text-sm">Try a full roast, no card required</p>
          </div>

          <div className="mb-8">
            <span className="text-5xl font-bold text-white">$0</span>
            <span className="text-zinc-500 text-sm ml-2">forever</span>
          </div>

          <Link
            href="/dashboard"
            className="block text-center py-3 px-6 rounded-xl font-semibold border border-zinc-700 text-zinc-300 hover:border-orange-500/40 hover:text-white transition-all mb-8"
          >
            Get Started Free
          </Link>

          <div className="space-y-3 flex-1">
            <p className="text-xs text-zinc-600 uppercase tracking-wider font-medium mb-2">Included</p>
            {[
              { icon: '🎬', text: 'Full video upload + roast' },
              { icon: '📊', text: 'Score, verdict, and all 6 agents' },
              { icon: '🎣', text: 'Hook rewrites + reshoot plan' },
              { icon: '📎', text: 'Limited to 3 roasts' },
            ].map((f) => (
              <li key={f.text} className="flex items-start gap-2.5 text-sm text-zinc-400 list-none">
                <span className="mt-0.5 shrink-0">{f.icon}</span>
                {f.text}
              </li>
            ))}
          </div>
        </motion.div>

        {/* Monthly */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-7 flex flex-col"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-zinc-300 mb-1">Monthly</h2>
            <p className="text-zinc-500 text-sm">Unlimited analysis in beta once your plan is activated</p>
          </div>

          <div className="mb-8">
            <span className="text-5xl font-bold text-white">${monthlyPrice.toFixed(2)}</span>
            <span className="text-zinc-500 text-sm ml-2">/mo</span>
          </div>

          <div className="mb-8">
            <PlanSignupPanel
              plan="monthly"
              label="Choose Monthly Beta"
              buttonClass="block w-full text-center py-3 px-6 rounded-xl font-semibold border border-zinc-700 text-zinc-300 hover:border-orange-500/40 hover:text-white transition-all"
            />
          </div>

          <div className="space-y-3 flex-1">
            <p className="text-xs text-zinc-600 uppercase tracking-wider font-medium mb-2">Everything in Free, plus</p>
            {FREE_FEATURES.map((f) => (
              <li key={f.text} className="flex items-start gap-2.5 text-sm text-zinc-400 list-none">
                <span className="mt-0.5 shrink-0">{f.icon}</span>
                {f.text}
              </li>
            ))}
          </div>
        </motion.div>

        {/* Yearly */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="relative bg-zinc-900/60 border border-orange-500/30 rounded-2xl p-7 flex flex-col card-glow"
        >
          <div className="absolute -top-3 left-6 text-xs font-semibold px-3 py-1 rounded-full fire-gradient text-white shadow-lg">
            Best Value
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-1">Yearly</h2>
            <p className="text-zinc-500 text-sm">Save 20% once yearly beta billing is activated</p>
          </div>

          <div className="mb-1">
            <AnimatePresence mode="wait">
              <motion.span
                key={yearly ? "yearly" : "monthly"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="inline-block text-5xl font-bold text-white"
              >
                ${yearly ? yearlyMonthly.toFixed(2) : monthlyPrice.toFixed(2)}
              </motion.span>
            </AnimatePresence>
            <span className="text-zinc-500 text-sm ml-2">/mo</span>
          </div>

          <AnimatePresence>
            {yearly && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-zinc-500 mb-6"
              >
                ${yearlyTotal.toFixed(2)} billed annually
              </motion.p>
            )}
          </AnimatePresence>
          {!yearly && <div className="mb-6" />}

          <div className="mb-3">
            <PlanSignupPanel
              plan="yearly"
              label="Choose Yearly Beta →"
              buttonClass="block w-full text-center py-4 px-6 rounded-xl font-bold fire-gradient text-white hover:opacity-90 transition-opacity text-base shadow-lg shadow-orange-500/20"
            />
          </div>
          <p className="text-center text-xs text-zinc-500 mb-8">We&apos;ll email you when billing activates. You&apos;re locked in at the beta rate.</p>

          <div className="space-y-3 flex-1">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">Everything in Monthly, plus</p>
            {PRO_FEATURES.map((f) => (
              <li key={f.text} className={`flex items-start gap-2.5 text-sm list-none ${f.highlight ? 'text-zinc-200' : 'text-zinc-400'}`}>
                <span className="mt-0.5 shrink-0">{f.icon}</span>
                {f.text}
              </li>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-5xl mb-12 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-6"
      >
        <div className="grid gap-4 md:grid-cols-[1.2fr,2fr]">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">beta checkout path</p>
            <h3 className="text-2xl font-bold text-white">the signup and payment path is explicit, even before self-serve billing is live.</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['1', 'create account', 'sign in first so your roasts, history, and plan choice are tied to your account.'],
              ['2', 'choose a plan', 'free stays card-free. monthly or yearly marks the beta plan you want activated.'],
              ['3', 'activate billing in onboarding', 'during private beta, paid billing is finalized in onboarding instead of pretending there is a live checkout flow today.'],
            ].map(([step, title, desc]) => (
              <div key={step} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-orange-500/25 bg-orange-500/10 text-sm font-bold text-orange-400">{step}</div>
                <p className="mb-1 text-sm font-semibold text-white">{title}</p>
                <p className="text-sm leading-relaxed text-zinc-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Comparison callout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="w-full max-w-4xl mb-20 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6"
      >
        <h3 className="text-center text-sm font-semibold text-zinc-300 mb-6 uppercase tracking-wider">
          Compare plans at a glance
        </h3>
        <div className="grid grid-cols-4 gap-3 text-sm">
          <div className="text-zinc-500 font-medium"></div>
          <div className="text-center text-zinc-500 font-medium">Free</div>
          <div className="text-center text-zinc-400 font-medium">Monthly</div>
          <div className="text-center text-white font-semibold">Yearly</div>
          {[
            [`Full agent breakdowns`, `✓`, `✓`, `✓`],
            [`Hook rewrites`, `✓`, `✓`, `✓`],
            [`Reshoot plan`, `✓`, `✓`, `✓`],
            [`Roast limit`, `3 total`, `Unlimited`, `Unlimited`],
            [`Saved history`, `✓`, `✓`, `✓`],
            [`Account analysis`, `-`, `✓`, `✓`],
            [`Priority processing`, `-`, `✓`, `✓`],
            [`Export reports`, `-`, `-`, `✓`],
            [`Price`, `$0`, `$${monthlyPrice.toFixed(2)}/mo`, `$${yearlyMonthly.toFixed(2)}/mo`],
          ].map(([feature, free, monthly, yearly]) => (
            <div key={feature} className="contents">
              <div className="text-zinc-400 py-2 border-t border-zinc-800/50">{feature}</div>
              <div className="text-center text-zinc-600 py-2 border-t border-zinc-800/50">{free}</div>
              <div className="text-center text-zinc-500 py-2 border-t border-zinc-800/50">{monthly}</div>
              <div className="text-center py-2 border-t border-zinc-800/50 text-orange-400 font-medium">{yearly}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Social proof */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-3xl mb-20"
      >
        <h3 className="text-center text-2xl font-bold text-white mb-8">
          Creators who fixed their TikTok
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SOCIAL_PROOF.map((review) => (
            <div key={review.name} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
              <p className="text-sm text-zinc-300 leading-relaxed mb-4">{`"${review.text}"`}</p>
              <p className="text-xs text-zinc-500 font-medium">{review.name}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* FAQ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="w-full max-w-2xl mb-16"
      >
        <h3 className="text-center text-2xl font-bold text-white mb-8">Frequently asked</h3>
        <div className="space-y-2">
          {FAQ.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </motion.div>

      {/* Final CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center max-w-lg mx-auto"
      >
        <h3 className="text-2xl font-bold text-white mb-2">Ready to see what&apos;s actually killing your videos?</h3>
        <p className="text-zinc-500 text-sm mb-6">Start free with no card, or save a paid beta plan now and finish billing during onboarding.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-block py-4 px-10 rounded-xl font-bold fire-gradient text-white hover:opacity-90 transition-opacity text-base shadow-lg shadow-orange-500/20"
          >
            Try Free Roast →
          </Link>
          <Link
            href="/login"
            className="inline-block py-4 px-10 rounded-xl font-semibold border border-zinc-700 text-zinc-300 hover:border-orange-500/40 hover:text-white transition-all text-base"
          >
Choose Paid Beta
          </Link>
        </div>
        <p className="text-zinc-600 text-xs mt-4">Free stays card-free. Paid beta billing is activated after sign-in during onboarding.</p>
      </motion.div>
    </main>
  );
}
