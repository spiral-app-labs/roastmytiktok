'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HookExplainerBanner, HookHierarchyDiagram, HookExamplesBank } from '@/components/HookEducation';

export default function LearnPage() {
  // Show the hook hierarchy with a weak hook by default for educational purposes
  const [showWeakView, setShowWeakView] = useState(true);

  // Default detected type for the examples bank
  const defaultDetectedType = {
    type: 'none' as const,
    label: 'No specific type',
    explanation: 'Browse all hook types below to learn what works.',
    confidence: 'unclear' as const,
    upgrade: 'Try one of the patterns below in your next video.',
  };

  return (
    <main className="min-h-screen pb-20">
      <div className="max-w-3xl mx-auto px-4 pt-8">
        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-orange-400 transition-colors group mb-8">
          <span className="group-hover:-translate-x-0.5 transition-transform">&larr;</span>
          <span>back to home</span>
        </Link>

        <h1 className="text-3xl font-black text-white mb-2">Hook School</h1>
        <p className="text-sm text-zinc-400 mb-8 max-w-lg">
          Your hook is the first 1-3 seconds of your video. It determines whether someone watches or scrolls past. Everything else is downstream.
        </p>

        {/* Hook Explainer */}
        <section className="mb-8">
          <HookExplainerBanner />
        </section>

        {/* Hook Hierarchy */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Why Hooks Gate Everything</h2>
          <HookHierarchyDiagram isHookWeak={showWeakView} />
          <button
            onClick={() => setShowWeakView(v => !v)}
            className="mt-3 text-xs text-zinc-500 hover:text-orange-400 transition-colors"
          >
            {showWeakView ? 'Show strong hook view' : 'Show weak hook view'}
          </button>
        </section>

        {/* Hook Examples */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Hook Examples by Type</h2>
          <HookExamplesBank detectedType={defaultDetectedType} />
        </section>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          >
            Analyze Your Video
          </Link>
        </div>
      </div>
    </main>
  );
}
