'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

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
const SVG_H = 200;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 20;
const PAD_B = 32;
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
  const duration = Math.max(5, videoDurationSeconds);

  const { curvePath, areaPath, startPt, endPt, hookEndX } = useMemo(() => {
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

    const svgPts = pts.map(p => ({ x: toX(p.t), y: toY(p.v) }));
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
    };
  }, [hookScore, overallScore, duration]);

  const halfDur = Math.round(duration / 2);
  const validTimestamps = timestamps.filter(
    ts => typeof ts.seconds === 'number' && ts.seconds > 0 && ts.seconds < duration
  );

  const yGrid = [100, 75, 50, 25, 0];

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/60 px-5 py-5">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">
        Predicted Retention Curve
      </p>
      <p className="text-xs text-zinc-600 mb-4">
        AI-estimated viewer drop-off based on hook strength and content quality
      </p>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width="100%"
          style={{ minWidth: 280 }}
          aria-label="Predicted viewer retention curve"
        >
          <defs>
            <linearGradient id="rc-curve-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#fb923c" />
            </linearGradient>
            <linearGradient id="rc-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Hook zone shaded background */}
          <rect
            x={PAD_L}
            y={PAD_T}
            width={hookEndX - PAD_L}
            height={CHART_H}
            fill="#f97316"
            fillOpacity={0.05}
          />

          {/* Y axis grid lines + labels */}
          {yGrid.map(v => (
            <g key={v}>
              <line
                x1={PAD_L}
                y1={toY(v)}
                x2={PAD_L + CHART_W}
                y2={toY(v)}
                stroke="#27272a"
                strokeWidth={1}
              />
              <text
                x={PAD_L - 6}
                y={toY(v) + 4}
                textAnchor="end"
                fontSize={9}
                fill="#52525b"
              >
                {v}%
              </text>
            </g>
          ))}

          {/* X axis baseline */}
          <line
            x1={PAD_L}
            y1={PAD_T + CHART_H}
            x2={PAD_L + CHART_W}
            y2={PAD_T + CHART_H}
            stroke="#3f3f46"
            strokeWidth={1}
          />

          {/* X axis time labels */}
          {([0, halfDur, duration] as number[]).map((t, i) => (
            <text
              key={t}
              x={toX(t / duration)}
              y={SVG_H - 6}
              textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}
              fontSize={9}
              fill="#52525b"
            >
              {t}s
            </text>
          ))}

          {/* Hook zone bracket annotation */}
          <text
            x={PAD_L + (hookEndX - PAD_L) / 2}
            y={PAD_T + 11}
            textAnchor="middle"
            fontSize={8}
            fill="#f97316"
            fillOpacity={0.65}
            fontWeight="600"
          >
            HOOK ZONE
          </text>
          {/* Left bracket */}
          <path
            d={`M ${PAD_L + 3},${PAD_T + 15} L ${PAD_L + 3},${PAD_T + 5} L ${PAD_L + 13},${PAD_T + 5}`}
            fill="none"
            stroke="#f97316"
            strokeWidth={1}
            strokeOpacity={0.4}
          />
          {/* Right bracket */}
          <path
            d={`M ${hookEndX - 3},${PAD_T + 15} L ${hookEndX - 3},${PAD_T + 5} L ${hookEndX - 13},${PAD_T + 5}`}
            fill="none"
            stroke="#f97316"
            strokeWidth={1}
            strokeOpacity={0.4}
          />
          {/* Vertical end-of-hook-zone line */}
          <line
            x1={hookEndX}
            y1={PAD_T}
            x2={hookEndX}
            y2={PAD_T + CHART_H}
            stroke="#f97316"
            strokeWidth={1}
            strokeOpacity={0.18}
            strokeDasharray="3,3"
          />

          {/* Key timestamp markers */}
          {validTimestamps.map(ts => {
            const x = toX(ts.seconds / duration);
            return (
              <g key={ts.seconds}>
                <line
                  x1={x}
                  y1={PAD_T}
                  x2={x}
                  y2={PAD_T + CHART_H}
                  stroke="#a1a1aa"
                  strokeWidth={1}
                  strokeOpacity={0.3}
                  strokeDasharray="3,3"
                />
                <text
                  x={x + 3}
                  y={PAD_T + CHART_H - 5}
                  fontSize={7.5}
                  fill="#71717a"
                >
                  {ts.label}
                </text>
              </g>
            );
          })}

          {/* Shaded area under the curve - fades in after line draws */}
          <motion.path
            d={areaPath}
            fill="url(#rc-area-grad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 1.6, ease: 'easeOut' }}
          />

          {/* Animated curve line */}
          <motion.path
            d={curvePath}
            fill="none"
            stroke="url(#rc-curve-grad)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.8, delay: 0.3, ease: 'easeInOut' }}
          />

          {/* Start dot */}
          <motion.circle
            cx={startPt.x}
            cy={startPt.y}
            r={4}
            fill="#f97316"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          />

          {/* End dot */}
          <motion.circle
            cx={endPt.x}
            cy={endPt.y}
            r={3}
            fill="#fb923c"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.1 }}
          />
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-orange-500 rounded" />
          <span className="text-xs text-zinc-600">Predicted retention</span>
        </div>
        {validTimestamps.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-px h-3 border-l border-dashed border-zinc-600" />
            <span className="text-xs text-zinc-600">Key moment</span>
          </div>
        )}
      </div>
    </div>
  );
}
