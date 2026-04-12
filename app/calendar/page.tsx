'use client';

import { motion } from 'framer-motion';
import ContentCalendar from '@/components/ContentCalendar';
import Link from 'next/link';

export default function CalendarPage() {
  return (
    <main className="min-h-screen px-4 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-orange-500/10 via-pink-500/5 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            <span className="fire-text">Content Calendar</span>
          </h1>
          <p className="text-zinc-400 max-w-lg mx-auto">
            Optimal posting times for your niche. Research-backed schedules to maximize reach and engagement.
          </p>
        </motion.div>

        <ContentCalendar />

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center pt-4 pb-8"
        >
          <Link
            href="/"
            className="bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity text-center shadow-lg shadow-orange-500/25"
          >
            Roast a Video
          </Link>
          <Link
            href="/history"
            className="bg-zinc-800 text-zinc-300 font-semibold px-8 py-3 rounded-xl hover:bg-zinc-700 transition-colors text-center"
          >
            View Roast History
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
