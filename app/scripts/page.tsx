'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { SavedScript, getScripts, deleteScript, ScriptSource } from '@/lib/script-history';
import { GlassCard } from '@/components/ui/GlassCard';
import { GeneratedScript } from '@/app/api/generate-script/route';

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-zinc-500">{score}/100</span>
    </div>
  );
}

function ScriptPreview({ script }: { script: GeneratedScript }) {
  return (
    <div className="space-y-3 mt-4">
      <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/50">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">🎣</span>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Hook Lab</span>
          <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">0-5s</span>
        </div>
        <p className="text-sm text-zinc-200 italic">&ldquo;{script.hook}&rdquo;</p>
        {script.hookLab?.firstShotDirection ? (
          <p className="mt-2 text-xs text-zinc-500">First shot: {script.hookLab.firstShotDirection}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/50">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm">🎬</span>
            <span className="text-xs font-semibold text-zinc-400">Scenes</span>
          </div>
          <p className="text-xs text-zinc-500">{script.scenes.length} scenes</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/50">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm">🎵</span>
            <span className="text-xs font-semibold text-zinc-400">Audio</span>
          </div>
          <p className="text-xs text-zinc-500 truncate">{script.audioSuggestion.slice(0, 40)}...</p>
        </div>
      </div>

      {script.hookAlternatives?.length ? (
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">🧪</span>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Hook options</span>
          </div>
          <p className="text-xs text-zinc-500">{script.hookAlternatives.length} replacement opener{script.hookAlternatives.length === 1 ? '' : 's'} ready to test</p>
        </div>
      ) : null}

      <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/50">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">#️⃣</span>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Hashtags</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {script.hashtags.slice(0, 5).map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source?: ScriptSource }) {
  const config = {
    created: { label: 'Created', class: 'bg-blue-500/20 text-blue-400' },
    improved: { label: 'Improved', class: 'bg-purple-500/20 text-purple-400' },
    roast: { label: 'Post-Roast', class: 'bg-orange-500/20 text-orange-400' },
  };
  const s = source || 'roast';
  const c = config[s] || config.roast;
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full ${c.class}`}>{c.label}</span>
  );
}

function ScriptCard({ saved, onDelete }: { saved: SavedScript; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const handleCopy = async () => {
    const { script } = saved;
    const scenes = script.scenes
      .map((s) => `Scene ${s.number} [${s.timing}]\nAction: ${s.action}\nDialogue: ${s.dialogue}`)
      .join('\n\n');
    const text = [
      `🎣 HOOK LAB (0-5s)`, script.hook, ``,
      `🎬 FIRST SHOT`, script.hookLab?.firstShotDirection || 'Not provided', ``,
      `🧭 BEAT PLAN`, script.hookLab?.beatPlan?.join('\n') || 'Not provided', ``,
      `🎬 SCENES`, scenes, ``,
      `📝 ON-SCREEN TEXT`, script.onScreenText.map((t) => `• ${t}`).join('\n'), ``,
      `✍️ CAPTION`, script.caption, ``,
      `#️⃣ HASHTAGS`, script.hashtags.map((h) => `#${h}`).join(' '), ``,
      `🎵 AUDIO`, script.audioSuggestion,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortUrl = saved.tiktokUrl
    ? saved.tiktokUrl.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)
    : `Roast ${saved.roastId.slice(0, 8)}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <GlassCard variant="surface" className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">✨</span>
              <p className="text-sm font-semibold text-white truncate">{saved.topic || shortUrl}</p>
              <SourceBadge source={saved.source} />
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-zinc-600">{formatDate(saved.generatedAt)}</p>
              <ScoreBar score={saved.roastScore} />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/roast/${saved.roastId}`}
              className="text-xs text-zinc-500 hover:text-orange-400 transition-colors px-2 py-1"
            >
              View roast →
            </Link>
            <button
              onClick={handleCopy}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                copied
                  ? 'border-green-500/30 text-green-400 bg-green-500/10'
                  : 'border-zinc-700 text-zinc-400 hover:border-orange-500/40 hover:text-white'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => onDelete(saved.id)}
              className="text-xs text-zinc-700 hover:text-red-400 transition-colors px-1 py-1"
              title="Delete script"
            >
              ✕
            </button>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs text-zinc-500 hover:text-orange-400 transition-colors flex items-center gap-1"
        >
          <span>{expanded ? '▲ Hide' : '▼ Preview'} script</span>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <ScriptPreview script={saved.script} />
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<SavedScript[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setScripts(getScripts());
    setMounted(true);
  }, []);

  const handleDelete = (id: string) => {
    deleteScript(id);
    setScripts((prev) => prev.filter((s) => s.id !== id));
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-[#080808] pt-20 pb-16">
        <div className="max-w-2xl mx-auto px-4">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-zinc-900/60 rounded-2xl" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] pt-20 pb-16">
      <div className="max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📜</span>
              <h1 className="text-2xl font-bold text-white">Script History</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/scripts/create"
                className="inline-flex items-center gap-1.5 fire-gradient text-white font-semibold px-4 py-2 rounded-xl text-sm hover:opacity-90 transition-opacity"
              >
                ✍️ Create New Script
              </Link>
              <Link href="/" className="text-sm text-zinc-500 hover:text-orange-400 transition-colors">
                ← New Roast
              </Link>
            </div>
          </div>
          <p className="text-zinc-500 text-sm ml-12">
            {scripts.length > 0
              ? `${scripts.length} script${scripts.length === 1 ? '' : 's'} generated from your roasts`
              : 'Scripts you generate from roast results will appear here'}
          </p>
        </motion.div>

        {scripts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="text-5xl mb-4">✨</div>
            <h2 className="text-lg font-semibold text-zinc-300 mb-2">No scripts yet</h2>
            <p className="text-sm text-zinc-600 mb-6">
              Create a script from scratch or get a roast and generate an improved version.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
              <Link
                href="/scripts/create"
                className="inline-flex items-center gap-2 fire-gradient text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                ✍️ Create New Script
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-zinc-800 text-zinc-200 font-semibold px-6 py-3 rounded-xl border border-zinc-700 hover:border-zinc-500 transition-all"
              >
                🚀 Go Viral
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {scripts.map((saved) => (
                <ScriptCard key={saved.id} saved={saved} onDelete={handleDelete} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}
