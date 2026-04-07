'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { GeneratedScript, HookAlternative } from '@/app/api/generate-script/route';
import { type ScriptChange } from '@/app/api/improve-script/route';
import { saveScript } from '@/lib/script-history';

type StudioMode = 'create' | 'improve';

const NICHE_OPTIONS = [
  'fitness', 'cooking', 'comedy', 'beauty', 'business',
  'education', 'tech', 'lifestyle', 'fashion', 'travel',
  'health', 'music', 'gaming', 'pets', 'other',
];

const FORMAT_OPTIONS = [
  { value: 'generic', label: 'Auto / Generic' },
  { value: 'talking-head', label: 'Talking Head' },
  { value: 'tutorial', label: 'Tutorial / How-To' },
  { value: 'pov', label: 'POV' },
  { value: 'stitch-duet', label: 'Stitch / Duet' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'before-after', label: 'Before / After' },
];

const TONE_OPTIONS = ['funny', 'educational', 'dramatic', 'inspirational', 'casual'];

const DURATION_OPTIONS = [
  { value: '15s', label: '15s' },
  { value: '30s', label: '30s' },
  { value: '60s', label: '60s' },
  { value: '90s+', label: '90s+' },
];

const FOCUS_OPTIONS = [
  { value: 'overall', label: 'Overall' },
  { value: 'hook', label: 'Hook' },
  { value: 'pacing', label: 'Pacing' },
  { value: 'cta', label: 'CTA' },
  { value: 'all', label: 'Everything' },
];

function SelectPill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        selected
          ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/25'
          : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700 hover:border-orange-500/40 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

function ScriptOutput({ script, onSave }: { script: GeneratedScript; onSave: () => void }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = useCallback(async () => {
    const scenes = script.scenes
      .map(s => `Scene ${s.number} [${s.timing}]\nAction: ${s.action}\nDialogue: ${s.dialogue}`)
      .join('\n\n');
    const text = [
      `HOOK (0-3s)`, script.hook, ``,
      `SCENES`, scenes, ``,
      `ON-SCREEN TEXT`, script.onScreenText.map(t => `- ${t}`).join('\n'), ``,
      `CAPTION`, script.caption, ``,
      `HASHTAGS`, script.hashtags.map(h => `#${h}`).join(' '), ``,
      `AUDIO`, script.audioSuggestion,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [script]);

  const handleSave = () => {
    onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Hook */}
      <GlassCard variant="highlighted" className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🎣</span>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Hook (0-3s)</h3>
          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">Primary</span>
        </div>
        <p className="text-sm text-zinc-200 italic leading-relaxed">&ldquo;{script.hook}&rdquo;</p>

        {/* Hook Alternatives */}
        {script.hookAlternatives && script.hookAlternatives.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Alternatives</p>
            {script.hookAlternatives.map((alt: HookAlternative, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 capitalize">{alt.type}</span>
                </div>
                <p className="text-sm text-zinc-300 italic">&ldquo;{alt.text}&rdquo;</p>
                <p className="text-xs text-zinc-500 mt-1">{alt.rationale}</p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Scenes */}
      <GlassCard variant="surface" className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🎬</span>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Scenes</h3>
        </div>
        <div className="space-y-3">
          {script.scenes.map(scene => (
            <div key={scene.number} className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-orange-400">Scene {scene.number}</span>
                <span className="text-xs text-zinc-600">[{scene.timing}]</span>
              </div>
              <p className="text-xs text-zinc-400 mb-1"><span className="text-zinc-600">Action:</span> {scene.action}</p>
              <p className="text-xs text-zinc-300"><span className="text-zinc-600">Dialogue:</span> {scene.dialogue}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* On-Screen Text */}
      <GlassCard variant="surface" className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📝</span>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">On-Screen Text</h3>
        </div>
        <ul className="space-y-2">
          {script.onScreenText.map((text, i) => (
            <li key={i} className="text-xs text-zinc-300 flex gap-2">
              <span className="text-orange-400 shrink-0">•</span>
              {text}
            </li>
          ))}
        </ul>
      </GlassCard>

      {/* Caption + Hashtags + Audio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GlassCard variant="surface" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span>✍️</span>
            <span className="text-xs font-bold text-white uppercase tracking-wider">Caption</span>
          </div>
          <p className="text-xs text-zinc-300">{script.caption}</p>
        </GlassCard>
        <GlassCard variant="surface" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span>🎵</span>
            <span className="text-xs font-bold text-white uppercase tracking-wider">Audio</span>
          </div>
          <p className="text-xs text-zinc-300">{script.audioSuggestion}</p>
        </GlassCard>
      </div>

      <GlassCard variant="surface" className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span>#️⃣</span>
          <span className="text-xs font-bold text-white uppercase tracking-wider">Hashtags</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {script.hashtags.map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">#{tag}</span>
          ))}
        </div>
      </GlassCard>

      {/* Actions */}
      <div className="flex gap-3">
        <GradientButton onClick={handleCopy} variant="secondary" size="sm">
          {copied ? 'Copied!' : 'Copy Script'}
        </GradientButton>
        <GradientButton onClick={handleSave} variant="secondary" size="sm">
          {saved ? 'Saved!' : 'Save to History'}
        </GradientButton>
      </div>
    </motion.div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    recommended: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    optional: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[severity as keyof typeof styles] || styles.optional}`}>
      {severity}
    </span>
  );
}

function ImproveOutput({
  result,
  onSave,
}: {
  result: { original: string; improved: string; changes: ScriptChange[]; summary: string; voice_notes: string };
  onSave: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result.improved);
    } catch {
      const el = document.createElement('textarea');
      el.value = result.improved;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result.improved]);

  const handleSave = () => {
    onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Summary */}
      <GlassCard variant="highlighted" className="p-5">
        <h3 className="text-sm font-bold text-white mb-2">Summary</h3>
        <p className="text-sm text-zinc-300">{result.summary}</p>
        <p className="text-xs text-zinc-500 mt-2 italic">{result.voice_notes}</p>
      </GlassCard>

      {/* Changes */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white">Changes ({result.changes.length})</h3>
        {result.changes.map((change, i) => (
          <GlassCard key={i} variant="surface" className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <SeverityBadge severity={change.severity} />
              <span className="text-xs font-semibold text-zinc-400 uppercase">{change.section}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                <p className="text-xs text-zinc-500 mb-1 font-semibold">Original</p>
                <p className="text-xs text-zinc-400">{change.original}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                <p className="text-xs text-zinc-500 mb-1 font-semibold">Improved</p>
                <p className="text-xs text-zinc-200">{change.improved}</p>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-2">{change.reason}</p>
          </GlassCard>
        ))}
      </div>

      {/* Side by side */}
      <GlassCard variant="surface" className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-sm font-bold text-white">Improved Script</h3>
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="text-xs text-zinc-500 hover:text-orange-400 transition-colors"
          >
            {showOriginal ? 'Hide' : 'Show'} original
          </button>
        </div>
        {showOriginal && (
          <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/50 mb-3">
            <p className="text-xs text-zinc-500 mb-1 font-semibold">Original</p>
            <p className="text-xs text-zinc-400 whitespace-pre-wrap">{result.original}</p>
          </div>
        )}
        <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/50">
          <p className="text-xs text-zinc-200 whitespace-pre-wrap">{result.improved}</p>
        </div>
      </GlassCard>

      {/* Actions */}
      <div className="flex gap-3">
        <GradientButton onClick={handleCopy} variant="secondary" size="sm">
          {copied ? 'Copied!' : 'Copy Improved Script'}
        </GradientButton>
        <GradientButton onClick={handleSave} variant="secondary" size="sm">
          {saved ? 'Saved!' : 'Save to History'}
        </GradientButton>
      </div>
    </motion.div>
  );
}

export default function ScriptStudioPage() {
  const [mode, setMode] = useState<StudioMode>('create');

  // Create mode state
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('');
  const [format, setFormat] = useState('generic');
  const [tone, setTone] = useState('');
  const [duration, setDuration] = useState('');

  // Improve mode state
  const [scriptText, setScriptText] = useState('');
  const [focusArea, setFocusArea] = useState('overall');

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null);
  const [improveResult, setImproveResult] = useState<{
    original: string;
    improved: string;
    changes: ScriptChange[];
    summary: string;
    voice_notes: string;
  } | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setGeneratedScript(null);

    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'create',
          topic,
          niche: niche || undefined,
          format: format || undefined,
          tone: tone || undefined,
          duration: duration || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate script');
      }

      const data = await res.json();
      setGeneratedScript(data.script);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleImprove = async () => {
    setLoading(true);
    setError(null);
    setImproveResult(null);

    try {
      const res = await fetch('/api/improve-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: scriptText,
          focus_area: focusArea,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to improve script');
      }

      const data = await res.json();
      setImproveResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCreated = () => {
    if (!generatedScript) return;
    saveScript({
      roastId: `studio_${Date.now()}`,
      roastScore: 0,
      tiktokUrl: '',
      script: generatedScript,
      generatedAt: new Date().toISOString(),
      source: 'created',
      topic,
    });
  };

  const handleSaveImproved = () => {
    if (!improveResult) return;
    saveScript({
      roastId: `improved_${Date.now()}`,
      roastScore: 0,
      tiktokUrl: '',
      script: {
        hook: improveResult.improved.split('\n')[0] || '',
        scenes: [],
        onScreenText: [],
        caption: '',
        hashtags: [],
        audioSuggestion: '',
      },
      generatedAt: new Date().toISOString(),
      source: 'improved',
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Ambient gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-orange-500/5 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-pink-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-2xl px-4 py-12 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✍️</span>
              <h1 className="text-2xl font-black tracking-tight text-white">Script Studio</h1>
            </div>
            <Link href="/scripts" className="text-sm text-zinc-500 hover:text-orange-400 transition-colors">
              Script History →
            </Link>
          </div>
          <p className="text-zinc-500 text-sm ml-12">
            Create viral scripts from scratch or improve existing ones.
          </p>
        </motion.div>

        {/* Mode Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <div className="flex gap-2 p-1 rounded-xl bg-zinc-900/60 border border-zinc-800/50 w-fit">
            <button
              onClick={() => { setMode('create'); setError(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === 'create'
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Create New
            </button>
            <button
              onClick={() => { setMode('improve'); setError(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === 'improve'
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Improve Existing
            </button>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === 'create' ? (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
              {/* Topic Input */}
              <GlassCard variant="surface" className="p-5">
                <label className="block text-sm font-semibold text-white mb-2">
                  What&apos;s your video about?
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. 3 gym mistakes beginners make that are killing their gains"
                  className="w-full h-24 bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-orange-500/40 focus:outline-none resize-none transition-colors"
                />
              </GlassCard>

              {/* Niche */}
              <GlassCard variant="surface" className="p-5">
                <label className="block text-sm font-semibold text-white mb-3">Niche</label>
                <div className="flex flex-wrap gap-2">
                  {NICHE_OPTIONS.map(n => (
                    <SelectPill key={n} label={n} selected={niche === n} onClick={() => setNiche(niche === n ? '' : n)} />
                  ))}
                </div>
              </GlassCard>

              {/* Format */}
              <GlassCard variant="surface" className="p-5">
                <label className="block text-sm font-semibold text-white mb-3">Format</label>
                <div className="flex flex-wrap gap-2">
                  {FORMAT_OPTIONS.map(f => (
                    <SelectPill key={f.value} label={f.label} selected={format === f.value} onClick={() => setFormat(f.value)} />
                  ))}
                </div>
              </GlassCard>

              {/* Tone + Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <GlassCard variant="surface" className="p-5">
                  <label className="block text-sm font-semibold text-white mb-3">Tone</label>
                  <div className="flex flex-wrap gap-2">
                    {TONE_OPTIONS.map(t => (
                      <SelectPill key={t} label={t} selected={tone === t} onClick={() => setTone(tone === t ? '' : t)} />
                    ))}
                  </div>
                </GlassCard>
                <GlassCard variant="surface" className="p-5">
                  <label className="block text-sm font-semibold text-white mb-3">Duration</label>
                  <div className="flex flex-wrap gap-2">
                    {DURATION_OPTIONS.map(d => (
                      <SelectPill key={d.value} label={d.label} selected={duration === d.value} onClick={() => setDuration(duration === d.value ? '' : d.value)} />
                    ))}
                  </div>
                </GlassCard>
              </div>

              {/* Generate Button */}
              <GradientButton
                onClick={handleGenerate}
                disabled={!topic.trim() || loading}
                loading={loading}
                size="lg"
                className="w-full"
              >
                {loading ? 'Generating Script...' : 'Generate Script'}
              </GradientButton>

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}

              {generatedScript && (
                <ScriptOutput script={generatedScript} onSave={handleSaveCreated} />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="improve"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              {/* Script Input */}
              <GlassCard variant="surface" className="p-5">
                <label className="block text-sm font-semibold text-white mb-2">
                  Paste your script
                </label>
                <textarea
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="Paste your TikTok script here. Include everything - hook, dialogue, on-screen text, captions..."
                  className="w-full h-48 bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-orange-500/40 focus:outline-none resize-none transition-colors font-mono"
                />
                <p className="text-xs text-zinc-600 mt-1">{scriptText.length} characters</p>
              </GlassCard>

              {/* Focus Area */}
              <GlassCard variant="surface" className="p-5">
                <label className="block text-sm font-semibold text-white mb-3">Focus Area</label>
                <div className="flex flex-wrap gap-2">
                  {FOCUS_OPTIONS.map(f => (
                    <SelectPill key={f.value} label={f.label} selected={focusArea === f.value} onClick={() => setFocusArea(f.value)} />
                  ))}
                </div>
              </GlassCard>

              {/* Improve Button */}
              <GradientButton
                onClick={handleImprove}
                disabled={scriptText.trim().length < 10 || loading}
                loading={loading}
                size="lg"
                className="w-full"
              >
                {loading ? 'Improving Script...' : 'Improve Script'}
              </GradientButton>

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}

              {improveResult && (
                <ImproveOutput result={improveResult} onSave={handleSaveImproved} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
