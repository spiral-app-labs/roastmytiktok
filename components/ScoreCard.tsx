'use client';

import { forwardRef } from 'react';
import { RoastResult } from '@/lib/types';
import { AGENTS } from '@/lib/agents';

function getScoreColor(score: number): string {
  if (score >= 70) return '#4ade80'; // green-400
  if (score >= 50) return '#facc15'; // yellow-400
  return '#f87171'; // red-400
}

function getRingColor(score: number): string {
  if (score >= 80) return '#4ade80';
  if (score >= 60) return '#facc15';
  if (score >= 40) return '#fb923c';
  return '#f87171';
}

export type ScoreCardVariant = 'square' | 'story';

interface ScoreCardProps {
  roast: RoastResult;
  variant?: ScoreCardVariant;
}

/**
 * ScoreCard - captured by html-to-image; uses only inline styles
 * so that the DOM snapshot is fully self-contained.
 */
export const ScoreCard = forwardRef<HTMLDivElement, ScoreCardProps>(
  ({ roast, variant = 'square' }, ref) => {
    const isStory = variant === 'story';
    const ringColor = getRingColor(roast.overallScore);

    // Outer card dimensions
    const width = isStory ? 1080 : 1080;
    const height = isStory ? 1920 : 1080;
    const scale = isStory ? 1 : 1;

    const containerStyle: React.CSSProperties = {
      width,
      height,
      background: '#080808',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: isStory ? 'flex-start' : 'center',
      paddingTop: isStory ? 180 : 0,
      boxSizing: 'border-box',
    };

    // Gradient orbs
    const orb1Style: React.CSSProperties = {
      position: 'absolute',
      top: isStory ? -120 : -80,
      left: '50%',
      transform: 'translateX(-50%)',
      width: isStory ? 900 : 800,
      height: isStory ? 600 : 500,
      borderRadius: '50%',
      background:
        'radial-gradient(ellipse at center, rgba(251,146,60,0.22) 0%, rgba(236,72,153,0.10) 45%, transparent 70%)',
      filter: 'blur(60px)',
      pointerEvents: 'none',
    };

    const orb2Style: React.CSSProperties = {
      position: 'absolute',
      bottom: isStory ? 200 : -100,
      right: isStory ? -100 : -100,
      width: 500,
      height: 500,
      borderRadius: '50%',
      background:
        'radial-gradient(ellipse at center, rgba(236,72,153,0.18) 0%, transparent 65%)',
      filter: 'blur(80px)',
      pointerEvents: 'none',
    };

    // Inner card
    const innerPadding = isStory ? 80 : 72;
    const innerWidth = isStory ? 900 : 940;

    const innerCardStyle: React.CSSProperties = {
      position: 'relative',
      zIndex: 1,
      width: innerWidth,
      borderRadius: 40,
      padding: `2px`,
      background: 'linear-gradient(135deg, rgba(251,146,60,0.55) 0%, rgba(39,39,42,0.4) 50%, rgba(236,72,153,0.55) 100%)',
      boxShadow: '0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
    };

    const innerContentStyle: React.CSSProperties = {
      borderRadius: 38,
      background: 'rgba(9,9,11,0.97)',
      padding: `${innerPadding}px`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: isStory ? 52 : 44,
    };

    // Brand strip
    const brandStripStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      width: '100%',
    };

    const logoStyle: React.CSSProperties = {
      width: isStory ? 56 : 48,
      height: isStory ? 56 : 48,
      borderRadius: 14,
      background: 'linear-gradient(135deg, #fb923c, #ec4899)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: isStory ? 28 : 24,
      flexShrink: 0,
    };

    const brandTextStyle: React.CSSProperties = {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    };

    const brandNameStyle: React.CSSProperties = {
      fontSize: isStory ? 28 : 22,
      fontWeight: 800,
      color: '#ffffff',
      letterSpacing: '-0.01em',
      lineHeight: 1,
    };

    const brandUrlStyle: React.CSSProperties = {
      fontSize: isStory ? 20 : 16,
      color: '#71717a',
      fontWeight: 500,
      letterSpacing: '0.02em',
    };

    const tagStyle: React.CSSProperties = {
      padding: '8px 18px',
      borderRadius: 100,
      background: 'rgba(251,146,60,0.12)',
      border: '1px solid rgba(251,146,60,0.25)',
      fontSize: isStory ? 20 : 16,
      fontWeight: 700,
      color: '#fb923c',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
    };

    // Score hero
    const scoreHeroStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: isStory ? 24 : 20,
      width: '100%',
    };

    const ringSize = isStory ? 280 : 240;

    const ringContainerStyle: React.CSSProperties = {
      position: 'relative',
      width: ringSize,
      height: ringSize,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };

    const ringBgStyle: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      borderRadius: '50%',
      background: `conic-gradient(${ringColor} 0deg, ${ringColor} ${roast.overallScore * 3.6}deg, rgba(39,39,42,0.6) ${roast.overallScore * 3.6}deg 360deg)`,
    };

    const ringInnerStyle: React.CSSProperties = {
      position: 'absolute',
      inset: isStory ? 16 : 14,
      borderRadius: '50%',
      background: 'rgba(9,9,11,0.97)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    };

    const scoreNumStyle: React.CSSProperties = {
      fontSize: isStory ? 88 : 76,
      fontWeight: 900,
      color: ringColor,
      lineHeight: 1,
      letterSpacing: '-0.04em',
    };

    const scoreOfStyle: React.CSSProperties = {
      fontSize: isStory ? 22 : 18,
      color: '#52525b',
      fontWeight: 600,
    };

    // Verdict
    const verdictStyle: React.CSSProperties = {
      fontSize: isStory ? 26 : 22,
      color: '#a1a1aa',
      textAlign: 'center',
      lineHeight: 1.5,
      maxWidth: isStory ? 720 : 680,
      padding: `0 ${isStory ? 0 : 0}px`,
    };

    // Agent scores row
    const agentRowStyle: React.CSSProperties = {
      display: 'flex',
      flexWrap: 'wrap',
      gap: isStory ? 16 : 14,
      justifyContent: 'center',
      width: '100%',
    };

    const agentBadgeStyle = (score: number): React.CSSProperties => ({
      display: 'flex',
      alignItems: 'center',
      gap: isStory ? 12 : 10,
      padding: isStory ? '16px 24px' : '14px 20px',
      borderRadius: isStory ? 20 : 16,
      background: 'rgba(24,24,27,0.9)',
      border: `1px solid rgba(39,39,42,0.8)`,
      minWidth: isStory ? 180 : 155,
    });

    const agentEmojiStyle: React.CSSProperties = {
      fontSize: isStory ? 28 : 24,
      lineHeight: 1,
    };

    const agentScoreTextStyle = (score: number): React.CSSProperties => ({
      fontSize: isStory ? 26 : 22,
      fontWeight: 800,
      color: getScoreColor(score),
      lineHeight: 1,
    });

    const agentNameTextStyle: React.CSSProperties = {
      fontSize: isStory ? 16 : 14,
      color: '#71717a',
      fontWeight: 500,
      lineHeight: 1,
    };

    // Divider
    const dividerStyle: React.CSSProperties = {
      width: '100%',
      height: 1,
      background: 'linear-gradient(90deg, transparent, rgba(39,39,42,0.8) 20%, rgba(39,39,42,0.8) 80%, transparent)',
    };

    // Footer
    const footerStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
    };

    const footerLeftStyle: React.CSSProperties = {
      fontSize: isStory ? 20 : 17,
      color: '#3f3f46',
      fontWeight: 500,
    };

    const footerRightStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 20px',
      borderRadius: 100,
      background: 'linear-gradient(135deg, rgba(251,146,60,0.15), rgba(236,72,153,0.15))',
      border: '1px solid rgba(251,146,60,0.2)',
    };

    const footerRightTextStyle: React.CSSProperties = {
      fontSize: isStory ? 20 : 17,
      fontWeight: 700,
      background: 'linear-gradient(90deg, #fb923c, #ec4899)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    };

    return (
      <div ref={ref} style={containerStyle}>
        {/* Gradient orbs */}
        <div style={orb1Style} />
        <div style={orb2Style} />

        <div style={innerCardStyle}>
          <div style={innerContentStyle}>
            {/* Brand strip */}
            <div style={brandStripStyle}>
              <div style={logoStyle}>🔥</div>
              <div style={brandTextStyle}>
                <div style={brandNameStyle}>Go Viral</div>
                <div style={brandUrlStyle}>goviralwith.ai</div>
              </div>
              <div style={tagStyle}>AI Analysis</div>
            </div>

            <div style={dividerStyle} />

            {/* Score hero */}
            <div style={scoreHeroStyle}>
              <div style={ringContainerStyle}>
                <div style={ringBgStyle} />
                <div style={ringInnerStyle}>
                  <div style={scoreNumStyle}>{roast.overallScore}</div>
                  <div style={scoreOfStyle}>/ 100</div>
                </div>
              </div>

              <div style={verdictStyle}>{roast.verdict}</div>
            </div>

            <div style={dividerStyle} />

            {/* Agent scores */}
            <div style={agentRowStyle}>
              {roast.agents.map((a) => {
                const agent = AGENTS.find((ag) => ag.key === a.agent);
                return (
                  <div key={a.agent} style={agentBadgeStyle(a.score)}>
                    <span style={agentEmojiStyle}>{agent?.emoji}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={agentScoreTextStyle(a.score)}>{a.score}</div>
                      <div style={agentNameTextStyle}>
                        {agent?.displayName ?? a.agent}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={dividerStyle} />

            {/* Footer */}
            <div style={footerStyle}>
              <div style={footerLeftStyle}>analyzed by goviralwith.ai</div>
              <div style={footerRightStyle}>
                <span style={{ fontSize: isStory ? 20 : 17 }}>🔥</span>
                <span style={footerRightTextStyle}>goviralwith.ai</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ScoreCard.displayName = 'ScoreCard';
