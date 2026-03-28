'use client';

import { motion } from 'framer-motion';

interface SettingsViewProps {
  userEmail: string | null;
  onSignOut: () => void;
}

export default function SettingsView({ userEmail, onSignOut }: SettingsViewProps) {
  const clearHistory = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rmt_history');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-xl font-bold text-white mb-6">Settings</h2>

      <div className="space-y-4">
        {/* Account */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-3">Account</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-300">Email</p>
                <p className="text-xs text-zinc-500 mt-0.5">{userEmail || 'Not signed in'}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-800/40">
              <button
                onClick={onSignOut}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </motion.div>

        {/* Data */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-3">Data</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-300">Analysis History</p>
                <p className="text-xs text-zinc-500 mt-0.5">Stored locally in your browser</p>
              </div>
              <button
                onClick={clearHistory}
                className="text-xs text-zinc-500 hover:text-red-400 border border-zinc-700/50 hover:border-red-500/30 px-3 py-1.5 rounded-lg transition-all"
              >
                Clear history
              </button>
            </div>
          </div>
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-3">About</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-300">RoastMyTikTok</p>
              <span className="text-xs text-zinc-600">v2.0</span>
            </div>
            <p className="text-xs text-zinc-500">
              6 AI agents analyze your TikTok videos and give you brutally honest feedback to help you create better content.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
