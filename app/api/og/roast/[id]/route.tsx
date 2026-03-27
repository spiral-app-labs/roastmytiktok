import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/og/roast/[id]'>) {
  const { id } = await ctx.params;

  let score = 0;
  let worstQuote = 'Your TikTok got absolutely roasted.';
  let worstAgent = '';

  try {
    const { data } = await supabaseServer
      .from('rmt_roast_sessions')
      .select('overall_score, result_json')
      .eq('id', id)
      .single();

    if (data) {
      score = data.overall_score ?? 0;

      if (data.result_json?.agents) {
        const agents = data.result_json.agents as Array<{
          agent: string;
          score: number;
          roastText: string;
        }>;
        const worst = agents.reduce((min, a) => a.score < min.score ? a : min, agents[0]);
        if (worst) {
          worstQuote = worst.roastText.slice(0, 120);
          worstAgent = worst.agent;
        }
      }
    }
  } catch { /* use defaults */ }

  const scoreColor = score >= 80 ? '#4ade80' : score >= 60 ? '#facc15' : score >= 40 ? '#fb923c' : '#f87171';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 40%, #0a0a0a 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Fire gradient accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'linear-gradient(90deg, #ff6b35, #f72585, #ff006e)',
            display: 'flex',
          }}
        />

        {/* Score */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '30px',
          }}
        >
          <div
            style={{
              fontSize: '120px',
              fontWeight: 'bold',
              color: scoreColor,
              lineHeight: 1,
              display: 'flex',
            }}
          >
            {score}
          </div>
          <div
            style={{
              fontSize: '24px',
              color: '#71717a',
              marginTop: '8px',
              display: 'flex',
            }}
          >
            / 100
          </div>
        </div>

        {/* Worst roast quote */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '800px',
            padding: '0 40px',
          }}
        >
          {worstAgent && (
            <div
              style={{
                fontSize: '16px',
                color: '#f87171',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                display: 'flex',
              }}
            >
              Worst Score: {worstAgent}
            </div>
          )}
          <div
            style={{
              fontSize: '22px',
              color: '#d4d4d8',
              textAlign: 'center',
              lineHeight: 1.5,
              fontStyle: 'italic',
              display: 'flex',
            }}
          >
            &ldquo;{worstQuote}&rdquo;
          </div>
        </div>

        {/* Watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              fontSize: '18px',
              background: 'linear-gradient(135deg, #ff6b35, #f72585)',
              backgroundClip: 'text',
              color: '#ff6b35',
              fontWeight: 'bold',
              display: 'flex',
            }}
          >
            roastmytiktok.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
