'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoastResult } from '@/lib/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { GeneratedScript } from '@/app/api/generate-script/route';
import { saveScript } from '@/lib/script-history';

interface ScriptGeneratorProps {
  roast: RoastResult;
}

function CharCount({ text }: { text: string }) {
  const len = text.length;
  const color = len > 150 ? 'text-red-400' : len > 100 ? 'text-yellow-400' : 'text-green-400';
  return <span className={`text-xs ${color} font-mono`}>{len} chars</span>;
}

function CopyButton({ script }: { script: GeneratedScript }) {
  const [copied, setCopied] = useState(false);

  const formatScript = useCallback(() => {
    const scenes = script.scenes
      .map(
        (s) =>
          `Scene ${s.number} [${s.timing}]\nAction: ${s.action}\nDialogue: ${s.dialogue}`
      )
      .join('\n\n');

    return [
      `🎣 HOOK (0-3s)`,
      script.hook,
      ``,
      `🎬 SCENES`,
      scenes,
      ``,
      `📝 ON-SCREEN TEXT`,
      script.onScreenText.map((t) => `• ${t}`).join('\n'),
      ``,
      `✍️ CAPTION`,
      script.caption,
      ``,
      `#️⃣ HASHTAGS`,
      script.hashtags.map((h) => `#${h}`).join(' '),
      ``,
      `🎵 AUDIO`,
      script.audioSuggestion,
    ].join('\n');
  }, [script]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatScript());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = formatScript();
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
        copied
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-orange-500/40 hover:text-white'
      }`}
    >
      {copied ? (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          Copy Full Script
        </>
      )}
    </button>
  );
}

export function ScriptGenerator({ roast }: ScriptGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState<GeneratedScript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    const weaknesses = roast.agents
      .filter((a) => a.score < 60)
      .flatMap((a) => a.findings);

    const agentFeedback = roast.agents.map((a) => ({
      agent: a.agent,
      roastText: a.roastText,
      findings: a.findings,
      improvementTip: a.improvementTip,
    }));

    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roastScore: roast.overallScore,
          agentFeedback,
          weaknesses,
          userPrompt: userPrompt.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate script');
      }

      const data = await res.json();
      setScript(data.script);

      // Save to localStorage
      saveScript({
        roastId: roast.id,
        roastScore: roast.overallScore,
        tiktokUrl: roast.tiktokUrl,
        script: data.script,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mt-6"
    >
      {!script && (
        <div className="bg-gradient-to-br from-orange-500/10 via-pink-500/5 to-transparent border border-orange-500/20 rounded-2xl p-6 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-2xl">✨</span>
            <h3 className="text-lg font-bold text-white">Turn Your Roast Into a Script</h3>
          </div>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Claude will analyze every piece of feedback and generate an optimized TikTok script
            that directly fixes your weaknesses.
          </p>

          <div>
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className="text-xs text-zinc-500 hover:text-orange-400 transition-colors underline"
            >
              {showPrompt ? 'Hide' : '+ Add'} custom instructions (optional)
            </button>
            <AnimatePresence>
              {showPrompt && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3"
                >
                  <textarea
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    placeholder="e.g. make it about skincare, keep it under 30 seconds, casual tone..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 resize-none"
                    rows={2}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <GradientButton
            onClick={handleGenerate}
            loading={loading}
            size="lg"
            className="rounded-xl px-8"
          >
            {loading ? 'Generating Script...' : '✨ Generate an Improved Script'}
          </GradientButton>

          {loading && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-xs text-zinc-500"
            >
              Claude is studying your roast feedback...
            </motion.p>
          )}
        </div>
      )}

      <AnimatePresence>
        {script && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h3 className="text-lg font-bold text-white">Your Optimized Script</h3>
              </div>
              <div className="flex items-center gap-3">
                <CopyButton script={script} />
                <button
                  onClick={() => { setScript(null); setError(null); }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Regenerate
                </button>
              </div>
            </div>

            {/* Hook */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <GlassCard variant="highlighted" className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎣</span>
                    <span className="font-bold text-white">Hook</span>
                  </div>
                  <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-semibold">
                    0–3s
                  </span>
                </div>
                <p className="text-zinc-200 text-sm leading-relaxed font-medium">&ldquo;{script.hook}&rdquo;</p>
              </GlassCard>
            </motion.div>

            {/* Scenes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <GlassCard variant="surface" className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🎬</span>
                  <span className="font-bold text-white">Scene-by-Scene</span>
                </div>
                <div className="space-y-3">
                  {script.scenes.map((scene) => (
                    <div
                      key={scene.number}
                      className="flex gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/50"
                    >
                      <div className="flex-shrink-0 w-7 h-7 rounded-full fire-gradient flex items-center justify-center text-xs font-bold text-white">
                        {scene.number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-zinc-500 font-mono bg-zinc-800 px-2 py-0.5 rounded">
                            {scene.timing}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-300 font-medium mb-1">{scene.action}</p>
                        {scene.dialogue && scene.dialogue !== 'No dialogue' && (
                          <p className="text-xs text-orange-300 italic">&ldquo;{scene.dialogue}&rdquo;</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            {/* On-Screen Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <GlassCard variant="surface" className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">📝</span>
                  <span className="font-bold text-white">On-Screen Text</span>
                </div>
                <div className="space-y-2">
                  {script.onScreenText.map((text, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/60 border border-zinc-700/50"
                    >
                      <span className="text-xs text-zinc-600 font-mono w-4 shrink-0">{i + 1}</span>
                      <span className="text-sm text-white font-semibold">{text}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            {/* Caption */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <GlassCard variant="surface" className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✍️</span>
                    <span className="font-bold text-white">Caption</span>
                  </div>
                  <CharCount text={script.caption} />
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{script.caption}</p>
              </GlassCard>
            </motion.div>

            {/* Hashtags */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <GlassCard variant="surface" className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">#️⃣</span>
                  <span className="font-bold text-white">Hashtags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {script.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="text-sm px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-orange-500/40 hover:text-orange-300 transition-all cursor-default"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            {/* Audio Suggestion */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GlassCard variant="surface" className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🎵</span>
                  <span className="font-bold text-white">Audio Suggestion</span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{script.audioSuggestion}</p>
              </GlassCard>
            </motion.div>

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-center pt-2"
            >
              <CopyButton script={script} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
