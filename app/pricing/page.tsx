"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const FREE_FEATURES = [
  { text: `1 video roast per day`, icon: `🎬` },
  { text: `Overall score & letter grade`, icon: `📊` },
  { text: `Quick summary verdict`, icon: `💬` },
  { text: `Basic roast from all 6 agents`, icon: `🤖` },
];

const PRO_FEATURES = [
  { text: `Unlimited video roasts`, icon: `♾️`, highlight: true },
  { text: `Full agent breakdowns & deep analysis`, icon: `🔍`, highlight: true },
  { text: `"Fix This" improvement prompts`, icon: `💡`, highlight: true },
  { text: `Roast history & saved results`, icon: `📁`, highlight: false },
  { text: `Full account-level analysis`, icon: `📈`, highlight: false },
  { text: `Priority processing`, icon: `⚡`, highlight: false },
  { text: `Export reports as PDF`, icon: `📄`, highlight: false },
];

const SOCIAL_PROOF = [
  { name: `@brayden.creates`, text: `went from 200 to 14k followers in 3 weeks after fixing what RoastMyTikTok flagged. no cap.` },
  { name: `@liftwithlaura`, text: `the hook agent roasted me so hard I completely rethought my content. 10/10 worth it.` },
  { name: `@techwithterry`, text: `this thing found issues my editor didn't even catch. brutal but accurate every time.` },
];

const FAQ = [
  {
    q: `What counts as a "roast"?`,
    a: `One roast = one video analyzed by all 6 AI agents. Free users get 1 per day. Pro is unlimited.`,
  },
  {
    q: `Can I cancel anytime?`,
    a: `Yes. Cancel in your account settings and you keep Pro access until the billing period ends. No games.`,
  },
  {
    q: `What file types do you support?`,
    a: `MP4, MOV, AVI — basically anything TikTok lets you upload. Max 500MB per video.`,
  },
  {
    q: `Is there a free trial for Pro?`,
    a: `Yes — 7 days free when you sign up. No credit card required to start.`,
  },
];

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
          🔥 7-day free trial · No credit card required
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-center fire-text mb-3">
          Stop guessing. Start growing.
        </h1>
        <p className="text-zinc-400 text-center max-w-lg mx-auto text-lg">
          {`Get a brutally honest AI breakdown of exactly what's killing your TikTok reach — then fix it.`}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-20">
        {/* Free */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 flex flex-col"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-zinc-300 mb-1">Free</h2>
            <p className="text-zinc-500 text-sm">Test the roast before you commit</p>
          </div>

          <div className="mb-8">
            <span className="text-5xl font-bold text-white">$0</span>
            <span className="text-zinc-500 text-sm ml-2">forever</span>
          </div>

          <Link
            href="/login"
            className="block text-center py-3 px-6 rounded-xl font-semibold border border-zinc-700 text-zinc-300 hover:border-orange-500/40 hover:text-white transition-all mb-8"
          >
            Get Started Free
          </Link>

          <div className="space-y-3 flex-1">
            <p className="text-xs text-zinc-600 uppercase tracking-wider font-medium mb-2">What you get</p>
            {FREE_FEATURES.map((f) => (
              <li key={f.text} className="flex items-start gap-2.5 text-sm text-zinc-400 list-none">
                <span className="mt-0.5 shrink-0">{f.icon}</span>
                {f.text}
              </li>
            ))}
          </div>
        </motion.div>

        {/* Pro */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative bg-zinc-900/60 border border-orange-500/30 rounded-2xl p-8 flex flex-col card-glow"
        >
          <div className="absolute -top-3 left-6 text-xs font-semibold px-3 py-1 rounded-full fire-gradient text-white shadow-lg">
            Most Popular
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-1">Pro</h2>
            <p className="text-zinc-500 text-sm">The full, unfiltered breakdown</p>
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

          <Link
            href="/login"
            className="block text-center py-4 px-6 rounded-xl font-bold fire-gradient text-white hover:opacity-90 transition-opacity mb-3 text-base shadow-lg shadow-orange-500/20"
          >
            Start 7-Day Free Trial →
          </Link>
          <p className="text-center text-xs text-zinc-500 mb-8">No credit card required</p>

          <div className="space-y-3 flex-1">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">Everything in Free, plus</p>
            {PRO_FEATURES.map((f) => (
              <li key={f.text} className={`flex items-start gap-2.5 text-sm list-none ${f.highlight ? 'text-zinc-200' : 'text-zinc-400'}`}>
                <span className="mt-0.5 shrink-0">{f.icon}</span>
                {f.text}
              </li>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Comparison callout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="w-full max-w-3xl mb-20 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6"
      >
        <h3 className="text-center text-sm font-semibold text-zinc-300 mb-6 uppercase tracking-wider">
          Free vs Pro at a glance
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-zinc-500 font-medium"></div>
          <div className="text-center text-zinc-400 font-medium">Free</div>
          <div className="text-center text-white font-semibold">Pro</div>
          {[
            [`Daily roasts`, `1`, `Unlimited`],
            [`Agent feedback`, `Score only`, `Full breakdown`],
            [`Improvement tips`, `—`, `✓`],
            [`History & saved roasts`, `—`, `✓`],
            [`Processing speed`, `Standard`, `Priority ⚡`],
          ].map(([feature, free, pro]) => (
            <>
              <div key={`${feature}-label`} className="text-zinc-400 py-2 border-t border-zinc-800/50">{feature}</div>
              <div key={`${feature}-free`} className="text-center text-zinc-500 py-2 border-t border-zinc-800/50">{free}</div>
              <div key={`${feature}-pro`} className={`text-center py-2 border-t border-zinc-800/50 ${pro === `—` ? 'text-zinc-600' : 'text-orange-400 font-medium'}`}>{pro}</div>
            </>
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
        className="text-center"
      >
        <p className="text-zinc-500 text-sm mb-3">All plans include 6 AI roast agents. Cancel anytime.</p>
        <Link
          href="/login"
          className="inline-block py-4 px-10 rounded-xl font-bold fire-gradient text-white hover:opacity-90 transition-opacity text-base shadow-lg shadow-orange-500/20"
        >
          Start Free Today →
        </Link>
      </motion.div>
    </main>
  );
}
