'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import { RoastResult, AgentRoast } from '@/lib/types';
import { AGENTS } from '@/lib/agents';
import { ScoreRing } from '@/components/ScoreRing';
import Link from 'next/link';

export default function LiveRoastPage() {
  const params = useParams();
  const id = params.id as string;

  const [roast, setRoast] = useState<RoastResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shownComments, setShownComments] = useState<AgentRoast[]>([]);
  const [showScoreCard, setShowScoreCard] = useState(false);
  const shownRef = useRef(new Set<string>());
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  // Fetch roast data and signed video URL
  useEffect(() => {
    async function load() {
      try {
        // Try sessionStorage first
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

        // Fetch signed video URL
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

    // Match canvas to video display size
    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!roast) return;

    // Hook highlight: pulsing orange circle (0-3s)
    if (currentTime >= 0 && currentTime <= 3) {
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(currentTime * 3));
      ctx.beginPath();
      ctx.arc(canvas.width * 0.25, canvas.height * 0.5, 30, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 150, 50, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.closePath();
    }

    // Visual: red border flash if score < 60
    const visualAgent = roast.agents.find(a => a.agent === 'visual');
    if (visualAgent && visualAgent.score < 60) {
      const ts = visualAgent.timestamp_seconds ?? 1.5;
      if (currentTime >= ts && currentTime <= ts + 0.8) {
        const alpha = 1 - ((currentTime - ts) / 0.8);
        ctx.strokeStyle = `rgba(248, 113, 113, ${Math.max(0, alpha)})`;
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
      }
    }

    // Caption: dotted rectangle in bottom third
    const captionAgent = roast.agents.find(a => a.agent === 'caption');
    if (captionAgent) {
      const ts = captionAgent.timestamp_seconds ?? 3.0;
      if (currentTime >= ts && currentTime <= ts + 2) {
        const alpha = Math.min(1, (currentTime - ts) / 0.3) * (1 - Math.max(0, (currentTime - ts - 1.5) / 0.5));
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = `rgba(250, 204, 21, ${Math.max(0, alpha * 0.7)})`;
        ctx.lineWidth = 2;
        const y = canvas.height * 0.67;
        ctx.strokeRect(canvas.width * 0.1, y, canvas.width * 0.8, canvas.height * 0.28);
        ctx.setLineDash([]);
      }
    }
  }, [roast]);

  // Time-tracking loop for comments + canvas
  useEffect(() => {
    if (!roast || !videoRef.current) return;

    const sortedAgents = [...roast.agents].sort(
      (a, b) => (a.timestamp_seconds ?? 0) - (b.timestamp_seconds ?? 0)
    );

    let running = true;

    function tick() {
      if (!running) return;
      const video = videoRef.current;
      if (!video) { animFrameRef.current = requestAnimationFrame(tick); return; }

      const currentTime = video.currentTime;

      // Drop comments as video passes their timestamp
      for (const agent of sortedAgents) {
        const ts = agent.timestamp_seconds ?? 0;
        if (currentTime >= ts && !shownRef.current.has(agent.agent)) {
          shownRef.current.add(agent.agent);
          setShownComments(prev => [...prev, agent]);
        }
      }

      // Draw canvas overlay
      drawOverlay(currentTime);

      // Show scorecard when all comments shown and video near end or ended
      if (
        shownRef.current.size === sortedAgents.length &&
        (video.ended || video.currentTime >= video.duration - 0.5)
      ) {
        setShowScoreCard(true);
      }

      animFrameRef.current = requestAnimationFrame(tick);
    }

    animFrameRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(animFrameRef.current); };
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
          <div className="text-4xl mb-4 animate-pulse">&#128293;</div>
          <p className="text-zinc-400">Loading live roast...</p>
        </div>
      </main>
    );
  }

  if (error || !roast) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">&#128565;</div>
          <p className="text-zinc-400 mb-4">{error || 'Roast not found.'}</p>
          <Link href={`/roast/${id}`} className="text-orange-400 hover:text-orange-300 transition-colors">
            &larr; Back to scorecard
          </Link>
        </div>
      </main>
    );
  }

  const lowestAgent = [...roast.agents].sort((a, b) => a.score - b.score)[0];

  return (
    <main className="min-h-screen pb-20 relative">
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Link
          href={`/roast/${id}`}
          className="text-sm text-zinc-500 hover:text-orange-400 transition-colors mb-4 inline-block"
        >
          &larr; Back to scorecard
        </Link>

        <div className="flex flex-col lg:flex-row gap-4 mt-2">
          {/* LEFT: Video Player */}
          <div className="lg:w-[60%] w-full">
            <div className="relative bg-black rounded-xl overflow-hidden">
              {videoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    playsInline
                    className="w-full aspect-video bg-black"
                    onEnded={() => setShowScoreCard(true)}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />
                </>
              ) : (
                <div className="w-full aspect-video flex items-center justify-center">
                  <p className="text-zinc-500">Video unavailable</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Live Comment Feed */}
          <div className="lg:w-[40%] w-full">
            <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl h-[calc(56.25vw*0.6)] lg:h-[calc(60vw*0.5625)] min-h-[400px] max-h-[600px] flex flex-col">
              <div className="px-4 py-3 border-b border-zinc-800/50">
                <h2 className="text-sm font-bold text-zinc-300">Live Agent Commentary</h2>
                <p className="text-xs text-zinc-500">
                  {shownComments.length}/{roast.agents.length} agents reported
                </p>
              </div>

              <div ref={feedRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                <AnimatePresence>
                  {shownComments.map((agentRoast) => {
                    const agentDef = AGENTS.find(a => a.key === agentRoast.agent);
                    const scoreColor =
                      agentRoast.score >= 80 ? 'bg-green-500/20 text-green-400' :
                      agentRoast.score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                      agentRoast.score >= 40 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-red-500/20 text-red-400';

                    return (
                      <motion.div
                        key={agentRoast.agent}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="bg-zinc-800/50 border border-zinc-700/30 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-lg">{agentDef?.emoji ?? '?'}</span>
                          <span className="text-xs font-bold text-zinc-200">{agentDef?.name ?? agentRoast.agent}</span>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${scoreColor}`}>
                            {agentRoast.score}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed italic">
                          &ldquo;{agentRoast.roastText}&rdquo;
                        </p>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {shownComments.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-zinc-600 text-sm">Play the video to see agent commentary...</p>
                  </div>
                )}
              </div>
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
                {/* Overall Score */}
                <div className="flex flex-col items-center">
                  <ScoreRing score={roast.overallScore} size={80} />
                  <p className="text-xs text-zinc-500 mt-2">Overall</p>
                </div>

                {/* Mini Agent Scores */}
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

                {/* Fix-it tip for lowest scorer */}
                {lowestAgent && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 max-w-xs">
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
                  className="text-xs text-zinc-400 hover:text-orange-400 transition-colors"
                >
                  View full scorecard &rarr;
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
