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

export interface FirstFiveSecondsDiagnosis {
  verdict: 'working' | 'fragile' | 'failing';
  hookRead: string;
  likelyDropWindow: string;
  retentionRisk: string;
  nextTimeFix: string;
  evidence: string[];
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
  cameraNote: string;
  timing: string;
  whyItWorks: string;
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

export interface DetectedHookType {
  type: 'visual' | 'spoken' | 'text' | 'motion' | 'curiosity' | 'none';
  label: string;
  confidence: 'likely' | 'possible' | 'unclear';
  explanation: string;
  upgrade: string;
}

export function getDetectedHookType(roast: RoastResult): DetectedHookType {
  const hook = getAgent(roast, 'hook');
  const visual = getAgent(roast, 'visual');
  const caption = getAgent(roast, 'caption');
  const audio = getAgent(roast, 'audio');
  const openerLine = getOpeningLine(roast);
  const hasSpoken = openerLine !== 'No spoken opener detected in the first beat.';
  const hasText = (caption?.score ?? 0) >= 50 && caption?.findings?.some(f => /text|overlay|caption|on-screen/i.test(f));
  const hasMotion = (visual?.score ?? 0) >= 60 && visual?.findings?.some(f => /motion|movement|zoom|cut|pan|action/i.test(f));
  const hasCuriosity = (hook?.score ?? 0) >= 60 && hook?.findings?.some(f => /curiosity|tension|gap|tease|surprise|question/i.test(f));
  const hasVisual = (visual?.score ?? 0) >= 65 && visual?.findings?.some(f => /frame|bright|color|striking|distinct|tight/i.test(f));

  if (hasCuriosity) {
    return {
      type: 'curiosity',
      label: 'curiosity / tension gap',
      confidence: (hook?.score ?? 0) >= 70 ? 'likely' : 'possible',
      explanation: 'the opener tries to create an open loop or promise a payoff, which is one of the strongest hook types when it lands.',
      upgrade: 'make the gap sharper — name the surprising result or problem before any context so the viewer needs the explanation.',
    };
  }
  if (hasSpoken && (audio?.score ?? 0) >= 55) {
    return {
      type: 'spoken',
      label: 'spoken / verbal hook',
      confidence: (audio?.score ?? 0) >= 65 ? 'likely' : 'possible',
      explanation: 'the opener leads with a spoken line. this works when the first sentence is a claim, not a warm-up.',
      upgrade: 'cut any greeting or throat-clearing. the first sentence should name the pain, result, or surprise immediately.',
    };
  }
  if (hasVisual) {
    return {
      type: 'visual',
      label: 'visual hook',
      confidence: (visual?.score ?? 0) >= 70 ? 'likely' : 'possible',
      explanation: 'frame one has something visually distinct — color, framing, or a result that earns a pause on mute.',
      upgrade: 'push the visual harder: tighter crop, brighter lighting, or show the payoff/result before explaining it.',
    };
  }
  if (hasText) {
    return {
      type: 'text',
      label: 'text overlay hook',
      confidence: 'possible',
      explanation: 'the opener uses on-screen text to carry the promise, which is critical for the ~50% of viewers watching on mute.',
      upgrade: 'make the text bolder, shorter (4-7 words max), and place it in the upper third so it clears the UI.',
    };
  }
  if (hasMotion) {
    return {
      type: 'motion',
      label: 'motion hook',
      confidence: 'possible',
      explanation: 'the opener uses movement or editing pace to signal energy, but motion alone rarely carries a hook without a message.',
      upgrade: 'pair the motion with a spoken or text claim so the energy has a reason behind it.',
    };
  }
  return {
    type: 'none',
    label: 'no clear hook type detected',
    confidence: 'unclear',
    explanation: 'the opener does not clearly commit to any hook strategy — it may be easing into the content instead of leading with a reason to stay.',
    upgrade: 'pick one hook type (curiosity gap, direct call-out, or result-first) and build the entire first 2 seconds around it.',
  };
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
      label: 'shot 1 — framing',
      direction: 'open on the payoff, not the setup',
      detail: clean(`start in a tighter frame (medium close-up or closer) with motion in the first second. if possible, show the finished result, strongest reaction, or most surprising visual before you explain. fill the frame — dead space signals amateur. current issue: ${visualFinding}`),
    },
    {
      label: 'spoken line — 0.5s mark',
      direction: 'replace the soft intro',
      detail: openerLine !== 'No spoken opener detected in the first beat.'
        ? `replace "${openerLine}" with "${hookRewrite}" — deliver it within the first half-second, not after a pause.`
        : `add a spoken opener immediately: "${hookRewrite}" — start speaking before the viewer has time to decide whether to swipe.`,
    },
    {
      label: 'on-screen text — frame 1',
      direction: 'make frame one readable on mute',
      detail: clean(`put one bold line on screen in frame one that mirrors the hook. 4-7 words max, upper third of screen, high-contrast font. current issue: ${captionFinding}`),
    },
    {
      label: 'edit note — pacing',
      direction: 'cut the throat-clearing, land the promise by 1.5s',
      detail: 'remove any pause, greeting, or camera-settling beat before the first claim lands. the viewer should understand the promise within the first 1.5 seconds. if the setup takes longer than that, the hook has already failed.',
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
    cameraNote:
      index === 0
        ? 'medium close-up, eye level or slightly above. fill the frame — no dead space on the sides. if showing a result, hold it at chest height so it is in focus and centered.'
        : index === 1
          ? 'start wide or mid-action, then cut to a tight close-up on the key detail within the first second. the camera should feel like it is already moving when the video starts.'
          : 'open on the finished result or proof in a tight, well-lit frame. deliver the voiceover off-camera or cut to direct address after the result lands.',
    timing:
      index === 0
        ? '0-0.5s: visual lands (result, reaction, or tight frame). 0.5-1.5s: spoken line starts. 1.5-2.5s: text overlay appears and reinforces the claim.'
        : index === 1
          ? '0-0.5s: action already in progress (movement, cut, or reveal). 0.5-1s: spoken line drops mid-action. 1-2s: text overlay confirms the promise.'
          : '0-1s: result or proof fills the screen silently. 1-1.5s: voiceover or direct address begins. 1.5-2.5s: text overlay names the takeaway.',
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

export function getFirstFiveSecondsDiagnosis(roast: RoastResult): FirstFiveSecondsDiagnosis {
  const stored = roast.firstFiveSecondsDiagnosis;
  if (stored) return stored;

  const hook = getAgent(roast, 'hook');
  const visual = getAgent(roast, 'visual');
  const caption = getAgent(roast, 'caption');
  const audio = getAgent(roast, 'audio');
  const openerLine = getOpeningLine(roast);
  const hookScore = hook?.score ?? roast.hookSummary?.score ?? 50;
  const visualScore = visual?.score ?? 50;
  const captionScore = caption?.score ?? 50;
  const audioScore = audio?.score ?? 50;
  const primaryStep = roast.actionPlan?.find((step) => step.priority === 'P1') || roast.actionPlan?.find((step) => step.dimension === 'hook');
  const stepEvidence = (primaryStep?.evidence ?? []).map(clean).filter(Boolean);
  const evidenceMoments = stepEvidence.map(parseEvidenceMoment).filter(Boolean) as string[];
  const primaryEvidence = stepEvidence[0] || clean(hook?.findings?.[0]);
  const primaryMoment = evidenceMoments[0] || inferLikelyDropMoment(primaryStep?.timestampSeconds, openerLine, hookScore, visualScore);
  const openerFeelsSoft = /^(hey|hi|hello)\b|today i (want|wanted)|i get this question|let me talk about|welcome back/i.test(openerLine);
  const noSpokenOpener = openerLine === 'No spoken opener detected in the first beat.';
  const verdict: FirstFiveSecondsDiagnosis['verdict'] =
    hookScore >= 75 && visualScore >= 65 && Math.min(captionScore, audioScore) >= 55
      ? 'working'
      : hookScore >= 55 || (visualScore >= 60 && captionScore >= 60)
        ? 'fragile'
        : 'failing';

  const likelyDropWindow =
    verdict === 'working'
      ? 'likely to hold through 5.0s'
      : primaryStep?.timestampLabel
        ? `likely drop: ${primaryStep.timestampLabel}`
        : hookScore < 45 || openerFeelsSoft || noSpokenOpener
          ? 'likely drop: 0.0s-1.0s'
          : hookScore < 60 || visualScore < 55
            ? 'likely drop: 1.0s-3.0s'
            : 'likely drop: 3.0s-5.0s';

  const hookRead = verdict === 'working'
    ? clean(roast.hookSummary?.headline) || `the opener works because the first beat lands a clear promise instead of easing in.`
    : openerFeelsSoft
      ? `the opening line "${openerLine}" reads like a warm-up, so the hook fails before the payoff starts.`
      : noSpokenOpener
        ? 'there is no clear spoken hook in the first beat, so the video has to win visually right away and currently does not.'
        : clean(primaryStep?.issue)
          ? `${clean(primaryStep.issue)} this is the moment that makes the opener feel ${verdict === 'fragile' ? 'fragile' : 'unfinished'}.`
          : clean(hook?.findings?.[0]) || clean(roast.hookSummary?.headline) || 'the first beat is not landing clearly enough yet.';

  let retentionRisk = '';
  if (verdict === 'working') {
    retentionRisk = clean(roast.hookSummary?.distributionRisk) || 'the opening has enough clarity and momentum that later fixes can now matter.';
  } else if (primaryEvidence) {
    retentionRisk = `${primaryMoment ? `${primaryMoment}, ` : ''}viewers are likely dropping because ${lowercaseFirst(primaryEvidence)}${clean(primaryStep?.algorithmicConsequence) ? ` ${lowercaseFirst(clean(primaryStep?.algorithmicConsequence))}` : ''}`;
  } else {
    retentionRisk = clean(roast.hookSummary?.distributionRisk) || (verdict === 'fragile'
      ? 'viewers may stay for the promise, but the hold is shaky if the next beat drags.'
      : 'cold viewers are getting an early-friction signal before the value lands.');
  }

  const nextTimeFix = buildNextTimeFix(roast, primaryStep, hook?.improvementTip);

  const evidence = [
    ...stepEvidence,
    clean(hook?.findings?.[0]),
    clean(visual?.findings?.[0]),
    clean(caption?.findings?.[0]),
    clean(audio?.findings?.[0]),
  ].filter(Boolean).filter((item, index, array) => array.indexOf(item) === index).slice(0, 3);

  return {
    verdict,
    hookRead,
    likelyDropWindow,
    retentionRisk,
    nextTimeFix,
    evidence,
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

function buildNextTimeFix(
  roast: RoastResult,
  primaryStep?: RoastResult['actionPlan'] extends Array<infer Step> ? Step : never,
  fallbackTip?: string,
): string {
  const directive = clean(primaryStep?.doThis);
  const example = clean(primaryStep?.example);
  const combined = [directive, example].filter(Boolean).join(' example: ');
  return clean(
    combined ||
    fallbackTip ||
    roast.actionPlan?.find((step) => step.dimension === 'hook')?.example ||
    getReshootTakes(roast)[0]?.spokenLine ||
    'lead with the clearest result or pain point in the first second.'
  );
}

function inferLikelyDropMoment(
  timestampSeconds?: number,
  openerLine?: string,
  hookScore?: number,
  visualScore?: number,
): string {
  if (typeof timestampSeconds === 'number' && Number.isFinite(timestampSeconds)) {
    return `around ${formatSeconds(timestampSeconds)}`;
  }
  if (openerLine && /^(hey|hi|hello)\b|today i (want|wanted)|i get this question|let me talk about|welcome back/i.test(openerLine)) {
    return 'in the first second';
  }
  if ((hookScore ?? 50) < 45) return 'in the first second';
  if ((visualScore ?? 50) < 55) return 'between second 1 and 3';
  return '';
}

function parseEvidenceMoment(value: string): string {
  const rangeMatch = value.match(/(\d+(?:\.\d+)?)s\s*-\s*(\d+(?:\.\d+)?)s/i);
  if (rangeMatch) return `between ${formatSeconds(Number(rangeMatch[1]))} and ${formatSeconds(Number(rangeMatch[2]))}`;

  const labelMatch = value.match(/(\d{1,2}:\d{2}(?:-\d{1,2}:\d{2})?)/);
  if (labelMatch) return `around ${labelMatch[1]}`;

  const secondMatch = value.match(/(?:at|around)\s*(\d+(?:\.\d+)?)s/i) || value.match(/(\d+(?:\.\d+)?)s/i);
  if (secondMatch) return `around ${formatSeconds(Number(secondMatch[1]))}`;

  if (/frame\s*1|opening line/i.test(value)) return 'in the first second';
  return '';
}

function formatSeconds(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0.0s';
  if (value < 10) return `${value.toFixed(1)}s`;
  const rounded = Math.round(value);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function lowercaseFirst(value: string): string {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : '';
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
