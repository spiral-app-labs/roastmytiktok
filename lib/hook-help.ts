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

export interface HookRewriteWorkflowStep {
  label: string;
  instruction: string;
  detail: string;
}

export interface HookRewriteWorkflow {
  headline: string;
  summary: string;
  steps: HookRewriteWorkflowStep[];
}

export interface ReshootPlanStep {
  label: string;
  direction: string;
  detail: string;
}

export interface ReshootTake {
  label: string;
  spokenLine: string;
  visual: string;
  textOverlay: string;
  whyItWorks: string;
}

export interface FirstGlanceCheckItem {
  label: string;
  status: 'working' | 'needs-work';
  note: string;
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

export function getHookRewriteWorkflow(roast: RoastResult): HookRewriteWorkflow {
  const workshop = getHookWorkshop(roast);
  const openerLine = workshop.openerLine;
  const bestRewrite = workshop.rewrites[0]?.line || 'lead with the clearest promise immediately.';
  const visualFinding = clean(getAgent(roast, 'visual')?.findings?.[0]) || 'frame one does not feel visually urgent yet.';
  const captionFinding = clean(getAgent(roast, 'caption')?.findings?.[0]) || 'the mute-mode message is still too soft in the opening beat.';
  const hookFinding = clean(getAgent(roast, 'hook')?.findings?.[0]) || 'the current opener is not giving a cold viewer a reason to stop.';

  const openerNeedsReplacement = openerLine !== 'No spoken opener detected in the first beat.';

  return {
    headline: 'rewrite the hook in four moves',
    summary: 'this is not a prediction engine. it is a practical rewrite pass that strips the weak setup and gives you a sharper first beat to test.',
    steps: [
      {
        label: '1. keep the real promise',
        instruction: 'name the payoff before the explanation',
        detail: clean(`anchor the rewrite around the clearest outcome or tension in the video. current evidence: ${hookFinding}`),
      },
      {
        label: '2. kill the soft opening',
        instruction: openerNeedsReplacement ? `cut this line: "${openerLine}"` : 'do not add a greeting or warm-up line',
        detail: 'anything that sounds like throat-clearing, context-setting, or a polite intro belongs after the viewer is already hooked.',
      },
      {
        label: '3. rebuild the first sentence',
        instruction: `test this version first: "${bestRewrite}"`,
        detail: clean(`say it over the strongest visual you have, not over dead air. visual note: ${visualFinding}`),
      },
      {
        label: '4. make frame one carry the same message',
        instruction: 'match the spoken line with one short on-screen text beat',
        detail: clean(`do not invent extra claims. the overlay should reinforce the same promise in 4 to 7 words. current note: ${captionFinding}`),
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

export function getReshootTakes(roast: RoastResult): ReshootTake[] {
  const workshop = getHookWorkshop(roast);
  const topic = inferTopic(roast, workshop.openerLine);
  const visualFinding = clean(getAgent(roast, 'visual')?.findings?.[0]) || 'the current first frame is not stopping the scroll yet.';
  const captionFinding = clean(getAgent(roast, 'caption')?.findings?.[0]) || 'the first-screen text is not doing enough work yet.';

  return workshop.rewrites.slice(0, 3).map((rewrite, index) => ({
    label: `take ${String.fromCharCode(65 + index)}`,
    spokenLine: rewrite.line,
    visual:
      index === 0
        ? `start on your strongest proof or reaction, then push into camera immediately. avoid a neutral wide shot. note: ${visualFinding}`
        : index === 1
          ? `open mid-action so the promise lands while something is already happening on screen. note: ${visualFinding}`
          : `show the result first, then deliver the line as voiceover or direct address over that proof. note: ${visualFinding}`,
    textOverlay:
      index === 0
        ? normalizeLine(`stuck at 200 views? fix your ${topic} opener`)
        : index === 1
          ? normalizeLine(`your opener is killing the video`)
          : normalizeLine(`show this before you explain it`),
    whyItWorks: clean(`${rewrite.whyItWorks} keep the text short and readable in frame one. caption note: ${captionFinding}`),
  }));
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
