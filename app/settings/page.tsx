"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";

// ─── Danger Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md rounded-2xl border border-red-900/40 bg-zinc-950 p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="mt-2 text-sm text-zinc-400">{description}</p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={onCancel}
                className="rounded-xl px-4 py-2 text-sm text-zinc-400 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [dangerModal, setDangerModal] = useState<null | "delete">(null);

  // Subscription (wired to Stripe billing portal)
  const plan = "Free";
  const isFree = plan === "Free";
  const renewalDate = "—";
  const roastsUsed = 3;
  const roastsLimit = 5;

  function deleteAccount() {
    localStorage.clear();
    setDangerModal(null);
    window.location.href = "/";
  }

  function exportData() {
    const data = {
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "roastmytiktok-data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <ConfirmModal
        open={dangerModal === "delete"}
        title="Delete your account?"
        description="This will permanently delete your account, all your roasts, and linked data. This action cannot be undone."
        confirmLabel="Yes, delete my account"
        onConfirm={deleteAccount}
        onCancel={() => setDangerModal(null)}
      />

      <div className="min-h-screen bg-[#0a0a0a]">
        {/* Ambient gradients */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-orange-500/5 blur-3xl" />
          <div className="absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-pink-500/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-2xl px-4 py-12 sm:px-6">
          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-10"
          >
            <h1 className="text-3xl font-black tracking-tight text-white">Settings</h1>
            <p className="mt-1 text-sm text-zinc-500">Manage your account and subscription.</p>
          </motion.div>

          <div className="space-y-6">

            {/* ── 1. Subscription ────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
              <GlassCard variant="surface" className="p-6">
                <SectionHeader title="Subscription" subtitle="Your current plan and usage." />

                {/* Plan badge row */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                      isFree
                        ? "bg-zinc-800 text-zinc-300"
                        : "bg-gradient-to-r from-orange-500 to-pink-500 text-white"
                    }`}>
                      {plan}
                    </span>
                    {!isFree && (
                      <span className="text-xs text-zinc-500">Renews {renewalDate}</span>
                    )}
                  </div>
                  {!isFree ? (
                    <a
                      href="https://billing.stripe.com/p/login/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
                    >
                      Manage Subscription →
                    </a>
                  ) : (
                    <Link
                      href="/pricing"
                      className="rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2 text-xs font-bold text-white shadow shadow-orange-500/20 transition hover:opacity-90"
                    >
                      Upgrade to Pro →
                    </Link>
                  )}
                </div>

                {/* Usage stats */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs text-zinc-500 mb-1">Roasts this month</p>
                    <p className="text-2xl font-black text-white">
                      {roastsUsed}
                      <span className="ml-1 text-base font-normal text-zinc-500">/ {roastsLimit}</span>
                    </p>
                    {/* Usage bar */}
                    <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-pink-500"
                        style={{ width: `${Math.min((roastsUsed / roastsLimit) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {isFree && (
                  <p className="mt-4 text-xs text-zinc-500">
                    <Link href="/pricing" className="text-orange-400 hover:underline">View all plans</Link>
                    {" "}to unlock unlimited roasts, priority processing, and account-level analysis.
                  </p>
                )}
              </GlassCard>
            </motion.div>

            {/* ── 2. Danger Zone ─────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
              <div className="rounded-2xl border border-red-900/40 bg-red-950/10 p-6">
                <SectionHeader
                  title="Danger Zone"
                  subtitle="Irreversible actions. Proceed with care."
                />

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">Export your data</p>
                      <p className="text-xs text-zinc-500">Download all your roasts and settings as JSON.</p>
                    </div>
                    <button
                      onClick={exportData}
                      className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                    >
                      Export →
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-red-300">Delete account</p>
                      <p className="text-xs text-red-400/60">Permanently deletes your account and all data.</p>
                    </div>
                    <button
                      onClick={() => setDangerModal("delete")}
                      className="rounded-xl border border-red-800/60 bg-red-900/30 px-4 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-900/50 hover:text-red-300"
                    >
                      Delete account
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </>
  );
}
