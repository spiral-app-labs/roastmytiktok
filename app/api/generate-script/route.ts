import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ScriptScene {
  number: number;
  action: string;
  timing: string;
  dialogue: string;
}

export interface GeneratedScript {
  hook: string;
  scenes: ScriptScene[];
  onScreenText: string[];
  caption: string;
  hashtags: string[];
  audioSuggestion: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      roastScore,
      agentFeedback,
      weaknesses,
      userPrompt,
    }: {
      roastScore: number;
      agentFeedback: Array<{ agent: string; roastText: string; findings: string[]; improvementTip: string }>;
      weaknesses: string[];
      userPrompt?: string;
    } = body;

    if (!roastScore || !agentFeedback || !Array.isArray(agentFeedback)) {
      return Response.json({ error: 'roastScore and agentFeedback are required' }, { status: 400 });
    }

    const feedbackSummary = agentFeedback
      .map((f) => `**${f.agent}** (roast: "${f.roastText.slice(0, 120)}...")\nFindings: ${f.findings.join('; ')}\nTip: ${f.improvementTip}`)
      .join('\n\n');

    const weaknessSummary = weaknesses?.length
      ? `Key weaknesses identified: ${weaknesses.join(', ')}`
      : '';

    const userContext = userPrompt
      ? `\n\nCreator's specific request: ${userPrompt}`
      : '';

    const prompt = `You are an elite TikTok content strategist who has helped creators go from 0 to millions of views. You've just received a brutal AI roast of a TikTok video that scored ${roastScore}/100. Your job is to create an optimized replacement script that directly addresses every weakness found.

## Roast Score: ${roastScore}/100
${weaknessSummary}

## Agent Feedback:
${feedbackSummary}
${userContext}

Generate a complete, optimized TikTok script that fixes all the identified problems. The script should be realistic, creator-friendly, and designed for maximum engagement.

Respond with ONLY valid JSON in this exact structure (no markdown, no explanation):
{
  "hook": "The first 1-3 seconds hook line that immediately grabs attention and creates curiosity",
  "scenes": [
    {
      "number": 1,
      "action": "What the creator does physically on camera",
      "timing": "0-3s",
      "dialogue": "Exact words to say (or 'No dialogue' if visual only)"
    }
  ],
  "onScreenText": [
    "Text overlay line 1",
    "Text overlay line 2"
  ],
  "caption": "The full TikTok caption (under 150 chars ideally)",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
  "audioSuggestion": "Description of the ideal audio/music vibe for this video"
}

Requirements:
- 4-7 scenes covering the full video arc
- Hook must be ultra-specific and pattern-interrupting
- On-screen text should reinforce key moments (2-4 overlays)
- Caption should drive comments/saves
- 5-8 hashtags mixing niche + broad
- Audio suggestion should match the energy and content type`;

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return Response.json({ error: 'No response from Claude' }, { status: 500 });
    }

    let script: GeneratedScript;
    try {
      // Strip any markdown code fences if present
      const raw = textContent.text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      script = JSON.parse(raw);
    } catch {
      console.error('[generate-script] Failed to parse Claude response:', textContent.text);
      return Response.json({ error: 'Failed to parse script response' }, { status: 500 });
    }

    return Response.json({ script });
  } catch (err) {
    console.error('[generate-script] Error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
