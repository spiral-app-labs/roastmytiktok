"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

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
  { name: `@brayden.creates`, text: `went from 200 to 14k followers in 3 weeks after fixing what RoastMyTikTok flagged. no cap.` },
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
    a: `MP4, MOV, AVI — basically anything TikTok lets you upload. Max 500MB per video.`,
  },
  {
    q: `Is there a free trial for Pro?`,
    a: `Yes — there is still a 7-day trial before the subscription kicks in.`,
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
          🔥 Every subscription unlocks the full roast
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-center fire-text mb-3">
          Pick your cadence. Get the full teardown either way.
        </h1>
        <p className="text-zinc-400 text-center max-w-lg mx-auto text-lg">
          {`Every paid plan includes video uploads, full analysis, ratings, roasts, and fixes. The real differences are billing, future limits, and extra workflow features.`}
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
        {/* Monthly */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 flex flex-col"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-zinc-300 mb-1">Monthly</h2>
            <p className="text-zinc-500 text-sm">Full access with the most flexibility</p>
          </div>

          <div className="mb-8">
            <span className="text-5xl font-bold text-white">${monthlyPrice.toFixed(2)}</span>
            <span className="text-zinc-500 text-sm ml-2">/mo</span>
          </div>

          <Link
            href="/login"
            className="block text-center py-3 px-6 rounded-xl font-semibold border border-zinc-700 text-zinc-300 hover:border-orange-500/40 hover:text-white transition-all mb-8"
          >
            Start Monthly
          </Link>

          <div className="space-y-3 flex-1">
            <p className="text-xs text-zinc-600 uppercase tracking-wider font-medium mb-2">Included</p>
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
          transition={{ delay: 0.2 }}
          className="relative bg-zinc-900/60 border border-orange-500/30 rounded-2xl p-8 flex flex-col card-glow"
        >
          <div className="absolute -top-3 left-6 text-xs font-semibold px-3 py-1 rounded-full fire-gradient text-white shadow-lg">
            Best Value
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-1">Yearly</h2>
            <p className="text-zinc-500 text-sm">Same full access, lower effective monthly cost</p>
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
            Start Yearly →
          </Link>
          <p className="text-center text-xs text-zinc-500 mb-8">Includes full roast access from day one</p>

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

      {/* Comparison callout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="w-full max-w-3xl mb-20 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6"
      >
        <h3 className="text-center text-sm font-semibold text-zinc-300 mb-6 uppercase tracking-wider">
          Monthly vs Yearly at a glance
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-zinc-500 font-medium"></div>
          <div className="text-center text-zinc-400 font-medium">Monthly</div>
          <div className="text-center text-white font-semibold">Yearly</div>
          {[
            [`Full video uploads`, `✓`, `✓`],
            [`Full agent breakdowns`, `✓`, `✓`],
            [`Saved history`, `✓`, `✓`],
            [`Billing`, `Month-to-month`, `Annual`],
            [`Effective monthly price`, `$${monthlyPrice.toFixed(2)}`, `$${yearlyMonthly.toFixed(2)}`],
          ].map(([feature, free, pro]) => (
            <div key={feature} className="contents">
              <div className="text-zinc-400 py-2 border-t border-zinc-800/50">{feature}</div>
              <div className="text-center text-zinc-500 py-2 border-t border-zinc-800/50">{free}</div>
              <div className="text-center py-2 border-t border-zinc-800/50 text-orange-400 font-medium">{pro}</div>
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
        className="text-center"
      >
        <p className="text-zinc-500 text-sm mb-3">Every subscription includes ratings, roasts, fixes, and uploads. Cancel anytime.</p>
        <Link
          href="/login"
          className="inline-block py-4 px-10 rounded-xl font-bold fire-gradient text-white hover:opacity-90 transition-opacity text-base shadow-lg shadow-orange-500/20"
        >
          Start Your Subscription →
        </Link>
      </motion.div>
    </main>
  );
}
