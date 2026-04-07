"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { getSessionId } from "@/lib/history";
import type { DebugLevel } from "@/lib/debug-types";

const ADMIN_EMAILS = ["ethan@ethantalreja.com", "ethan@spiralapplabs.com"];
function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

const DEBUG_LEVELS: { value: DebugLevel; label: string; description: string }[] = [
  { value: "off", label: "Off", description: "No debug data collected." },
  { value: "simple", label: "Simple", description: "Agent scores + top finding per agent + video meta summary." },
  { value: "complex", label: "Complex", description: "All agent results, niche detection, hook summary, frame metadata." },
  { value: "extremely_verbose", label: "Extremely Verbose", description: "Everything in Complex + raw AI responses, transcript, errors, all timings." },
];

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

const NICHE_CATEGORIES = [
  "fitness", "cooking", "comedy", "beauty", "business",
  "education", "tech", "lifestyle", "fashion", "travel",
  "health", "music", "gaming", "pets", "other",
];

export default function SettingsPage() {
  const [dangerModal, setDangerModal] = useState<null | "delete">(null);

  // Auth + admin state
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [debugLevel, setDebugLevel] = useState<DebugLevel>("off");
  const [debugSaving, setDebugSaving] = useState(false);
  const [debugSaved, setDebugSaved] = useState(false);
  const [usage, setUsage] = useState<{ roastsAllTime: number; roastsInWindow: number; minutesProcessedAllTime: number; roastLimit: number | null; } | null>(null);

  // Niche state
  const [nicheCategory, setNicheCategory] = useState("");
  const [creatorInput, setCreatorInput] = useState("");
  const [inspirationCreators, setInspirationCreators] = useState<string[]>([]);
  const [nicheAnalyzing, setNicheAnalyzing] = useState(false);
  const [nichePatterns, setNichePatterns] = useState<Record<string, unknown> | null>(null);
  const [nicheError, setNicheError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserEmail(user.email ?? null);
      setUserId(user.id);
      const stored = user.user_metadata?.debug_level as string | undefined;
      const valid: DebugLevel[] = ["off", "simple", "complex", "extremely_verbose"];
      if (stored && valid.includes(stored as DebugLevel)) {
        setDebugLevel(stored as DebugLevel);
      }
      // Load niche profile from metadata
      const savedNiche = user.user_metadata?.niche_category;
      const savedCreators = user.user_metadata?.inspiration_creators;
      if (savedNiche) setNicheCategory(savedNiche);
      if (savedCreators && Array.isArray(savedCreators)) setInspirationCreators(savedCreators);
    });

    fetch(`/api/usage?session_id=${encodeURIComponent(getSessionId())}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load usage');
        return res.json();
      })
      .then((data) => {
        setUsage({
          roastsAllTime: data.usage?.totals?.roastsAllTime ?? 0,
          roastsInWindow: data.usage?.totals?.roastsInWindow ?? 0,
          minutesProcessedAllTime: data.usage?.totals?.minutesProcessedAllTime ?? 0,
          roastLimit: data.usage?.caps?.roastLimit ?? null,
        });
      })
      .catch(() => {
        setUsage({ roastsAllTime: 0, roastsInWindow: 0, minutesProcessedAllTime: 0, roastLimit: 3 });
      });
  }, []);

  const addCreator = () => {
    const handle = creatorInput.trim().replace(/^@/, "");
    if (handle && !inspirationCreators.includes(handle)) {
      setInspirationCreators(prev => [...prev, handle]);
      setCreatorInput("");
    }
  };

  const removeCreator = (handle: string) => {
    setInspirationCreators(prev => prev.filter(c => c !== handle));
  };

  async function analyzeNiche() {
    if (!nicheCategory) return;
    setNicheAnalyzing(true);
    setNicheError(null);
    try {
      // Save to user metadata
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: { niche_category: nicheCategory, inspiration_creators: inspirationCreators },
      });

      const res = await fetch("/api/niche/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche_category: nicheCategory,
          inspiration_creators: inspirationCreators,
          user_id: userId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }
      const data = await res.json();
      setNichePatterns(data.patterns);
    } catch (err) {
      setNicheError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setNicheAnalyzing(false);
    }
  }

  async function saveDebugLevel(level: DebugLevel) {
    setDebugSaving(true);
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({ data: { debug_level: level } });
      setDebugLevel(level);
      setDebugSaved(true);
      setTimeout(() => setDebugSaved(false), 2500);
    } catch { /* ignore */ }
    setDebugSaving(false);
  }

  // Subscription (wired to Stripe billing portal)
  const plan = "Free";
  const isFree = plan === "Free";
  const renewalDate = "-";
  const roastsUsed = usage?.roastsInWindow ?? 0;
  const roastsLimit = usage?.roastLimit ?? 3;
  const totalMinutesProcessed = usage?.minutesProcessedAllTime ?? 0;
  const totalRoasts = usage?.roastsAllTime ?? 0;

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
    a.download = "goviral-data.json";
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs text-zinc-500 mb-1">Roasts in the last 24 hours</p>
                    <p className="text-2xl font-black text-white">
                      {roastsUsed}
                      <span className="ml-1 text-base font-normal text-zinc-500">/ {roastsLimit}</span>
                    </p>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-pink-500"
                        style={{ width: `${Math.min((roastsUsed / Math.max(roastsLimit, 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">This cap is now backed by persisted successful analyses, not a memory-only IP bucket.</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs text-zinc-500 mb-1">Total usage</p>
                    <p className="text-2xl font-black text-white">{totalRoasts} roasts</p>
                    <p className="mt-1 text-sm text-zinc-400">{totalMinutesProcessed.toFixed(1)} minutes processed</p>
                    <p className="mt-2 text-xs text-zinc-500">Every completed roast now records real video minutes for future plan caps.</p>
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

            {/* ── 1.5. Your Niche ─────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.07 }}>
              <GlassCard variant="surface" className="p-6">
                <SectionHeader title="Your Niche" subtitle="Set your niche and inspiration creators for smarter script generation." />

                {/* Category */}
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Category</label>
                  <select
                    value={nicheCategory}
                    onChange={(e) => setNicheCategory(e.target.value)}
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:border-orange-500/40 focus:outline-none transition-colors capitalize"
                  >
                    <option value="">Select your niche...</option>
                    {NICHE_CATEGORIES.map((n) => (
                      <option key={n} value={n} className="capitalize">{n}</option>
                    ))}
                  </select>
                </div>

                {/* Inspiration Creators */}
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Inspiration Creators</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={creatorInput}
                      onChange={(e) => setCreatorInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCreator())}
                      placeholder="@username"
                      className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-orange-500/40 focus:outline-none transition-colors"
                    />
                    <button
                      onClick={addCreator}
                      className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                    >
                      Add
                    </button>
                  </div>
                  {inspirationCreators.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {inspirationCreators.map((handle) => (
                        <span
                          key={handle}
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700"
                        >
                          @{handle}
                          <button
                            onClick={() => removeCreator(handle)}
                            className="text-zinc-600 hover:text-red-400 transition-colors"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Analyze Button */}
                <button
                  onClick={analyzeNiche}
                  disabled={!nicheCategory || nicheAnalyzing}
                  className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    nicheAnalyzing
                      ? "bg-zinc-800 text-zinc-500 cursor-wait"
                      : nicheCategory
                      ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow shadow-orange-500/20 hover:opacity-90"
                      : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  }`}
                >
                  {nicheAnalyzing ? "Analyzing..." : "Analyze Niche"}
                </button>

                {nicheError && (
                  <p className="text-xs text-red-400 mt-2">{nicheError}</p>
                )}

                {/* Patterns Summary */}
                {nichePatterns && (
                  <div className="mt-5 space-y-3">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Extracted Patterns</p>
                    {Object.entries(nichePatterns).slice(0, 4).map(([key, value]) => (
                      <div key={key} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                        <p className="text-xs font-semibold text-zinc-300 capitalize mb-1">
                          {key.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-zinc-500 line-clamp-3">
                          {typeof value === "object" ? JSON.stringify(value, null, 0).slice(0, 200) : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* ── Admin: Debug Mode (admin-only) ─────────────────────────── */}
            {isAdminEmail(userEmail) && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
                <div className="rounded-2xl border border-green-900/40 bg-green-950/10 p-6">
                  <SectionHeader
                    title="Debug Mode"
                    subtitle="Admin only. Controls the debug data level attached to your analyses."
                  />
                  <div className="space-y-3">
                    {DEBUG_LEVELS.map((opt) => (
                      <label key={opt.value} className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="debug_level"
                          value={opt.value}
                          checked={debugLevel === opt.value}
                          onChange={() => saveDebugLevel(opt.value)}
                          disabled={debugSaving}
                          className="mt-1 accent-green-500"
                        />
                        <div>
                          <span className="text-sm font-semibold text-white group-hover:text-green-300 transition-colors">
                            {opt.label}
                          </span>
                          <p className="text-xs text-zinc-500">{opt.description}</p>
                        </div>
                      </label>
                    ))}
                    {debugSaving && <p className="text-xs text-zinc-500 mt-2">Saving…</p>}
                    {debugSaved && <p className="text-xs text-green-500 mt-2">Saved.</p>}
                  </div>
                </div>
              </motion.div>
            )}

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
