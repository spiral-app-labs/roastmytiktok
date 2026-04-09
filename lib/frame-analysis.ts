import { GoogleGenAI } from '@google/genai';
import type { ExtractedFrame, FrameZone } from './frame-extractor';

// ---------------------------------------------------------------------------
// Per-frame structured analysis produced by the vision model
// ---------------------------------------------------------------------------

export interface FrameAnalysis {
  timestampSec: number;
  zone: FrameZone;

  // Scene
  sceneDescription: string;          // 1-2 sentence overview of what's happening
  setting: string;                    // "indoor studio", "outdoor street", "kitchen", "gym", etc.
  settingType: 'indoor' | 'outdoor' | 'mixed';

  // People
  peopleCount: number;
  facialExpressions: string[];        // ["smiling", "surprised", "neutral", "talking"]
  eyeContact: boolean;                // looking at camera?
  bodyLanguage: string;               // "animated gesturing", "sitting still", "walking", "demonstrating"
  framing: string;                    // "extreme close-up", "close-up", "medium", "wide", "full body"
  faceFillPercent: number;            // 0-100: how much of the frame the face fills (0 if no face)

  // Lighting
  lightingQuality: 'excellent' | 'good' | 'fair' | 'poor';
  lightingDirection: string;          // "front", "side", "overhead", "backlit", "natural window", "ring light"
  lightingSource?: string;           // "window light", "ring light", "overhead room light", etc.
  lightingIssues: string[];           // ["harsh shadows under eyes", "overexposed background", "underlit left side"]
  lightingTemperature: 'warm' | 'neutral' | 'cool';

  // Color
  colorSaturation: 'vibrant' | 'normal' | 'muted' | 'desaturated';
  colorTemperature: 'warm' | 'neutral' | 'cool';
  colorGrade: string;                 // "clean/natural", "filtered", "cinematic", "raw/ungraded", "heavy filter"
  dominantColors: string[];           // top 2-3 colors in the frame

  // Text on screen
  textOnScreen: string[];             // all visible text verbatim
  textPosition: string | null;        // "center", "top", "bottom", "lower-third" or null
  textReadable: boolean;              // legible at phone screen size?
  textContrast: 'high' | 'medium' | 'low' | 'none';

  // Captions
  captionsPresent: boolean;
  captionStyle: string | null;        // "bold white with black outline", "auto-generated thin", etc.
  captionReadable: boolean;
  captionInSafeZone: boolean;         // not covered by platform UI buttons

  // Background
  backgroundDescription: string;      // "clean white wall", "cluttered bedroom", "city street"
  backgroundClutter: 'clean' | 'moderate' | 'cluttered';
  distractingElements: string[];      // ["amazon boxes", "unmade bed", "other people walking"]

  // Camera & composition
  cameraAngle: string;                // "eye level", "high angle", "low angle", "dutch angle"
  cameraWork: string;                 // "static tripod", "handheld steady", "handheld shaky", "tracking", "zoom"
  compositionQuality: 'strong' | 'acceptable' | 'weak';
  compositionNotes: string;           // "well-centered", "off-center subject", "too much headroom"

  // Motion & continuity (compared to previous frame)
  motionType: string;                 // "scene cut", "minimal movement", "camera pan", "subject movement", "zoom"
  sceneChanged: boolean;              // true if this is a different scene/shot than previous frame

  // Production signals
  hasWatermark: boolean;
  hasBrandElements: boolean;
  productionTier: 'professional' | 'semi-pro' | 'casual' | 'low-effort';
  visualEnergy: 'high' | 'medium' | 'low';  // dynamic/exciting vs static/calm
  attractivenessSignal?: 'strong' | 'moderate' | 'weak' | 'none';
  attractivenessReason?: string;
}

export interface FrameAnalysisResult {
  frames: FrameAnalysis[];
  totalFrames: number;
  analysisModel: string;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Gemini 2.5 Flash vision analysis
// ---------------------------------------------------------------------------

const FRAME_ANALYSIS_PROMPT = `You are a video frame analysis system. Analyze each frame and return structured data grounded only in what is literally visible.

Do not infer performance outcomes, creator intent, social status, profession, or personality.
Do not assume attractiveness, trustworthiness, confidence, or authority unless there is a direct visual reason you can describe.
When something is unclear, say so in the structured fields instead of guessing.
Prefer concrete observations over vague praise.

For each frame image provided, extract the following information as accurately as possible:

SCENE: What is happening in this frame? Describe the scene in 1-2 sentences. What is the setting (indoor/outdoor, specific location type)?

PEOPLE: How many people are visible? What are their facial expressions? Are they making eye contact with the camera? Describe their body language. How is the person framed (close-up, medium, wide)? What percentage of the frame does the main face fill (0 if no face)?

LIGHTING: Rate the lighting quality (excellent/good/fair/poor). What direction is the light coming from? What is the most likely light source visible or implied (window, ring light, overhead room light, daylight, mixed, unclear)? Are there any lighting issues (shadows, overexposure, backlighting)? Is the lighting warm, neutral, or cool?

COLOR: How saturated are the colors (vibrant/normal/muted/desaturated)? What is the color temperature (warm/neutral/cool)? Is there a color grade or filter applied? What are the 2-3 dominant colors?

TEXT ON SCREEN: List ALL visible text verbatim (overlays, captions, stickers, watermarks, title cards). Where is the text positioned? Is it readable at phone screen size? How is the contrast (high/medium/low)?

CAPTIONS: Are burned-in captions present? What style are they? Are they readable? Are they in a safe zone (not covered by platform UI)?

BACKGROUND: Describe the background in one sentence. Rate the clutter level (clean/moderate/cluttered). List any distracting elements.

CAMERA: What angle is the camera at (eye level, high, low)? What kind of camera work (static, handheld, tracking, zoom)? Rate the composition (strong/acceptable/weak) and note any issues.

MOTION: Compared to the previous frame, what changed? Is this a new scene/shot or continuation?

PRODUCTION: Is there a watermark? Any brand elements? Rate the overall production tier (professional/semi-pro/casual/low-effort). Rate the visual energy level (high/medium/low). If the person's presence is visually compelling in a way that could help stop scrolling, rate attractivenessSignal as strong/moderate/weak/none and explain the literal reason in attractivenessReason (for example: sharp eye contact, flattering lighting, expressive face, striking styling, or none/unclear). Do not speculate beyond what the frame supports.

Return ONLY a valid JSON array with one object per frame. Each object must have these exact keys:
timestampSec, zone, sceneDescription, setting, settingType, peopleCount, facialExpressions, eyeContact, bodyLanguage, framing, faceFillPercent, lightingQuality, lightingDirection, lightingSource, lightingIssues, lightingTemperature, colorSaturation, colorTemperature, colorGrade, dominantColors, textOnScreen, textPosition, textReadable, textContrast, captionsPresent, captionStyle, captionReadable, captionInSafeZone, backgroundDescription, backgroundClutter, distractingElements, cameraAngle, cameraWork, compositionQuality, compositionNotes, motionType, sceneChanged, hasWatermark, hasBrandElements, productionTier, visualEnergy, attractivenessSignal, attractivenessReason

Preserve frame order. Use the timestamp and zone from each frame label.`;

/**
 * Analyze extracted video frames using Gemini 2.5 Flash vision.
 * Sends all frames in a single API call and returns structured per-frame analysis.
 */
export async function analyzeFrames(
  frames: ExtractedFrame[],
): Promise<FrameAnalysisResult> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY environment variable is not set');
  }

  if (frames.length === 0) {
    return { frames: [], totalFrames: 0, analysisModel: 'gemini-2.5-flash', durationMs: 0 };
  }

  const genai = new GoogleGenAI({ apiKey });
  const startTime = Date.now();

  // Build multi-modal content: interleave frame labels with images
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  parts.push({ text: FRAME_ANALYSIS_PROMPT });

  for (const frame of frames) {
    parts.push({ text: `\n[Frame at ${frame.timestampSec.toFixed(1)}s | zone: ${frame.zone}]` });
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: frame.imageBase64,
      },
    });
  }

  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts }],
    config: {
      responseMimeType: 'application/json',
      maxOutputTokens: 8192,
    },
  });

  const responseText = response.text ?? '';

  // Parse the JSON array from the response
  let parsed: FrameAnalysis[];
  try {
    // Try direct parse first
    parsed = JSON.parse(responseText);
  } catch {
    // Try extracting JSON array from the response
    const arrayMatch = responseText.match(/\[[\s\S]*\]/);
    if (!arrayMatch) {
      console.error('[frame-analysis] Could not parse response as JSON array. First 500 chars:', responseText.slice(0, 500));
      throw new Error('Frame analysis returned unparseable response');
    }
    parsed = JSON.parse(arrayMatch[0]);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Frame analysis did not return an array');
  }

  const durationMs = Date.now() - startTime;
  console.log(`[frame-analysis] Analyzed ${parsed.length} frames in ${durationMs}ms using gemini-2.5-flash`);

  return {
    frames: parsed,
    totalFrames: parsed.length,
    analysisModel: 'gemini-2.5-flash',
    durationMs,
  };
}

// ---------------------------------------------------------------------------
// Build text context from frame analysis for downstream agents
// ---------------------------------------------------------------------------

/**
 * Convert structured frame analysis into a text block that agents can reason about.
 * This replaces raw base64 images in agent prompts.
 */
export function buildFrameContext(analysis: FrameAnalysis[]): string {
  if (analysis.length === 0) return 'No frame analysis available.';

  const sections = analysis.map((f, i) => {
    const lines: string[] = [];
    lines.push(`--- Frame ${i + 1}: ${f.timestampSec.toFixed(1)}s [${f.zone}] ---`);
    lines.push(`Scene: ${f.sceneDescription}`);
    lines.push(`Setting: ${f.setting} (${f.settingType})`);

    // People
    if (f.peopleCount > 0) {
      lines.push(`People: ${f.peopleCount} | Expressions: ${f.facialExpressions.join(', ')} | Framing: ${f.framing} | Face fill: ${f.faceFillPercent}%${f.eyeContact ? ' | Eye contact: yes' : ''}`);
      lines.push(`Body language: ${f.bodyLanguage}`);
      if (f.attractivenessSignal && f.attractivenessSignal !== 'none') {
        lines.push(`Scroll-stopping presence: ${f.attractivenessSignal}${f.attractivenessReason ? ' | Reason: ' + f.attractivenessReason : ''}`);
      }
    } else {
      lines.push('People: none visible');
    }

    // Lighting
    lines.push(`Lighting: ${f.lightingQuality} quality, ${f.lightingDirection}, ${f.lightingTemperature} temperature${f.lightingSource ? ' | Source: ' + f.lightingSource : ''}${f.lightingIssues.length ? ' | Issues: ' + f.lightingIssues.join(', ') : ''}`);

    // Color
    lines.push(`Color: ${f.colorSaturation} saturation, ${f.colorTemperature}, ${f.colorGrade} | Dominant: ${f.dominantColors.join(', ')}`);

    // Text
    if (f.textOnScreen.length > 0) {
      lines.push(`Text on screen: "${f.textOnScreen.join('" | "')}" | Position: ${f.textPosition} | Readable: ${f.textReadable} | Contrast: ${f.textContrast}`);
    }

    // Captions
    if (f.captionsPresent) {
      lines.push(`Captions: ${f.captionStyle} | Readable: ${f.captionReadable} | In safe zone: ${f.captionInSafeZone}`);
    }

    // Background
    lines.push(`Background: ${f.backgroundDescription} (${f.backgroundClutter})${f.distractingElements.length ? ' | Distractions: ' + f.distractingElements.join(', ') : ''}`);

    // Camera
    lines.push(`Camera: ${f.cameraAngle}, ${f.cameraWork} | Composition: ${f.compositionQuality}${f.compositionNotes ? ' - ' + f.compositionNotes : ''}`);

    // Motion
    if (i > 0) {
      lines.push(`Motion: ${f.motionType}${f.sceneChanged ? ' (new scene)' : ''}`);
    }

    // Production
    lines.push(`Production: ${f.productionTier} | Energy: ${f.visualEnergy}${f.hasWatermark ? ' | Watermark present' : ''}`);

    return lines.join('\n');
  });

  return sections.join('\n\n');
}

/**
 * Extract on-screen text from frame analysis (replaces separate extractOnScreenText call).
 */
export function extractTextFromAnalysis(analysis: FrameAnalysis[]): Array<{
  timestampSec: number;
  detectedText: string[];
}> {
  return analysis
    .filter(f => f.textOnScreen.length > 0)
    .map(f => ({ timestampSec: f.timestampSec, detectedText: f.textOnScreen }));
}

/**
 * Derive caption quality data from frame analysis (replaces separate analyzeCaptionQuality call).
 */
export function deriveCaptionQuality(analysis: FrameAnalysis[]): {
  hasCaptions: boolean;
  captionStyle: string | null;
  readable: boolean;
  inSafeZone: boolean;
  framesWithCaptions: number;
  totalFrames: number;
} {
  const withCaptions = analysis.filter(f => f.captionsPresent);
  return {
    hasCaptions: withCaptions.length > 0,
    captionStyle: withCaptions[0]?.captionStyle ?? null,
    readable: withCaptions.length > 0 ? withCaptions.every(f => f.captionReadable) : false,
    inSafeZone: withCaptions.length > 0 ? withCaptions.every(f => f.captionInSafeZone) : false,
    framesWithCaptions: withCaptions.length,
    totalFrames: analysis.length,
  };
}

/**
 * Build a hook-zone summary from frame analysis for the hook agent.
 */
export function buildHookZoneSummary(analysis: FrameAnalysis[]): string {
  const hookFrames = analysis.filter(f => f.zone === 'hook');
  if (hookFrames.length === 0) return 'No hook frames available.';

  const textHooks = hookFrames.filter(f => f.textOnScreen.length > 0);
  const sceneCuts = hookFrames.filter(f => f.sceneChanged).length;
  const avgEnergy = hookFrames.reduce((sum, f) => sum + (f.visualEnergy === 'high' ? 3 : f.visualEnergy === 'medium' ? 2 : 1), 0) / hookFrames.length;
  const strongPresenceFrames = hookFrames.filter(f => f.attractivenessSignal === 'strong' || f.attractivenessSignal === 'moderate');
  const lightingSources = Array.from(new Set(hookFrames.map(f => f.lightingSource).filter(Boolean)));

  const lines = [
    `Hook zone summary (${hookFrames.length} frames, 0-5s):`,
    `Scene cuts in hook: ${sceneCuts}`,
    `Text hooks found: ${textHooks.length > 0 ? textHooks.map(f => `"${f.textOnScreen.join(' ')}" at ${f.timestampSec.toFixed(1)}s`).join(', ') : 'none'}`,
    `Average visual energy: ${avgEnergy > 2.5 ? 'high' : avgEnergy > 1.5 ? 'medium' : 'low'}`,
    `First frame: ${hookFrames[0].sceneDescription}`,
    `Eye contact: ${hookFrames.some(f => f.eyeContact) ? 'yes' : 'no'}`,
    `Lighting consistency: ${new Set(hookFrames.map(f => f.lightingQuality)).size === 1 ? 'consistent' : 'varies'}`,
    `Lighting sources: ${lightingSources.length > 0 ? lightingSources.join(', ') : 'unclear'}`,
    `Compelling on-camera presence: ${strongPresenceFrames.length > 0 ? strongPresenceFrames.map(f => `${f.timestampSec.toFixed(1)}s ${f.attractivenessSignal}${f.attractivenessReason ? ` (${f.attractivenessReason})` : ''}`).join(', ') : 'none noted'}`,
  ];

  return lines.join('\n');
}
