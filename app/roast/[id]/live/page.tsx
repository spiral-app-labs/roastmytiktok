'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import { RoastResult, AgentRoast } from '@/lib/types';
import { AGENTS } from '@/lib/agents';
import { ScoreRing } from '@/components/ScoreRing';
import Link from 'next/link';

function getReactionEmoji(score: number): string {
  if (score < 30) return '💀';
  if (score < 45) return '🔥';
  if (score < 60) return '😬';
  if (score < 75) return '👀';
  return '✨';
}

function getCommentTier(score: number): { border: string; bg: string; glow: string } {
  if (score < 30) return {
    border: 'border-red-500/40',
    bg: 'bg-red-500/5',
    glow: 'shadow-[0_0_12px_rgba(239,68,68,0.15)]',
  };
  if (score < 50) return {
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/5',
    glow: '',
  };
  if (score < 70) return {
    border: 'border-yellow-500/20',
    bg: 'bg-zinc-800/60',
    glow: '',
  };
  return {
    border: 'border-zinc-700/30',
    bg: 'bg-zinc-800/40',
    glow: '',
  };
}

export default function LiveRoastPage() {
  const params = useParams();
  const id = params.id as string;

  const [roast, setRoast] = useState<RoastResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shownComments, setShownComments] = useState<AgentRoast[]>([]);
  const [showScoreCard, setShowScoreCard] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const shownRef = useRef(new Set<string>());
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  // Fetch roast data and signed video URL
  useEffect(() => {
    async function load() {
      try {
        let data: RoastResult | null = null;
        try {
          const cached = sessionStorage.getItem(`roast_${id}`);
          if (cached) data = JSON.parse(cached);
        } catch { /* ignore */ }

        if (!data) {
          const res = await fetch(`/api/roast/${id}`);
          if (!res.ok) { setError('Roast not found.'); setLoading(false); return; }
          data = await res.json();
        }
        setRoast(data);

        const videoRes = await fetch(`/api/roast/${id}/video`);
        if (videoRes.ok) {
          const { url } = await videoRes.json();
          setVideoUrl(url);
        } else {
          setError('Could not load video.');
        }
      } catch {
        setError('Failed to load roast.');
      }
      setLoading(false);
    }
    load();
  }, [id]);

  // Canvas overlay drawing
  const drawOverlay = useCallback((currentTime: number) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!roast) return;

    if (currentTime >= 0 && currentTime <= 3) {
      const alpha = currentTime <= 1.5
        ? currentTime / 1.5
        : 1 - (currentTime - 1.5) / 1.5;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height * 0.3, 30 + Math.sin(currentTime * 6) * 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(249,115,22,${alpha * 0.8})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }, [roast]);

  // Drive comment reveal + canvas from video playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !roast) return;

    function tick() {
      if (!video || !roast) return;
      const t = video.currentTime;
      const duration = video.duration || 60;

      drawOverlay(t);

      const totalAgents = roast.agents.length;
      roast.agents.forEach((agentRoast, idx) => {
        const revealAt = duration * ((idx + 1) / (totalAgents + 1));
        if (t >= revealAt && !shownRef.current.has(agentRoast.agent)) {
          shownRef.current.add(agentRoast.agent);
          setShownComments(prev => [...prev, agentRoast]);
        }
      });

      animFrameRef.current = requestAnimationFrame(tick);
    }

    function handlePlay() {
      setIsPlaying(true);
      animFrameRef.current = requestAnimationFrame(tick);
    }
    function handlePause() {
      setIsPlaying(false);
      cancelAnimationFrame(animFrameRef.current);
    }
    function handleEnded() {
      setIsPlaying(false);
      cancelAnimationFrame(animFrameRef.current);
      // Show all remaining
      if (roast) {
        roast.agents.forEach(a => {
          if (!shownRef.current.has(a.agent)) {
            shownRef.current.add(a.agent);
            setShownComments(prev => [...prev, a]);
          }
        });
      }
      setTimeout(() => setShowScoreCard(true), 800);
    }

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [roast, drawOverlay]);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [shownComments]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🔥</div>
          <p className="text-zinc-400">Loading live roast...</p>
        </div>
      </main>
    );
  }

  if (error || !roast) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">😵</div>
          <p className="text-zinc-400 mb-4">{error || 'Roast not found.'}</p>
          <Link href={`/roast/${id}`} className="text-orange-400 hover:text-orange-300 transition-colors">
            ← Back to scorecard
          </Link>
        </div>
      </main>
    );
  }

  const lowestAgent = [...roast.agents].sort((a, b) => a.score - b.score)[0];

  return (
    <main className="min-h-screen pb-20 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-orange-500/6 via-pink-500/3 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-6">
        <Link
          href={`/roast/${id}`}
          className="text-sm text-zinc-500 hover:text-orange-400 transition-colors mb-4 inline-block"
        >
          ← Back to scorecard
        </Link>

        <div className="flex flex-col lg:flex-row gap-4 mt-2">
          {/* LEFT: Video Player */}
          <div className="lg:w-[60%] w-full">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/5">
              {videoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    playsInline
                    className="w-full aspect-video bg-black"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />
                  {/* Bottom gradient overlay */}
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                </>
              ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-zinc-900">
                  <p className="text-zinc-500">Video unavailable</p>
                </div>
              )}
            </div>

            {/* Play hint when not playing */}
            {!isPlaying && shownComments.length === 0 && videoUrl && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-center text-xs text-zinc-600 mt-2"
              >
                ▶ Play the video to trigger live agent commentary
              </motion.p>
            )}

            {/* Collapsible Transcript */}
            {roast.audioTranscript && (
              <div className="mt-3">
                <button
                  onClick={() => setShowTranscript(prev => !prev)}
                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-orange-400 transition-colors w-full text-left"
                >
                  <span>{showTranscript ? '▼' : '▶'}</span>
                  <span>Transcript</span>
                </button>
                <AnimatePresence>
                  {showTranscript && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-3 max-h-[200px] overflow-y-auto">
                        {roast.audioSegments && roast.audioSegments.length > 0 ? (
                          <div className="space-y-1">
                            {roast.audioSegments.map((seg, i) => (
                              <div key={i} className="flex gap-2 text-xs">
                                <span className="text-zinc-600 font-mono shrink-0">
                                  {seg.start.toFixed(1)}s
                                </span>
                                <span className="text-zinc-300">{seg.text}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400">{roast.audioTranscript}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* RIGHT: Live Comment Feed */}
          <div className="lg:w-[40%] w-full">
            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/60 rounded-2xl h-[calc(56.25vw*0.6)] lg:h-[calc(60vw*0.5625)] min-h-[400px] max-h-[600px] flex flex-col shadow-xl shadow-black/30">
              {/* Feed header */}
              <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-zinc-200">Live Commentary</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {shownComments.length}/{roast.agents.length} agents in
                  </p>
                </div>
                {isPlaying && (
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wide">Live</span>
                  </motion.div>
                )}
              </div>

              <div ref={feedRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 scroll-smooth">
                <AnimatePresence>
                  {shownComments.map((agentRoast, idx) => {
                    const agentDef = AGENTS.find(a => a.key === agentRoast.agent);
                    const tier = getCommentTier(agentRoast.score);
                    const reaction = getReactionEmoji(agentRoast.score);
                    const isSpicy = agentRoast.score < 45;

                    return (
                      <motion.div
                        key={agentRoast.agent}
                        initial={{ opacity: 0, x: 50, scale: 0.92 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{
                          type: 'spring',
                          stiffness: 320,
                          damping: 28,
                          delay: 0,
                        }}
                        className={`border rounded-xl p-3 ${tier.border} ${tier.bg} ${tier.glow} transition-all`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-base leading-none">{agentDef?.emoji ?? '?'}</span>
                          <span className="text-xs font-bold text-zinc-200 flex-1">{agentDef?.name ?? agentRoast.agent}</span>
                          <div className="flex items-center gap-1">
                            {isSpicy && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', delay: 0.1 }}
                                className="text-sm"
                              >
                                {reaction}
                              </motion.span>
                            )}
                            <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${
                              agentRoast.score >= 80 ? 'bg-green-500/20 text-green-400' :
                              agentRoast.score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                              agentRoast.score >= 40 ? 'bg-orange-500/20 text-orange-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {agentRoast.score}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed italic">
                          &ldquo;{agentRoast.roastText}&rdquo;
                        </p>
                        {/* Spicy take highlight bar */}
                        {isSpicy && (
                          <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 0.4, delay: 0.15 }}
                            className="mt-2 h-0.5 rounded-full bg-gradient-to-r from-orange-500/60 to-pink-500/40 origin-left"
                          />
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {shownComments.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 pb-8">
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-3xl"
                    >
                      🎬
                    </motion.div>
                    <p className="text-zinc-600 text-sm text-center">
                      Hit play and watch the agents<br />tear your content apart
                    </p>
                  </div>
                )}
              </div>

              {/* Comment count progress bar */}
              {roast.agents.length > 0 && (
                <div className="px-4 py-2 border-t border-zinc-800/50">
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full"
                      animate={{ width: `${(shownComments.length / roast.agents.length) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Score Card Overlay */}
      <AnimatePresence>
        {showScoreCard && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-700/50 px-4 py-6"
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex flex-col items-center">
                  <ScoreRing score={roast.overallScore} size={80} />
                  <p className="text-xs text-zinc-500 mt-2">Overall</p>
                </div>

                <div className="flex flex-wrap gap-3 justify-center flex-1">
                  {roast.agents.map((a) => {
                    const agentDef = AGENTS.find(ag => ag.key === a.agent);
                    return (
                      <div key={a.agent} className="flex items-center gap-1.5 bg-zinc-800/60 rounded-lg px-2.5 py-1.5">
                        <span className="text-sm">{agentDef?.emoji}</span>
                        <ScoreRing score={a.score} size={32} />
                      </div>
                    );
                  })}
                </div>

                {lowestAgent && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 max-w-xs">
                    <p className="text-xs font-bold text-red-400 mb-1">
                      Biggest Issue: {AGENTS.find(a => a.key === lowestAgent.agent)?.name}
                    </p>
                    <p className="text-xs text-zinc-400">{lowestAgent.improvementTip}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-3 mt-4">
                <Link
                  href={`/roast/${id}`}
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                >
                  View full scorecard →
                </Link>
                <button
                  onClick={() => setShowScoreCard(false)}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
