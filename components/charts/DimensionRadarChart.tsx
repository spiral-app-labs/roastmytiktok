'use client';

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';

interface DimensionRadarChartProps {
  chartData: Array<Record<string, string | number>>;
  tier: string;
  nextTier: string | null;
}

export default function DimensionRadarChart({ chartData, tier, nextTier }: DimensionRadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="72%">
        <PolarGrid stroke="rgba(63,63,70,0.4)" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: '#52525b', fontSize: 10 }}
          axisLine={false}
        />
        {nextTier && (
          <Radar
            name={nextTier}
            dataKey={nextTier}
            stroke="rgba(34,197,94,0.5)"
            fill="rgba(34,197,94,0.06)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}
        <Radar
          name={tier}
          dataKey={tier}
          stroke="rgba(113,113,122,0.6)"
          fill="rgba(113,113,122,0.08)"
          strokeWidth={1}
        />
        <Radar
          name="You"
          dataKey="You"
          stroke="#fb923c"
          fill="rgba(251,146,60,0.15)"
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(24,24,27,0.95)',
            border: '1px solid rgba(63,63,70,0.5)',
            borderRadius: '12px',
            padding: '8px 12px',
            fontSize: '12px',
            backdropFilter: 'blur(8px)',
          }}
          itemStyle={{ color: '#e4e4e7', padding: '2px 0' }}
          labelStyle={{ color: '#a1a1aa', fontWeight: 600, marginBottom: '4px' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
