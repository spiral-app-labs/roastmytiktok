'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface RetentionTimestamp {
  seconds: number;
  label: string;
}

interface RetentionCurveProps {
  hookScore: number;
  overallScore: number;
  videoDurationSeconds?: number;
  timestamps?: RetentionTimestamp[];
}

// SVG layout constants
const SVG_W = 560;
const SVG_H = 220;
const PAD_L = 48;
const PAD_R = 20;
const PAD_T = 28;
const PAD_B = 36;
const CHART_W = SVG_W - PAD_L - PAD_R;
const CHART_H = SVG_H - PAD_T - PAD_B;

function toX(t: number): number {
  return PAD_L + t * CHART_W;
}

function toY(v: number): number {
  return PAD_T + (1 - v / 100) * CHART_H;
}

// Catmull-Rom to cubic Bezier conversion for a smooth path through points
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = i < points.length - 1 ? points[i + 1] : curr;
    const prevPrev = i > 1 ? points[i - 2] : prev;
    const cp1x = prev.x + (curr.x - prevPrev.x) / 6;
    const cp1y = prev.y + (curr.y - prevPrev.y) / 6;
    const cp2x = curr.x - (next.x - prev.x) / 6;
    const cp2y = curr.y - (next.y - prev.y) / 6;
    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${curr.x.toFixed(2)},${curr.y.toFixed(2)}`;
  }
  return d;
}

export function RetentionCurve({
  hookScore,
  overallScore,
  videoDurationSeconds = 30,
  timestamps = [],
}: RetentionCurveProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const duration = Math.max(5, videoDurationSeconds);

  const { curvePath, areaPath, startPt, endPt, hookEndX, endRetention, midDropPt } = useMemo(() => {
    // Final retention at end of video based on overall score
    const endRetention = Math.max(3, overallScore * 0.18 + 2);

    // Retention at the 3-second hook window
    let hookDrop: number;
    if (hookScore > 70) {
      hookDrop = 85 + ((hookScore - 70) / 30) * 10; // 85-95%
    } else if (hookScore >= 40) {
      hookDrop = 60 + ((hookScore - 40) / 30) * 15; // 60-75%
    } else {
      hookDrop = 20 + (hookScore / 40) * 15; // 20-35%
    }
    hookDrop = Math.min(100, Math.max(5, hookDrop));

    const t3 = Math.min(3 / duration, 0.4); // normalized time at 3s
    const midRetention = hookDrop * (0.45 + overallScore / 250);
    const lateRetention = (midRetention + endRetention) / 2;

    const pts = [
      { t: 0, v: 100 },
      { t: t3 * 0.55, v: 100 - (100 - hookDrop) * 0.28 },
      { t: t3, v: hookDrop },
      { t: t3 + (1 - t3) * 0.35, v: midRetention },
      { t: t3 + (1 - t3) * 0.7, v: lateRetention },
      { t: 1, v: endRetention },
    ];

    const svgPts = pts.map((p) => ({ x: toX(p.t), y: toY(p.v) }));
    const curvePath = smoothPath(svgPts);

    const bottomY = toY(0);
    const last = svgPts[svgPts.length - 1];
    const first = svgPts[0];
    const areaPath =
      curvePath +
      ` L ${last.x.toFixed(2)},${bottomY.toFixed(2)}` +
      ` L ${first.x.toFixed(2)},${bottomY.toFixed(2)} Z`;

    return {
      curvePath,
      areaPath,
      startPt: first,
      endPt: last,
      hookEndX: toX(t3),
      endRetention: Math.round(endRetention),
      midDropPt: svgPts[2], // hook end
    };
  }, [hookScore, overallScore, duration]);

  const halfDur = Math.round(duration / 2);
  const validTimestamps = timestamps.filter(
    (ts) => typeof ts.seconds === 'number' && ts.seconds > 0 && ts.seconds < duration,
  );

  const yGrid = [100, 75, 50, 25, 0];

  return (
    <div
      className="relative rounded-3xl p-[1px]"
      style={{
        background:
          'linear-gradient(135deg, rgba(39,39,42,0.9) 0%, rgba(251,146,60,0.25) 50%, rgba(39,39,42,0.9) 100%)',
      }}
    >
      <div
        className="relative overflow-hidden rounded-[23px] px-5 py-5 sm:px-6"
        style={{
          background:
            'linear-gradient(180deg, rgba(24,24,27,0.95) 0%, rgba(9,9,11,0.98) 100%)',
          boxShadow:
            '0 20px 60px -25px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.03)',
        }}
      >
        {/* Ambient glow */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 0% 0%, rgba(251,146,60,0.08) 0%, transparent 60%)',
          }}
        />

        {/* Header row */}
        <div className="relative mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(251,146,60,0.2), rgba(236,72,153,0.15))',
                border: '1px solid rgba(251,146,60,0.35)',
              }}
            >
              <svg
                aria-hidden
                className="h-3.5 w-3.5 text-orange-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-white leading-none">
                Retention Curve
              </p>
              <p className="text-[9px] text-zinc-500 mt-0.5 uppercase tracking-wider">
                Predicted drop-off
              </p>
            </div>
          </div>

          {/* End retention stat */}
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{
              background: 'rgba(9,9,11,0.8)',
              border: '1px solid rgba(39,39,42,0.9)',
            }}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
              Ends at
            </span>
            <span
              className="text-xs font-black tabular-nums"
              style={{
                background: 'linear-gradient(135deg, #fed7aa, #fb923c)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {endRetention}%
            </span>
          </div>
        </div>

        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            width="100%"
            style={{ minWidth: 280 }}
            aria-label="Predicted viewer retention curve"
          >
            <defs>
              {/* Fire gradient for the curve stroke */}
              <linearGradient id="rc-curve-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>

              {/* Area fill: fire fade to transparent */}
              <linearGradient id="rc-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb923c" stopOpacity="0.35" />
                <stop offset="60%" stopColor="#ec4899" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
              </linearGradient>

              {/* Hook zone highlight */}
              <linearGradient id="rc-hook-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb923c" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#fb923c" stopOpacity="0.02" />
              </linearGradient>

              {/* Glow filter for line */}
              <filter id="rc-line-glow" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Hook zone shaded background */}
            <rect
              x={PAD_L}
              y={PAD_T}
              width={hookEndX - PAD_L}
              height={CHART_H}
              fill="url(#rc-hook-grad)"
            />

            {/* Y axis grid lines + labels */}
            {yGrid.map((v) => (
              <g key={v}>
                <line
                  x1={PAD_L}
                  y1={toY(v)}
                  x2={PAD_L + CHART_W}
                  y2={toY(v)}
                  stroke="#27272a"
                  strokeWidth={1}
                  strokeDasharray={v === 0 || v === 100 ? '0' : '2,4'}
                  strokeOpacity={v === 0 || v === 100 ? 1 : 0.6}
                />
                <text
                  x={PAD_L - 8}
                  y={toY(v) + 3.5}
                  textAnchor="end"
                  fontSize={9}
                  fill="#52525b"
                  fontFamily="var(--font-mono), monospace"
                  fontWeight={600}
                >
                  {v}%
                </text>
              </g>
            ))}

            {/* X axis time labels */}
            {([0, halfDur, duration] as number[]).map((t, i) => (
              <text
                key={t}
                x={toX(t / duration)}
                y={SVG_H - 10}
                textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}
                fontSize={9}
                fill="#52525b"
                fontFamily="var(--font-mono), monospace"
                fontWeight={600}
              >
                {t}s
              </text>
            ))}

            {/* Hook zone bracket annotation */}
            <text
              x={PAD_L + (hookEndX - PAD_L) / 2}
              y={PAD_T - 8}
              textAnchor="middle"
              fontSize={8}
              fill="#fb923c"
              fillOpacity={0.85}
              fontWeight={700}
              letterSpacing="1"
            >
              HOOK WINDOW
            </text>
            {/* Vertical end-of-hook-zone line */}
            <line
              x1={hookEndX}
              y1={PAD_T}
              x2={hookEndX}
              y2={PAD_T + CHART_H}
              stroke="#fb923c"
              strokeWidth={1}
              strokeOpacity={0.3}
              strokeDasharray="3,3"
            />

            {/* Shaded area under the curve */}
            <motion.path
              d={areaPath}
              fill="url(#rc-area-grad)"
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 1.2, delay: 1.6, ease: 'easeOut' }}
            />

            {/* Glow trace behind the main line */}
            <motion.path
              d={curvePath}
              fill="none"
              stroke="url(#rc-curve-grad)"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={0.35}
              filter="url(#rc-line-glow)"
              initial={reduceMotion ? { pathLength: 1, opacity: 0.35 } : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.35 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 1.8, delay: 0.3, ease: 'easeInOut' }}
            />

            {/* Main curve line */}
            <motion.path
              d={curvePath}
              fill="none"
              stroke="url(#rc-curve-grad)"
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 1.8, delay: 0.3, ease: 'easeInOut' }}
            />

            {/* Key timestamp markers — pulsing dots */}
            {validTimestamps.map((ts, i) => {
              const x = toX(ts.seconds / duration);
              return (
                <g key={`${ts.seconds}-${i}`}>
                  <line
                    x1={x}
                    y1={PAD_T}
                    x2={x}
                    y2={PAD_T + CHART_H}
                    stroke="#a1a1aa"
                    strokeWidth={1}
                    strokeOpacity={0.22}
                    strokeDasharray="2,4"
                  />
                  {/* Pulse ring */}
                  {!reduceMotion && (
                    <motion.circle
                      cx={x}
                      cy={PAD_T + CHART_H - 4}
                      r={4}
                      fill="none"
                      stroke="#fb923c"
                      strokeWidth={1.5}
                      initial={{ opacity: 0, scale: 1 }}
                      animate={{ opacity: [0, 0.8, 0], scale: [1, 2.2, 2.6] }}
                      transition={{
                        duration: 2.2,
                        delay: 2.1 + i * 0.2,
                        repeat: Infinity,
                        ease: 'easeOut',
                      }}
                    />
                  )}
                  {/* Solid marker */}
                  <motion.circle
                    cx={x}
                    cy={PAD_T + CHART_H - 4}
                    r={3}
                    fill="#fb923c"
                    stroke="#0a0a0b"
                    strokeWidth={1.5}
                    initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={reduceMotion ? { duration: 0 } : { delay: 2 + i * 0.12, type: 'spring', stiffness: 200 }}
                  />
                  <text
                    x={x + 5}
                    y={PAD_T + CHART_H - 6}
                    fontSize={8}
                    fill="#a1a1aa"
                    fontFamily="var(--font-mono), monospace"
                    fontWeight={600}
                  >
                    {ts.label}
                  </text>
                </g>
              );
            })}

            {/* Start dot */}
            <motion.circle
              cx={startPt.x}
              cy={startPt.y}
              r={5}
              fill="#fb923c"
              stroke="#0a0a0b"
              strokeWidth={1.5}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduceMotion ? { duration: 0 } : { delay: 0.4, type: 'spring', stiffness: 200 }}
            />

            {/* Hook drop emphasis dot */}
            <motion.circle
              cx={midDropPt.x}
              cy={midDropPt.y}
              r={4}
              fill="#ec4899"
              stroke="#0a0a0b"
              strokeWidth={1.5}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduceMotion ? { duration: 0 } : { delay: 1.1, type: 'spring', stiffness: 200 }}
            />

            {/* End dot */}
            <motion.circle
              cx={endPt.x}
              cy={endPt.y}
              r={4}
              fill="#ec4899"
              stroke="#0a0a0b"
              strokeWidth={1.5}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduceMotion ? { duration: 0 } : { delay: 2.1, type: 'spring', stiffness: 200 }}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
