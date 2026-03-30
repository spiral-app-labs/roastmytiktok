import type { AgentRoast, RoastResult } from '@/lib/types';

export type HoldBand = 'weak' | 'mixed' | 'strong';
export type RiskBand = 'high' | 'medium' | 'low';

export interface HoldAssessment {
  holdBand: HoldBand;
  riskBand: RiskBand;
  headline: string;
  summary: string;
  reasons: string[];
}

export interface HookWorkshop {
  openerLine: string;
  diagnosis: string[];
  rewrites: Array<{
    label: string;
    line: string;
    whyItWorks: string;
  }>;
}

export interface ReshootPlanStep {
  label: string;
  direction: string;
  detail: string;
}

export interface FirstGlanceCheckItem {
  label: string;
  status: 'working' | 'needs-work';
  note: string;
}

export interface HookTypeLens {
  key: 'visual' | 'spoken' | 'text' | 'motion' | 'curiosity' | 'attractiveness';
  label: string;
  score: number;
  status: 'working' | 'needs-work';
  whatItMeans: string;
  note: string;
  fix: string;
}

export function getHookWorkshop(roast: RoastResult): HookWorkshop {
  const hook = getAgent(roast, 'hook');
  const visual = getAgent(roast, 'visual');
  const openerLine = getOpeningLine(roast);
  const topic = inferTopic(roast, openerLine);
  const rewriteSeed = sanitizeRewriteSource(
    roast.actionPlan?.find((step) => step.dimension === 'hook')?.example ||
      roast.actionPlan?.find((step) => step.priority === 'P1')?.example ||
      hook?.improvementTip ||
      hook?.findings?.[0] ||
      `lead with the result people want from ${topic}`
  );

  const diagnosis = [
    roast.hookSummary?.headline,
    hook?.findings?.[0],
    hook?.findings?.[1],
    visual?.findings?.[0],
  ]
    .map(clean)
    .filter(Boolean)
    .slice(0, 3);

  return {
    openerLine,
    diagnosis,
    rewrites: [
      {
        label: 'direct call-out',
        line: normalizeLine(`if you're stuck at 200 views on ${topic}, start here: ${rewriteSeed}`),
        whyItWorks: 'calls out the exact creator who should stop scrolling and gives them a reason to care instantly.',
      },
      {
        label: 'problem + promise',
        line: normalizeLine(`your ${topic} videos keep dying early because ${trimSentence(rewriteSeed)}. here's the fix.`),
        whyItWorks: 'names the pain fast, then promises a concrete payoff instead of easing into the topic.',
      },
      {
        label: 'result-first reshoot',
        line: normalizeLine(`before you explain anything, show the strongest moment and say: "${trimSentence(rewriteSeed)}"`),
        whyItWorks: 'puts proof before setup so the viewer sees value before they have a chance to swipe.',
      },
    ],
  };
}

export function getReshootPlanner(roast: RoastResult): ReshootPlanStep[] {
  const openerLine = getOpeningLine(roast);
  const hookRewrite = getHookWorkshop(roast).rewrites[0]?.line || 'lead with the strongest claim immediately.';
  const visualFinding = clean(getAgent(roast, 'visual')?.findings?.[0]) || 'nothing in frame one is forcing a pause yet.';
  const captionFinding = clean(getAgent(roast, 'caption')?.findings?.[0]) || 'the text payoff is not clear in frame one.';

  return [
    {
      label: 'shot 1',
      direction: 'open on the payoff, not the setup',
      detail: clean(`start in a tighter frame with motion in the first second. if possible, show the finished result, strongest reaction, or most surprising visual before you explain. current issue: ${visualFinding}`),
    },
    {
      label: 'spoken line',
      direction: 'replace the soft intro',
      detail: openerLine !== 'No spoken opener detected in the first beat.'
        ? `replace "${openerLine}" with "${hookRewrite}"`
        : `add a spoken opener immediately: "${hookRewrite}"`,
    },
    {
      label: 'on-screen text',
      direction: 'make frame one readable on mute',
      detail: clean(`put one bold line on screen in frame one that mirrors the hook. keep it short enough to read instantly. current issue: ${captionFinding}`),
    },
    {
      label: 'edit note',
      direction: 'cut the throat-clearing',
      detail: 'remove any pause, greeting, or camera-settling beat before the first claim lands. the viewer should understand the promise within the first 1 to 2 seconds.',
    },
  ];
}

export function getHoldAssessment(roast: RoastResult): HoldAssessment {
  const hookScore = getAgent(roast, 'hook')?.score ?? roast.hookSummary?.score ?? 50;
  const visualScore = getAgent(roast, 'visual')?.score ?? 50;
  const audioScore = getAgent(roast, 'audio')?.score ?? 50;
  const captionScore = getAgent(roast, 'caption')?.score ?? 50;
  const blended = Math.round(hookScore * 0.5 + visualScore * 0.2 + audioScore * 0.15 + captionScore * 0.15);

  const holdBand: HoldBand = blended < 55 ? 'weak' : blended < 75 ? 'mixed' : 'strong';
  const riskBand: RiskBand = holdBand === 'weak' ? 'high' : holdBand === 'mixed' ? 'medium' : 'low';

  const reasons = [
    roast.hookSummary?.distributionRisk,
    getAgent(roast, 'hook')?.findings?.[0],
    getAgent(roast, 'visual')?.findings?.[0],
    getAgent(roast, 'audio')?.findings?.[0],
  ]
    .map(clean)
    .filter(Boolean)
    .slice(0, 3);

  return {
    holdBand,
    riskBand,
    headline:
      holdBand === 'strong'
        ? 'this opening is giving the video a real chance'
        : holdBand === 'mixed'
          ? 'this opening has a shot, but it is leaking attention early'
          : 'this opening is likely losing people before the value lands',
    summary:
      riskBand === 'low'
        ? 'we are not pretending to know your exact watch time. this just means the first beats are doing enough right that later fixes can matter.'
        : riskBand === 'medium'
          ? 'there is enough here to work with, but the first seconds still feel fragile. a stronger opener could materially improve distribution.'
          : 'high drop-off risk means the app sees obvious early-friction signals. fix the opening before you spend energy polishing the back half.',
    reasons,
  };
}

export function getFirstGlanceChecks(roast: RoastResult): FirstGlanceCheckItem[] {
  const hook = getAgent(roast, 'hook');
  const visual = getAgent(roast, 'visual');
  const caption = getAgent(roast, 'caption');

  return [
    {
      label: 'scroll-stop signal',
      status: (hook?.score ?? 0) >= 70 ? 'working' : 'needs-work',
      note: clean(hook?.findings?.[0]) || 'the opening is not clearly giving a stranger a reason to pause yet.',
    },
    {
      label: 'frame-one clarity',
      status: (visual?.score ?? 0) >= 65 ? 'working' : 'needs-work',
      note: clean(visual?.findings?.[0]) || 'frame one is not visually distinct enough to do much work on mute.',
    },
    {
      label: 'mute-mode message',
      status: (caption?.score ?? 0) >= 65 ? 'working' : 'needs-work',
      note: clean(caption?.findings?.[0]) || 'the first-screen message is not readable or obvious enough without sound.',
    },
  ];
}

export function getHookTypeLenses(roast: RoastResult): HookTypeLens[] {
  const hook = getAgent(roast, 'hook');
  const visual = getAgent(roast, 'visual');
  const audio = getAgent(roast, 'audio');
  const caption = getAgent(roast, 'caption');

  const visualScore = visual?.score ?? 50;
  const spokenScore = audio?.score ?? hook?.score ?? 50;
  const textScore = caption?.score ?? 50;
  const motionScore = Math.round(((visual?.score ?? 50) * 0.6) + ((audio?.score ?? 50) * 0.4));
  const curiosityScore = hook?.score ?? 50;
  const attractivenessScore = Math.round(((visual?.score ?? 50) * 0.7) + ((hook?.score ?? 50) * 0.3));

  return [
    {
      key: 'visual',
      label: 'visual hook',
      score: visualScore,
      status: visualScore >= 65 ? 'working' : 'needs-work',
      whatItMeans: 'does frame one look different enough to stop the thumb on mute?',
      note: clean(visual?.findings?.[0]) || 'the first frame still looks too ordinary to earn a pause.',
      fix: 'open tighter, brighter, or with the payoff already on screen so the viewer gets the point before the explanation starts.',
    },
    {
      key: 'spoken',
      label: 'spoken hook',
      score: spokenScore,
      status: spokenScore >= 65 ? 'working' : 'needs-work',
      whatItMeans: 'does the first sentence land as a claim instead of a warm-up?',
      note: clean(audio?.findings?.[0]) || clean(hook?.findings?.[0]) || 'the spoken opener is taking too long to promise value.',
      fix: 'cut greetings and context. start with the sharpest opinion, result, or pain point in the first sentence.',
    },
    {
      key: 'text',
      label: 'text hook',
      score: textScore,
      status: textScore >= 65 ? 'working' : 'needs-work',
      whatItMeans: 'can a silent scroller understand the promise from the on-screen words instantly?',
      note: clean(caption?.findings?.[0]) || 'the on-screen text is not doing enough work for viewers who never unmute.',
      fix: 'put one bold, readable promise on screen in frame one instead of stacking multiple ideas.',
    },
    {
      key: 'motion',
      label: 'motion hook',
      score: motionScore,
      status: motionScore >= 65 ? 'working' : 'needs-work',
      whatItMeans: 'is there immediate movement or change that makes the opening feel alive?',
      note: clean(visual?.findings?.[1]) || clean(audio?.findings?.[1]) || 'the opener settles in too slowly and gives the viewer time to swipe.',
      fix: 'start on the action, cut the camera-settling beat, and make the first half-second feel in-progress, not preamble.',
    },
    {
      key: 'curiosity',
      label: 'curiosity hook',
      score: curiosityScore,
      status: curiosityScore >= 70 ? 'working' : 'needs-work',
      whatItMeans: 'is there a clear tension, surprise, or payoff gap that pulls people into the next second?',
      note: clean(hook?.findings?.[0]) || 'there is not enough tension or payoff promised up front yet.',
      fix: 'name the problem or surprising result first, then make the viewer need the explanation.',
    },
    {
      key: 'attractiveness',
      label: 'attractiveness hook',
      score: attractivenessScore,
      status: attractivenessScore >= 65 ? 'working' : 'needs-work',
      whatItMeans: 'does the opener feel polished, intentional, and worth giving attention to?',
      note: clean(visual?.findings?.[2]) || 'the opening does not yet feel premium or magnetic enough to earn a second chance.',
      fix: 'clean up the framing, lighting, styling, or crop so the opener feels deliberate before the message even lands.',
    },
  ];
}

function getAgent(roast: RoastResult, key: AgentRoast['agent']) {
  return roast.agents.find((agent) => agent.agent === key);
}

function getOpeningLine(roast: RoastResult): string {
  const line = roast.audioSegments?.find((segment) => clean(segment.text))?.text || roast.audioTranscript;
  return clean(line) || 'No spoken opener detected in the first beat.';
}

function inferTopic(roast: RoastResult, openerLine: string): string {
  const description = clean(roast.metadata?.description);
  const transcriptSeed = clean(openerLine)
    .replace(/^"|"$/g, '')
    .split(' ')
    .slice(0, 8)
    .join(' ');
  return description || transcriptSeed || 'this topic';
}

function sanitizeRewriteSource(value: string): string {
  return trimSentence(clean(value).replace(/^example:\s*/i, '').replace(/^replace\s+/i, ''));
}

function trimSentence(value: string): string {
  return clean(value).replace(/^"|"$/g, '').replace(/[.]+$/g, '');
}

function normalizeLine(value: string): string {
  return clean(value).replace(/\s+/g, ' ');
}

function clean(value?: string | null): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}
