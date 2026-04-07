import { ImageResponse } from 'next/og';
import { supabaseServer } from '@/lib/supabase-server';

export const alt = 'Go Viral - Results';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function getLetterGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#4ade80';
  if (score >= 60) return '#facc15';
  if (score >= 40) return '#fb923c';
  return '#f87171';
}

export default async function OGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let score = 42;
  let verdict = 'The AI agents have spoken. Your TikTok has been thoroughly roasted.';
  let topFinding = 'Multiple areas need immediate improvement.';

  try {
    const { data } = await supabaseServer
      .from('rmt_roast_sessions')
      .select('overall_score, verdict, result_json')
      .eq('id', id)
      .single();

    if (data) {
      score = data.overall_score ?? score;
      if (data.verdict) verdict = data.verdict.slice(0, 120);

      if (data.result_json?.agents?.length) {
        const agents: Array<{ score: number; findings: string[] }> = data.result_json.agents;
        const lowest = agents.slice().sort((a: { score: number }, b: { score: number }) => a.score - b.score)[0];
        if (lowest?.findings?.[0]) {
          topFinding = lowest.findings[0].slice(0, 90);
        }
      }
    }
  } catch { /* use defaults */ }

  const grade = getLetterGrade(score);
  const color = getScoreColor(score);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a00 50%, #0a0a0a 100%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '800px',
            height: '500px',
            background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.15) 0%, transparent 70%)',
          }}
        />

        {/* Logo */}
        <div
          style={{
            position: 'absolute',
            top: '32px',
            left: '48px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '28px' }}>🔥</span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#f97316' }}>
            Go Viral
          </span>
        </div>

        {/* Main content row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '64px',
            marginTop: '-20px',
          }}
        >
          {/* Score ring + grade column */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative', width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="180" height="180" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="90" cy="90" r="78" fill="none" stroke="#27272a" strokeWidth="10" />
                <circle
                  cx="90"
                  cy="90"
                  r="78"
                  fill="none"
                  stroke={color}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 78}`}
                  strokeDashoffset={`${2 * Math.PI * 78 - (score / 100) * 2 * Math.PI * 78}`}
                  style={{ filter: `drop-shadow(0 0 8px ${color})` }}
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '56px', fontWeight: 900, color, lineHeight: '1' }}>
                  {score}
                </span>
                <span style={{ fontSize: '14px', color: '#71717a' }}>/100</span>
              </div>
            </div>

            <div style={{ fontSize: '64px', fontWeight: 900, color: '#f97316', lineHeight: '1', textShadow: '0 0 20px rgba(249,115,22,0.6)' }}>
              {grade}
            </div>
          </div>

          {/* Right side text */}
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '580px', gap: '16px' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', lineHeight: '1.2' }}>
              {'My TikTok just got '}
              <span style={{ color: '#f97316' }}>roasted</span>
              {' by 6 AI agents'}
            </div>

            <div
              style={{
                fontSize: '16px',
                color: '#a1a1aa',
                lineHeight: '1.5',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '12px',
                padding: '16px 20px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {verdict.length > 110 ? verdict.slice(0, 110) + '…' : verdict}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '14px',
                color: '#a1a1aa',
              }}
            >
              <span>🔍</span>
              <span>
                {topFinding.length > 85 ? topFinding.slice(0, 85) + '…' : topFinding}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'linear-gradient(135deg, #f97316, #ec4899)',
            borderRadius: '50px',
            padding: '12px 28px',
          }}
        >
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
            🚀 Go Viral → goviralwith.ai
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
