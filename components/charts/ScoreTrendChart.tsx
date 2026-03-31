'use client';

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

interface ChartDataPoint {
  date: string;
  score: number;
  label: string;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataPoint }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const color = d.score >= 70 ? 'text-green-400' : d.score >= 50 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-400">{d.label}</p>
      <p className={`font-bold ${color}`}>{d.score}/100</p>
    </div>
  );
}

export default function ScoreTrendChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb923c" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#fb923c"
          strokeWidth={2}
          fill="url(#scoreGrad)"
          dot={{ r: 3, fill: '#fb923c', stroke: '#18181b', strokeWidth: 2 }}
          activeDot={{ r: 5, fill: '#fb923c' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
