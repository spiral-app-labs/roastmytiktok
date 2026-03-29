"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TikTokHandle {
  id: string;
  handle: string;
  status: "active" | "syncing" | "error";
  lastSync: string;
  videoCount: number;
}

interface Preferences {
  emailOnAnalysis: boolean;
  trendAlerts: boolean;
  analysisMode: "recent" | "viral";
  darkMode: boolean;
}

interface ProfileData {
  displayName: string;
  email: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
          checked ? "bg-gradient-to-r from-orange-500 to-pink-500" : "bg-zinc-700"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

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

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TikTokHandle["status"] }) {
  const map = {
    active: { dot: "bg-green-400", text: "Active" },
    syncing: { dot: "bg-yellow-400 animate-pulse", text: "Syncing" },
    error: { dot: "bg-red-400", text: "Error" },
  };
  const { dot, text } = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/60 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {text}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  // Profile
  const [profile, setProfile] = useState<ProfileData>({ displayName: "", email: "" });
  const [profileDraft, setProfileDraft] = useState<ProfileData>({ displayName: "", email: "" });
  const [profileSaved, setProfileSaved] = useState(false);

  // Subscription (mock data)
  const plan = "Free";
  const isFree = plan === "Free";
  const renewalDate = "—";
  const roastsUsed = 3;
  const roastsLimit = 5;
  const accountsLinked = 0;

  // Linked accounts
  const [handles, setHandles] = useState<TikTokHandle[]>([]);
  const [newHandle, setNewHandle] = useState("");
  const [addError, setAddError] = useState("");

  // Preferences
  const [prefs, setPrefs] = useState<Preferences>({
    emailOnAnalysis: true,
    trendAlerts: false,
    analysisMode: "recent",
    darkMode: true,
  });

  // Danger zone modals
  const [dangerModal, setDangerModal] = useState<null | "delete" | "disconnect">(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const p = localStorage.getItem("rmt_profile");
      const h = localStorage.getItem("rmt_handles");
      const pr = localStorage.getItem("rmt_prefs");
      if (p) { const parsed = JSON.parse(p); setProfile(parsed); setProfileDraft(parsed); }
      if (h) setHandles(JSON.parse(h));
      if (pr) setPrefs((prev) => ({ ...prev, ...JSON.parse(pr) }));
    } catch {}
  }, []);

  // Save profile
  function saveProfile() {
    setProfile(profileDraft);
    localStorage.setItem("rmt_profile", JSON.stringify(profileDraft));
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }

  // Save prefs
  function savePref<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem("rmt_prefs", JSON.stringify(next));
  }

  // Add handle
  function addHandle() {
    const trimmed = newHandle.trim().replace(/^@/, "");
    if (!trimmed) { setAddError("Enter a TikTok handle."); return; }
    if (handles.find((h) => h.handle === trimmed)) { setAddError("Handle already linked."); return; }
    const entry: TikTokHandle = {
      id: crypto.randomUUID(),
      handle: trimmed,
      status: "syncing",
      lastSync: new Date().toLocaleString(),
      videoCount: 0,
    };
    const next = [...handles, entry];
    setHandles(next);
    localStorage.setItem("rmt_handles", JSON.stringify(next));
    setNewHandle("");
    setAddError("");
    // Simulate sync resolving
    setTimeout(() => {
      setHandles((prev) => {
        const updated = prev.map((h) =>
          h.id === entry.id ? { ...h, status: "active" as const, videoCount: Math.floor(Math.random() * 80) + 5 } : h
        );
        localStorage.setItem("rmt_handles", JSON.stringify(updated));
        return updated;
      });
    }, 2500);
  }

  function removeHandle(id: string) {
    const next = handles.filter((h) => h.id !== id);
    setHandles(next);
    localStorage.setItem("rmt_handles", JSON.stringify(next));
  }

  function disconnectAll() {
    setHandles([]);
    localStorage.removeItem("rmt_handles");
    setDangerModal(null);
  }

  function deleteAccount() {
    localStorage.clear();
    setDangerModal(null);
    window.location.href = "/";
  }

  function exportData() {
    const data = {
      profile,
      handles,
      preferences: prefs,
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

  const initials = getInitials(profile.displayName || "User");

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
      <ConfirmModal
        open={dangerModal === "disconnect"}
        title="Disconnect all accounts?"
        description="All linked TikTok handles will be removed. You can re-add them later."
        confirmLabel="Disconnect all"
        onConfirm={disconnectAll}
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
            <p className="mt-1 text-sm text-zinc-500">Manage your account, subscription, and preferences.</p>
          </motion.div>

          <div className="space-y-6">

            {/* ── 1. Profile ─────────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
              <GlassCard variant="surface" className="p-6">
                <SectionHeader title="Profile" subtitle="Your public display info." />
                <div className="flex items-start gap-5">
                  {/* Avatar */}
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 text-xl font-black text-white shadow-lg shadow-orange-500/20">
                    {initials}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={profileDraft.displayName}
                        onChange={(e) => setProfileDraft((p) => ({ ...p, displayName: e.target.value }))}
                        placeholder="Your name"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 transition"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profileDraft.email}
                        onChange={(e) => setProfileDraft((p) => ({ ...p, email: e.target.value }))}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 transition"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <GradientButton variant="primary" size="sm" onClick={saveProfile}>
                        Save changes
                      </GradientButton>
                      <AnimatePresence>
                        {profileSaved && (
                          <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-xs text-green-400"
                          >
                            ✓ Saved
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* ── 2. Subscription ────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
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
                <div className="grid grid-cols-2 gap-3">
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
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs text-zinc-500 mb-1">Accounts linked</p>
                    <p className="text-2xl font-black text-white">{handles.length}</p>
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

            {/* ── 3. Linked Accounts ─────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}>
              <GlassCard variant="surface" className="p-6">
                <SectionHeader title="Linked Accounts" subtitle="TikTok handles you want to analyze." />

                {/* Add handle */}
                <div className="mb-5 flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span>
                    <input
                      type="text"
                      value={newHandle}
                      onChange={(e) => { setNewHandle(e.target.value); setAddError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && addHandle()}
                      placeholder="yourtiktokhandle"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-7 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 transition"
                    />
                  </div>
                  <GradientButton variant="primary" size="sm" onClick={addHandle}>
                    Add
                  </GradientButton>
                </div>
                {addError && <p className="mb-3 text-xs text-red-400">{addError}</p>}

                {/* Handle list */}
                {handles.length === 0 ? (
                  <p className="text-sm text-zinc-600 text-center py-4">No handles linked yet.</p>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {handles.map((h) => (
                        <motion.div
                          key={h.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 16 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/20 to-pink-500/20 text-sm">
                              📱
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">@{h.handle}</p>
                              <p className="text-xs text-zinc-600">
                                {h.videoCount > 0 ? `${h.videoCount} videos · ` : ""}
                                Synced {h.lastSync}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={h.status} />
                            <button
                              onClick={() => removeHandle(h.id)}
                              className="rounded-lg p-1.5 text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400"
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* ── 4. Preferences ─────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }}>
              <GlassCard variant="surface" className="p-6">
                <SectionHeader title="Preferences" />

                <div className="divide-y divide-zinc-800/60">
                  <Toggle
                    checked={prefs.emailOnAnalysis}
                    onChange={(v) => savePref("emailOnAnalysis", v)}
                    label="Email on new analysis"
                    description="Get notified when your roast is ready."
                  />
                  <Toggle
                    checked={prefs.trendAlerts}
                    onChange={(v) => savePref("trendAlerts", v)}
                    label="Trend alerts"
                    description="Weekly digest of trending audio and formats."
                  />
                  <div className="py-3">
                    <p className="mb-2 text-sm font-medium text-zinc-200">Default analysis mode</p>
                    <div className="flex gap-2">
                      {(["recent", "viral"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => savePref("analysisMode", mode)}
                          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                            prefs.analysisMode === mode
                              ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow shadow-orange-500/20"
                              : "border border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {mode === "recent" ? "Most Recent" : "Most Viral"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Toggle
                    checked={prefs.darkMode}
                    onChange={(v) => savePref("darkMode", v)}
                    label="Dark mode"
                    description="Always on for now — light mode coming soon."
                  />
                </div>
              </GlassCard>
            </motion.div>

            {/* ── 5. Danger Zone ─────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.25 }}>
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

                  <div className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">Disconnect all accounts</p>
                      <p className="text-xs text-zinc-500">Remove all linked TikTok handles.</p>
                    </div>
                    <button
                      onClick={() => setDangerModal("disconnect")}
                      className="rounded-xl border border-orange-900/50 bg-orange-900/20 px-4 py-2 text-xs font-semibold text-orange-400 transition hover:bg-orange-900/30"
                    >
                      Disconnect
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-red-300">Delete account</p>
                      <p className="text-xs text-red-900/80 text-red-400/60">Permanently deletes your account and all data.</p>
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
