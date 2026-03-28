"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const FREE_FEATURES = [
  "1 video roast per day",
  "Overall score & letter grade",
  "Quick summary verdict",
  "Basic roast from all 6 agents",
];

const PRO_FEATURES = [
  "Unlimited video roasts",
  "Full agent breakdowns & deep analysis",
  '"Fix This" improvement prompts',
  "Roast history & saved results",
  "Full account analysis",
  "Priority processing",
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  const monthlyPrice = 9.99;
  const yearlyMonthly = 7.99;
  const yearlyTotal = 95.88;

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-16 md:py-24">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-500/8 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-center fire-text mb-3"
      >
        Simple pricing
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="text-zinc-400 text-center max-w-md mb-10"
      >
        Get roasted for free, or go Pro for the full brutally-honest breakdown.
      </motion.p>

      {/* Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-3 mb-12"
      >
        <button
          onClick={() => setYearly(false)}
          className={`text-sm font-medium transition-colors ${
            !yearly ? "text-white" : "text-zinc-500"
          }`}
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
          className={`text-sm font-medium transition-colors ${
            yearly ? "text-white" : "text-zinc-500"
          }`}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {/* Free */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 flex flex-col"
        >
          <h2 className="text-lg font-semibold text-zinc-300 mb-1">Free</h2>
          <p className="text-zinc-500 text-sm mb-6">Dip your toes in</p>

          <div className="mb-8">
            <span className="text-4xl font-bold text-white">$0</span>
            <span className="text-zinc-500 text-sm ml-1">/mo</span>
          </div>

          <Link
            href="/login"
            className="block text-center py-3 px-6 rounded-xl font-semibold border border-zinc-700 text-zinc-300 hover:border-orange-500/40 hover:text-white transition-all mb-8"
          >
            Get Started
          </Link>

          <ul className="space-y-3 flex-1">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-400">
                <span className="text-zinc-600 mt-0.5">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Pro */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative bg-zinc-900/60 border border-orange-500/30 rounded-2xl p-8 flex flex-col card-glow"
        >
          <div className="absolute -top-3 left-6 text-xs font-semibold px-3 py-1 rounded-full fire-gradient text-white">
            Most Popular
          </div>

          <h2 className="text-lg font-semibold text-white mb-1">Pro</h2>
          <p className="text-zinc-500 text-sm mb-6">Full roast experience</p>

          <div className="mb-1">
            <AnimatePresence mode="wait">
              <motion.span
                key={yearly ? "yearly" : "monthly"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="inline-block text-4xl font-bold text-white"
              >
                ${yearly ? yearlyMonthly.toFixed(2) : monthlyPrice.toFixed(2)}
              </motion.span>
            </AnimatePresence>
            <span className="text-zinc-500 text-sm ml-1">/mo</span>
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
            className="block text-center py-3 px-6 rounded-xl font-semibold fire-gradient text-white hover:opacity-90 transition-opacity mb-8"
          >
            Start Free Trial
          </Link>

          <ul className="space-y-3 flex-1">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                <span className="text-orange-400 mt-0.5">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Footer note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-zinc-600 text-xs text-center mt-12"
      >
        All plans include access to 6 AI roast agents. Cancel anytime.
      </motion.p>
    </main>
  );
}
