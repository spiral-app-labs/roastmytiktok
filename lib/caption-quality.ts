import Anthropic from '@anthropic-ai/sdk';
import type { ExtractedFrame } from '@/lib/frame-extractor';
import type { TranscriptionResult } from '@/lib/whisper-transcribe';

export interface CaptionQualityReport {
  hasCaptions: boolean;
  firstCaptionTimeSec: number | null;
  speechStartTimeSec: number | null;
  captionSpeechGapSec: number | null;
  timingGrade: 'S' | 'A' | 'B' | 'F';
  readabilityScore: number;
  fontSizeAssessment: {
    label: 'large' | 'medium' | 'small' | 'none';
    approxFrameWidthPct: number | null;
    recommendation: string;
  };
  contrastAssessment: {
    ratioEstimate: number | null;
    label: 'high' | 'medium' | 'low' | 'none';
    recommendation: string;
  };
  positionAssessment: {
    verticalZone: 'upper-third' | 'center' | 'lower-safe' | 'bottom-danger' | 'unknown';
    horizontalRisk: 'safe' | 'right-ui-risk' | 'left-edge-risk' | 'unknown';
    recommendation: string;
  };
  overallReadability: 'excellent' | 'good' | 'mixed' | 'poor';
  notableIssues: string[];
  actionableRecommendations: string[];
  summary: string;
}

const EMPTY_REPORT: CaptionQualityReport = {
  hasCaptions: false,
  firstCaptionTimeSec: null,
  speechStartTimeSec: null,
  captionSpeechGapSec: null,
  timingGrade: 'F',
  readabilityScore: 10,
  fontSizeAssessment: {
    label: 'none',
    approxFrameWidthPct: null,
    recommendation: 'Add burned-in captions with bold text at roughly 24pt+ mobile-equivalent size.',
  },
  contrastAssessment: {
    ratioEstimate: null,
    label: 'none',
    recommendation: 'Use white or yellow text with a black outline or dark background box.',
  },
  positionAssessment: {
    verticalZone: 'unknown',
    horizontalRisk: 'unknown',
    recommendation: 'Keep text in the upper third or centered above TikTok UI overlays.',
  },
  overallReadability: 'poor',
  notableIssues: ['Caption quality analysis unavailable.'],
  actionableRecommendations: ['Add burned-in captions, keep them large, high-contrast, and above the bottom 20% of the frame.'],
  summary: 'Caption quality analysis unavailable.',
};

function extractSpeechStartTime(transcript?: TranscriptionResult | null): number | null {
  if (!transcript?.segments?.length) return null;
  const first = transcript.segments.find(segment => segment.text.trim().length > 0);
  return first ? Number(first.start.toFixed(2)) : null;
}

function parseJsonBlock(raw: string): CaptionQualityReport | null {
  const trimmed = raw.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Partial<CaptionQualityReport>;
    return {
      hasCaptions: parsed.hasCaptions ?? EMPTY_REPORT.hasCaptions,
      firstCaptionTimeSec: parsed.firstCaptionTimeSec ?? null,
      speechStartTimeSec: parsed.speechStartTimeSec ?? null,
      captionSpeechGapSec: parsed.captionSpeechGapSec ?? null,
      timingGrade: parsed.timingGrade ?? EMPTY_REPORT.timingGrade,
      readabilityScore: typeof parsed.readabilityScore === 'number' ? parsed.readabilityScore : EMPTY_REPORT.readabilityScore,
      fontSizeAssessment: {
        label: parsed.fontSizeAssessment?.label ?? EMPTY_REPORT.fontSizeAssessment.label,
        approxFrameWidthPct: parsed.fontSizeAssessment?.approxFrameWidthPct ?? null,
        recommendation: parsed.fontSizeAssessment?.recommendation ?? EMPTY_REPORT.fontSizeAssessment.recommendation,
      },
      contrastAssessment: {
        ratioEstimate: parsed.contrastAssessment?.ratioEstimate ?? null,
        label: parsed.contrastAssessment?.label ?? EMPTY_REPORT.contrastAssessment.label,
        recommendation: parsed.contrastAssessment?.recommendation ?? EMPTY_REPORT.contrastAssessment.recommendation,
      },
      positionAssessment: {
        verticalZone: parsed.positionAssessment?.verticalZone ?? EMPTY_REPORT.positionAssessment.verticalZone,
        horizontalRisk: parsed.positionAssessment?.horizontalRisk ?? EMPTY_REPORT.positionAssessment.horizontalRisk,
        recommendation: parsed.positionAssessment?.recommendation ?? EMPTY_REPORT.positionAssessment.recommendation,
      },
      overallReadability: parsed.overallReadability ?? EMPTY_REPORT.overallReadability,
      notableIssues: Array.isArray(parsed.notableIssues) ? parsed.notableIssues.slice(0, 6) : EMPTY_REPORT.notableIssues,
      actionableRecommendations: Array.isArray(parsed.actionableRecommendations) ? parsed.actionableRecommendations.slice(0, 6) : EMPTY_REPORT.actionableRecommendations,
      summary: parsed.summary ?? EMPTY_REPORT.summary,
    };
  } catch {
    return null;
  }
}

/** Maximum number of retry attempts for the Claude API call. */
const MAX_RETRIES = 2;

/** Delay between retries in ms (doubles each attempt). */
const RETRY_BASE_DELAY_MS = 1500;

export async function analyzeCaptionQuality(params: {
  anthropic: Anthropic;
  frames: ExtractedFrame[];
  transcript?: TranscriptionResult | null;
}): Promise<CaptionQualityReport> {
  const { anthropic, frames, transcript } = params;
  const speechStartTimeSec = extractSpeechStartTime(transcript);

  if (frames.length === 0) {
    return {
      ...EMPTY_REPORT,
      speechStartTimeSec,
      summary: 'No frames available for caption quality analysis.',
      notableIssues: ['No frames available for caption quality analysis.'],
    };
  }

  // Limit frames sent to avoid token overflow (max 6 for caption audit)
  const cappedFrames = frames.slice(0, 6);

  const transcriptContext = transcript?.segments?.length
    ? transcript.segments
        .slice(0, 20)
        .map(segment => `${segment.start.toFixed(2)}-${segment.end.toFixed(2)}s: ${segment.text}`)
        .join('\n')
    : transcript?.text?.slice(0, 2000) || 'No transcript available.';

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callCaptionAnalysis(anthropic, cappedFrames, transcriptContext, speechStartTimeSec);
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      const isRetryable = message.includes('overloaded') || message.includes('529') || message.includes('rate') || message.includes('timeout');
      console.warn(`[caption-quality] Attempt ${attempt}/${MAX_RETRIES} failed${isRetryable ? ' (retryable)' : ''}: ${message.slice(0, 200)}`);
      if (!isRetryable || attempt === MAX_RETRIES) break;
      await new Promise(r => setTimeout(r, RETRY_BASE_DELAY_MS * attempt));
    }
  }

  console.error('[caption-quality] All attempts failed:', lastError);
  return {
    ...EMPTY_REPORT,
    speechStartTimeSec,
    summary: 'Caption quality analysis failed after retries.',
    notableIssues: ['Caption quality analysis unavailable due to API error.'],
  };
}

async function callCaptionAnalysis(
  anthropic: Anthropic,
  frames: ExtractedFrame[],
  transcriptContext: string,
  speechStartTimeSec: number | null,
): Promise<CaptionQualityReport> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: [
        // Interleave text labels with images so the model knows which frame is which.
        // This mirrors how the main agent pipeline sends frames and significantly improves
        // the model's ability to report accurate timestamps for captions and text hooks.
        ...frames.flatMap(frame => ([
          {
            type: 'text' as const,
            text: `${frame.label} (${frame.slot === 'opening' ? 'opening / hook zone — check for text overlays and title cards' : 'story zone'})`,
          },
          {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: 'image/jpeg' as const,
              data: frame.imageBase64,
            },
          },
        ])),
        {
          type: 'text' as const,
          text: `You are auditing TikTok caption quality for retention and accessibility.

FRAME TIMESTAMPS (also labeled above each image):
${frames.map((frame, index) => `Frame ${index + 1}: ${frame.label}`).join('\n')}

TRANSCRIPT SEGMENTS:
${transcriptContext}

Known speech start time: ${speechStartTimeSec ?? 'unknown'}

Return ONLY valid JSON with this exact shape:
{
  "hasCaptions": boolean,
  "firstCaptionTimeSec": number | null,
  "speechStartTimeSec": number | null,
  "captionSpeechGapSec": number | null,
  "timingGrade": "S" | "A" | "B" | "F",
  "readabilityScore": number,
  "fontSizeAssessment": {
    "label": "large" | "medium" | "small" | "none",
    "approxFrameWidthPct": number | null,
    "recommendation": string
  },
  "contrastAssessment": {
    "ratioEstimate": number | null,
    "label": "high" | "medium" | "low" | "none",
    "recommendation": string
  },
  "positionAssessment": {
    "verticalZone": "upper-third" | "center" | "lower-safe" | "bottom-danger" | "unknown",
    "horizontalRisk": "safe" | "right-ui-risk" | "left-edge-risk" | "unknown",
    "recommendation": string
  },
  "overallReadability": "excellent" | "good" | "mixed" | "poor",
  "notableIssues": string[],
  "actionableRecommendations": string[],
  "summary": string
}

Rubric:
- Detect whether burned-in captions or readable text appear in the sampled frames.
- Estimate when captions first appear and compare with the first spoken words. Use the transcript timing when possible.
- Font size: large if the caption line fills roughly 30-50% of frame width, medium if 20-30%, small if under 15%.
- Position: bottom 20% is dangerous, right 15% is at risk because of TikTok UI.
- Contrast: estimate a WCAG-style ratio where possible. White/yellow text with black outline or dark box is usually strong. Flat text on similarly bright backgrounds is weak.
- Recommendations must be concrete and production-ready, not generic.
- If there are no captions, say so clearly and provide practical fix steps.
`,
        },
      ],
    }],
  });

  const text = response.content.find(block => block.type === 'text');
  const parsed = text?.type === 'text' ? parseJsonBlock(text.text) : null;

  if (!parsed) {
    return {
      ...EMPTY_REPORT,
      speechStartTimeSec,
      summary: 'Caption quality analysis returned an unreadable response.',
      notableIssues: ['Caption quality analysis returned an unreadable response.'],
    };
  }

  return {
    ...parsed,
    speechStartTimeSec: parsed.speechStartTimeSec ?? speechStartTimeSec,
  };
}

export function buildCaptionQualityContext(report: CaptionQualityReport): string {
  const timingLine = report.hasCaptions
    ? `Caption timing: first caption ${report.firstCaptionTimeSec ?? 'unknown'}s, speech starts ${report.speechStartTimeSec ?? 'unknown'}s, gap ${report.captionSpeechGapSec ?? 'unknown'}s, timing grade ${report.timingGrade}.`
    : 'Caption timing: no burned-in captions detected in sampled frames.';

  return `\n\nCAPTION QUALITY AUDIT (use this as evidence, not vibes):
- ${timingLine}
- Readability score: ${report.readabilityScore}/100 (${report.overallReadability}).
- Font size: ${report.fontSizeAssessment.label}${report.fontSizeAssessment.approxFrameWidthPct ? `, ~${report.fontSizeAssessment.approxFrameWidthPct}% of frame width` : ''}. ${report.fontSizeAssessment.recommendation}
- Contrast: ${report.contrastAssessment.label}${report.contrastAssessment.ratioEstimate ? `, ~${report.contrastAssessment.ratioEstimate}:1` : ''}. ${report.contrastAssessment.recommendation}
- Position: ${report.positionAssessment.verticalZone} / ${report.positionAssessment.horizontalRisk}. ${report.positionAssessment.recommendation}
- Notable issues: ${report.notableIssues.join(' | ')}
- Actionable recommendations: ${report.actionableRecommendations.join(' | ')}
- Summary: ${report.summary}`;
}
