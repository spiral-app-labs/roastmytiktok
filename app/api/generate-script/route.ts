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

    const prompt = `You are a TikTok growth strategist who's grown 5+ accounts past 100K followers. You've just received a brutal AI roast of a TikTok video that scored ${roastScore}/100. Your job: create a replacement script that fixes every weakness and is engineered for maximum algorithmic push.

## Roast Score: ${roastScore}/100
${weaknessSummary}

## Agent Feedback:
${feedbackSummary}
${userContext}

USE THIS RESEARCH TO BUILD THE SCRIPT:

**Hook (first 1-3 seconds) — use Tier 1 hooks ONLY:**
1. Direct Address/Call-Out: "If you [specific trait], stop scrolling!" — highest conversion
2. Curiosity Gap: "Here's what nobody tells you about..." — exploits need for completion
3. Problem-Solution Promise: "How I did X in [short time]" — immediate value signal
4. Visual Pattern Interrupt: Unexpected motion, dramatic entrance — works even without sound
- COMBINE visual + verbal hooks — combination outperforms either alone
- 63% of highest-CTR videos hook within 3 seconds

**Structure — engineer for watch time (the #1 algorithm signal):**
- Build in a mid-video retention hook at 30-40% mark (reveal, twist, "but here's the thing...")
- End should loop into the beginning OR create a cliffhanger
- Completion rate above 50% is the viral threshold
- Every second must earn its place — no padding

**On-Screen Text — 80% of TikTok is watched sound-off:**
- Burned-in captions with high contrast (white text, black outline)
- Keyword color highlighting on 1-2 key words per overlay
- Text must carry the message independently of audio
- Keep text in safe zones (not right side where buttons are, not bottom where caption sits)

**CTA — one per video, matched to content type:**
- Tutorial → "Save this for later" (drives saves = HIGH algorithm weight)
- Funny/relatable → "Share with someone who does this" (drives shares = HIGHEST organic signal)
- Controversial take → "Am I wrong?" (drives comments = HIGH algorithm weight)
- Series → "Follow for Part 2"
- Place CTA mid-video (higher conversion) or as persistent on-screen text

**Audio Strategy:**
- Trending sound + voiceover = best of both worlds (algorithmic boost + original content)
- If original audio only, voice must be clear, energetic, and confident
- Voice at 80%, music at 20%

**Length — match to content type:**
- Comedy: 7-20s | Tutorial: 30-60s | Storytelling: 60-180s | Fitness: 15-45s

Respond with ONLY valid JSON in this exact structure (no markdown, no explanation):
{
  "hook": "The first 1-3 seconds — MUST be a Tier 1 hook type. Write the exact words + describe the visual action.",
  "scenes": [
    {
      "number": 1,
      "action": "What the creator does physically on camera (be specific — 'leans into camera with wide eyes' not 'looks at camera')",
      "timing": "0-3s",
      "dialogue": "Exact words to say (or 'No dialogue' if visual only)"
    }
  ],
  "onScreenText": [
    "Text overlay with specific timing note — e.g. '0-3s: YOUR HOOK TEXT HERE (bold, white, black outline)'",
    "Include a persistent CTA overlay for the final 3-5 seconds"
  ],
  "caption": "The TikTok caption — should drive comments OR saves. Under 150 chars. Include a question or controversial statement.",
  "hashtags": ["3-5 niche-specific hashtags", "plus 1-2 broader discovery hashtags"],
  "audioSuggestion": "Specific audio strategy: trending sound name if applicable, or describe the exact vibe + energy level for original audio. Note voice-to-music ratio."
}

Requirements:
- 4-7 scenes covering the full video arc with a mid-video retention hook
- Hook MUST be Tier 1 (direct address, curiosity gap, problem-solution, or visual pattern interrupt)
- On-screen text must work independently of audio (sound-off first design)
- Caption should include comment bait (a question, bold claim, or "am I wrong?")
- 5-8 hashtags: 3-5 niche-specific + 1-2 broad discovery tags (NOT just #fyp)
- Audio suggestion should specify trending vs original and the voice-to-music balance
- The script should fix EVERY specific weakness identified in the roast`;

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
