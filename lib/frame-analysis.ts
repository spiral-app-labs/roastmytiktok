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
  attractivenessSignal: 'high' | 'medium' | 'low' | 'none'; // Visual appeal of subject for hook analysis — "high" = conventionally attractive or highly expressive, "none" = no person visible
  attractivenessReason: string;       // One sentence explaining the signal, e.g. "subject is smiling directly at camera with confident energy"

  // Lighting
  lightingSource: string;             // OBSERVED light source: "ring light", "fluorescent ceiling", "window daylight", "phone screen glow", "neon signs", "ambient lamp", "unknown"
  lightingQuality: 'excellent' | 'good' | 'fair' | 'poor';
  lightingDirection: string;          // "front", "side", "overhead", "backlit", "camera-left window", "ring light front"
  lightingIssues: string[];           // ["harsh shadows under eyes", "overexposed background", "underlit left side"] — empty array if none
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

const FRAME_ANALYSIS_PROMPT = `You are a video frame analysis system. Your ONLY job is to describe what you literally observe in each frame. Do NOT infer, assume, or guess anything that is not directly visible. If you are uncertain about something, say so explicitly rather than guessing.

CRITICAL RULE: Every field must be grounded in what you can actually see. Do NOT make assumptions based on context, time of day, or what is typical. Example of what NOT to do: a video filmed indoors under fluorescent lights should NEVER be described as having "sunlight" or "natural light" unless you can literally see a window with daylight coming through it. Describe the light SOURCE you see, not the quality you assume.

For each frame image provided, extract the following information:

SCENE: Describe in 1-2 sentences exactly what you see happening in this frame. What is the specific setting (e.g., "indoor coffee shop with pendant lights", "outdoor sidewalk in daylight", "bedroom with ring light", "kitchen with overhead fluorescent lighting")? Is the setting indoor, outdoor, or mixed?

PEOPLE: How many people are visible? Describe their facial expressions (e.g., "smiling", "neutral", "surprised", "talking"). Are they making eye contact with the camera? Describe body language (e.g., "animated gesturing", "sitting still", "walking"). How is the person framed (close-up, medium, wide, full body)? What percentage of the frame does the main face fill (0 if no face)?

LIGHTING: First, identify the LIGHT SOURCE you can actually see or reasonably infer from visible cues (e.g., "ring light visible off-camera", "fluorescent ceiling panels casting overhead light", "window daylight from camera-left", "phone screen glow", "neon signs", "ambient lamp", "no dominant light source visible"). Then describe: what direction does the light appear to come from based on shadows and highlights? Are there visible lighting problems such as harsh shadows, blown-out highlights, or heavy backlighting? Is the overall color temperature warm (orange/yellow tones), neutral (white/balanced), or cool (blue tones)? For lightingQuality, rate only based on whether the subject is clearly lit and visible: excellent (subject perfectly lit, no issues), good (subject well lit, minor issues), fair (subject partially underlit or overlit, noticeable issues), poor (subject hard to see due to lighting). Do NOT rate quality based on assumed context (e.g., do not say "poor" just because lighting looks ambient or indoor).

COLOR: How saturated are the colors (vibrant/normal/muted/desaturated)? What is the color temperature (warm/neutral/cool)? Is there an obvious color grade or filter applied? What are the 2-3 dominant colors visible in the frame?

TEXT ON SCREEN: List ALL visible text VERBATIM - overlays, captions, stickers, watermarks, title cards. If no text is visible, return an empty array. Where is the text positioned (center/top/bottom/lower-third)? Is it readable at phone screen size? How is the contrast between text and background (high/medium/low/none)?

CAPTIONS: Are burned-in captions present (text that appears to be synced speech captions, NOT general text overlays)? If yes, describe their style (e.g., "bold white with black outline", "auto-generated thin gray"). Are they readable? Are they positioned in a safe zone not covered by platform UI buttons?

BACKGROUND: Describe the background in one specific sentence naming what you see (e.g., "cluttered bedroom with unmade bed and laundry visible", "clean white painted wall", "coffee shop interior with other patrons"). Rate the clutter level (clean/moderate/cluttered). List any specific elements that are visually distracting.

CAMERA: What angle is the camera at (eye level/high angle/low angle/dutch angle)? What kind of camera work is visible (static tripod/handheld steady/handheld shaky/tracking/zoom)? Rate the composition (strong/acceptable/weak) and note any specific issues.

MOTION: Compared to the previous frame, what changed? Is this a new scene/shot or a continuation of the same shot?

PRODUCTION: Is there a visible watermark? Any brand elements? Rate the overall production tier based on what you can see (professional/semi-pro/casual/low-effort). Rate the visual energy level (high/medium/low).

Return ONLY a valid JSON array with one object per frame. Each object must have these exact keys:
timestampSec, zone, sceneDescription, setting, settingType, peopleCount, facialExpressions, eyeContact, bodyLanguage, framing, faceFillPercent, attractivenessSignal, attractivenessReason, lightingSource, lightingQuality, lightingDirection, lightingIssues, lightingTemperature, colorSaturation, colorTemperature, colorGrade, dominantColors, textOnScreen, textPosition, textReadable, textContrast, captionsPresent, captionStyle, captionReadable, captionInSafeZone, backgroundDescription, backgroundClutter, distractingElements, cameraAngle, cameraWork, compositionQuality, compositionNotes, motionType, sceneChanged, hasWatermark, hasBrandElements, productionTier, visualEnergy

For lightingSource, describe ONLY what you can observe or reasonably infer from visible shadows/highlights. Never invent a light source.
For attractivenessSignal, base this ONLY on what is visible: expression, eye contact, confidence, energy — not physical appearance alone.

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
        lines.push(`Hook appeal: ${f.attractivenessSignal} | ${f.attractivenessReason}`);
      }
    } else {
      lines.push('People: none visible');
    }

    // Lighting
    lines.push(`Lighting source: ${f.lightingSource ?? 'unknown'} | Quality: ${f.lightingQuality}, direction: ${f.lightingDirection}, temperature: ${f.lightingTemperature}${f.lightingIssues?.length ? ' | Issues: ' + f.lightingIssues.join(', ') : ''}`);

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

  const topAttractivenessFrame = hookFrames.find(f => f.attractivenessSignal === 'high') ?? hookFrames.find(f => f.attractivenessSignal === 'medium');

  const lines = [
    `Hook zone summary (${hookFrames.length} frames, 0-5s):`,
    `Scene cuts in hook: ${sceneCuts}`,
    `Text hooks found: ${textHooks.length > 0 ? textHooks.map(f => `"${f.textOnScreen.join(' ')}" at ${f.timestampSec.toFixed(1)}s`).join(', ') : 'none'}`,
    `Average visual energy: ${avgEnergy > 2.5 ? 'high' : avgEnergy > 1.5 ? 'medium' : 'low'}`,
    `First frame: ${hookFrames[0].sceneDescription}`,
    `Eye contact in hook: ${hookFrames.some(f => f.eyeContact) ? 'yes' : 'no'}`,
    `Subject hook appeal: ${topAttractivenessFrame ? `${topAttractivenessFrame.attractivenessSignal} (${topAttractivenessFrame.attractivenessReason})` : 'none — no person visible'}`,
    `Lighting source (hook): ${hookFrames[0].lightingSource ?? 'unknown'}`,
    `Lighting consistency: ${new Set(hookFrames.map(f => f.lightingQuality)).size === 1 ? 'consistent' : 'varies'}`,
  ];

  return lines.join('\n');
}
