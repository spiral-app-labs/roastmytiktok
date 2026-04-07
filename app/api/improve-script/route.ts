import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { fetchTrendingContext, buildScriptTrendingContext } from '@/lib/trending-context';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ScriptChange {
  section: string;
  original: string;
  improved: string;
  reason: string;
  severity: 'critical' | 'recommended' | 'optional';
}

export interface ImprovedScript {
  original: string;
  improved: string;
  changes: ScriptChange[];
  summary: string;
  voice_notes: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { script, focus_area, niche_context } = body as {
      script: string;
      focus_area?: 'hook' | 'pacing' | 'cta' | 'overall' | 'all';
      niche_context?: string;
    };

    if (!script || script.trim().length < 10) {
      return Response.json({ error: 'Script text is required (minimum 10 characters)' }, { status: 400 });
    }

    const trendingCtx = await fetchTrendingContext();
    const trendingSection = buildScriptTrendingContext(trendingCtx);

    const focusInstructions: Record<string, string> = {
      hook: 'Focus primarily on the hook/opening (first 1-3 seconds). Make it a Tier 1 hook that stops the scroll. Keep the rest mostly intact unless it directly undermines the hook.',
      pacing: 'Focus on pacing and flow. Add retention hooks, remove dead air, tighten transitions. Ensure the mid-video hook is present and strong.',
      cta: 'Focus on the call-to-action. Make it specific, matched to content type, and placed effectively. Also improve caption for engagement.',
      overall: 'Improve everything - hook, pacing, CTA, caption, and overall structure. Be comprehensive.',
      all: 'Improve everything - hook, pacing, CTA, caption, and overall structure. Be comprehensive.',
    };

    const focus = focus_area || 'overall';
    const focusText = focusInstructions[focus] || focusInstructions.overall;

    const nicheSection = niche_context
      ? `\n\nNICHE CONTEXT:\n${niche_context}\nUse this niche intelligence to inform your improvements.`
      : '';

    const prompt = `You are a TikTok script doctor who has helped creators go from 0 to 100K+ followers. Your job is to improve a TikTok script while preserving the creator's authentic voice.

## FOCUS AREA
${focusText}

## ORIGINAL SCRIPT
${script}
${nicheSection}
${trendingSection}

## RULES
1. PRESERVE the creator's voice and personality - analyze their writing style (formal/casual, humor type, energy level) and maintain it
2. Every change must have a clear reason tied to TikTok performance data
3. Mark each change with severity: "critical" (must fix - will significantly hurt performance), "recommended" (should fix - measurable improvement), "optional" (nice to have - marginal gain)
4. The improved script must be a complete, ready-to-use replacement
5. Include a Tier 1 hook if the original doesn't have one
6. Ensure a mid-video retention hook exists
7. Ensure the CTA is specific and matched to content type

Respond with ONLY valid JSON:
{
  "original": "the original script exactly as provided",
  "improved": "the complete improved script, ready to use",
  "changes": [
    {
      "section": "hook|scene|pacing|cta|caption|hashtags|audio|structure",
      "original": "the original text for this section",
      "improved": "the improved text for this section",
      "reason": "specific reason this change improves TikTok performance (reference data or algorithm behavior)",
      "severity": "critical|recommended|optional"
    }
  ],
  "summary": "2-3 sentence summary of the key improvements and expected impact",
  "voice_notes": "brief note on the creator's detected voice/style and how you preserved it"
}

Requirements:
- At least 3 changes, each with clear severity and reason
- Changes sorted by severity (critical first)
- The "improved" field must be a complete script, not just the changed parts
- Keep the voice_notes concise but specific`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = message.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return Response.json({ error: 'No AI response' }, { status: 500 });
    }

    let result: ImprovedScript;
    try {
      const raw = textContent.text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      result = JSON.parse(raw);
    } catch {
      console.error('[improve-script] Failed to parse response:', textContent.text);
      return Response.json({ error: 'Failed to parse improvement response' }, { status: 500 });
    }

    // Sort changes by severity
    const severityOrder = { critical: 0, recommended: 1, optional: 2 };
    result.changes.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return Response.json({ result });
  } catch (err) {
    console.error('[improve-script] Error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
