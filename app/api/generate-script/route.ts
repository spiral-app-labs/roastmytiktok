import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { fetchTrendingContext, buildScriptTrendingContext } from '@/lib/trending-context';
import {
  type ScriptFormat,
  buildFormatExecutionBrief,
  resolveScriptFormat,
} from '@/lib/script-formats';

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
  formatId?: ScriptFormat;
  formatLabel?: string;
  formatReasoning?: string;
  creatorNotes?: string[];
  hook: string;
  scenes: ScriptScene[];
  onScreenText: string[];
  caption: string;
  hashtags: string[];
  audioSuggestion: string;
}

function normalizeScript(script: GeneratedScript, fallbackFormat: { id: ScriptFormat; label: string }): GeneratedScript {
  const creatorNotes = Array.isArray(script.creatorNotes)
    ? script.creatorNotes.filter(Boolean).slice(0, 4)
    : [];

  return {
    ...script,
    formatId: script.formatId && script.formatId !== 'generic' ? script.formatId : fallbackFormat.id,
    formatLabel: script.formatLabel || fallbackFormat.label,
    formatReasoning: script.formatReasoning || `Built for the ${fallbackFormat.label} format so the script structure matches how this kind of TikTok actually wins watch time.`,
    creatorNotes,
    scenes: Array.isArray(script.scenes)
      ? script.scenes.map((scene, index) => ({
          ...scene,
          number: typeof scene.number === 'number' ? scene.number : index + 1,
        }))
      : [],
    hashtags: Array.isArray(script.hashtags)
      ? script.hashtags.map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean)
      : [],
    onScreenText: Array.isArray(script.onScreenText) ? script.onScreenText.filter(Boolean) : [],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      roastScore,
      agentFeedback,
      weaknesses,
      userPrompt,
      format: formatId,
      niche,
      duration,
    }: {
      roastScore: number;
      agentFeedback: Array<{ agent: string; roastText: string; findings: string[]; improvementTip: string }>;
      weaknesses: string[];
      userPrompt?: string;
      format?: ScriptFormat;
      niche?: string;
      duration?: number;
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

    const trendingCtx = await fetchTrendingContext();
    const trendingSection = buildScriptTrendingContext(trendingCtx);

    const selectedFormat = resolveScriptFormat(formatId, niche, duration);
    const formatReason = formatId === 'generic' || !formatId
      ? `The creator chose auto mode, so you MUST use ${selectedFormat.label} because it best fits the niche/duration context.`
      : `The creator explicitly chose ${selectedFormat.label}, so commit to that structure hard.`;
    const formatSection = selectedFormat.promptSection
      ? `\n## FORMAT-SPECIFIC TEMPLATE:\n${selectedFormat.promptSection}\n\n## FORMAT EXECUTION BRIEF:\n${buildFormatExecutionBrief(selectedFormat)}\n${formatReason}\n\nYou MUST follow this format structure. Adapt the general guidelines below to fit this specific format.\n`
      : '';

    const prompt = `You are a TikTok growth strategist who's grown 5+ accounts past 100K followers. You've just received a brutal AI roast of a TikTok video that scored ${roastScore}/100. Your job: create a replacement script that fixes every weakness and is engineered for maximum algorithmic push.
${formatSection}
## Roast Score: ${roastScore}/100
${weaknessSummary}
${niche ? `Detected niche: ${niche}` : ''}
${duration ? `Original video duration: ${duration}s` : ''}

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
- Build in a mid-video retention hook at 40-60% mark — this is the "pattern interrupt" that stops viewers from scrolling. Use one of these: unexpected twist ("but here's the thing..."), reveal ("and this is where it gets crazy"), re-hook ("now forget everything I just said"), or visual pattern interrupt (sudden zoom, angle change, new prop)
- The mid-video hook is MANDATORY. It's the difference between 40% and 70% completion rate.
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

**Comment Bait — engineer the script to drive comments:**
- Include a Tier 1 comment bait pattern somewhere in the script:
  1. Binary Choice: "Which one — A or B?" (creates camps, drives debate)
  2. Controversial Take: "Unpopular opinion: [take]" (people comment to agree AND disagree)
  3. Fill-in-the-Blank: "Name a [category] that [opinion]. I'll go first..." (lowers barrier)
  4. Wrong Answer Hook: "Tell me [X] without telling me [X]" (competition to be funniest)
- Place the comment bait in the LAST 3 seconds or in the caption — not the middle
- The caption MUST include comment bait (a question, bold claim, or "am I wrong?")
- Never ask for comments explicitly ("comment below") — create a REASON to comment

**Audio Strategy:**
- Trending sound + voiceover = best of both worlds (algorithmic boost + original content)
- If original audio only, voice must be clear, energetic, and confident
- Voice at 80%, music at 20%

**Length — match to content type:**
- Comedy: 7-20s | Tutorial: 30-60s | Storytelling: 60-180s | Fitness: 15-45s

${trendingSection}

Respond with ONLY valid JSON in this exact structure (no markdown, no explanation):
{
  "formatId": "${selectedFormat.id}",
  "formatLabel": "${selectedFormat.label}",
  "formatReasoning": "1-2 sentences explaining why this format is the best vehicle for the rewrite.",
  "creatorNotes": [
    "3-4 practical filming notes that make this script easier to shoot well",
    "Mention the most important visual or pacing choice"
  ],
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
- 4-7 scenes covering the full video arc
- Scene 1 MUST be a Tier 1 hook (direct address, curiosity gap, problem-solution, or visual pattern interrupt) — combine visual + verbal for maximum stopping power
- One scene at the 40-60% mark MUST be an explicit mid-video retention hook (pattern interrupt). Label it clearly in the action field: "RETENTION HOOK: [type]". Use one of: unexpected twist, dramatic reveal, re-hook, or visual pattern interrupt
- The final scene should include a specific CTA matched to ${selectedFormat.contentType} content:
  - Tutorial/educational → "Save this for later" (drives saves = HIGH algorithm weight)
  - Funny/relatable → "Send this to someone who [specific trait]" (drives shares = HIGHEST organic signal)
  - Controversial/opinion → "Am I wrong? Tell me in the comments" (drives comments = HIGH algorithm weight)
  - Series content → "Follow for Part 2" (drives follows)
- On-screen text must work independently of audio (sound-off first design)
- Caption MUST include comment bait — write a specific question, bold claim, or binary choice that creates a REASON to comment. Never generic. Example: "Which method do you use — A or B? I already know the comments are gonna be split 😂"
- 5-8 hashtags: 3-5 niche-specific + 1-2 broad discovery tags (NOT just #fyp)
- Audio suggestion should specify trending vs original and the voice-to-music balance
- The script MUST include at least one Tier 1 comment bait pattern (binary choice, controversial take, fill-in-blank, or wrong answer hook) — place it in the LAST 3 seconds or in the caption
- The script should fix EVERY specific weakness identified in the roast
- Every scene should feel native to the ${selectedFormat.label} format. If a scene could belong to any format, rewrite it to be more format-specific.
- creatorNotes must be practical production guidance, not strategy fluff`;

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1800,
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
      const raw = textContent.text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      script = normalizeScript(JSON.parse(raw), {
        id: selectedFormat.id,
        label: selectedFormat.label,
      });
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
