# Quality Validation Report — 2026-04-06

Pipeline audit for Go Viral (roastmytiktok). No real videos uploaded. Based on static code review of:
- `app/api/analyze/[id]/route.ts` (main pipeline, ~1600 lines)
- `lib/whisper-transcribe.ts`, `lib/transcript-quality.ts`
- `lib/action-plan.ts`, `lib/hook-help.ts`
- All 6 agent prompts + verdict prompt

---

## Stage 1: Niche Detection

**Quality: BROKEN**

**What it does:** Classifies content into 1 of 15 niches using keyword matching. The detected niche drives agent benchmark scoring, hook recommendations, optimal duration range, and the `nichePercentile` verdict.

**Specific miss:** The call site at `route.ts:1103-1111` passes `filename` (e.g. `video_abc123.mp4`) to the `caption` field, and hardcodes `hashtags: []`. These are the two primary keyword-matching signals. In practice, niche detection is running almost entirely blind — only the transcript (when usable) contributes real signal. For music-heavy or dance videos where transcription degrades, all three signals fail simultaneously. The result is either a random niche match from noise in the filename or the generic `lifestyle` fallback.

```ts
// route.ts:1103-1111 — the bug
detectNiche({
  caption: (session as { video_url: string; filename?: string }).filename ?? '',  // <-- filename, not caption
  hashtags: [],  // <-- always empty
  transcript: transcript?.text ?? undefined,
  audioType: ...
});
```

**Concrete fix:** The session row already has a `description` column (used elsewhere in the result as `metadata.description`). Pass that instead of filename. Also pass hashtags parsed from the description (e.g. extract `#word` tokens). One-line change per field.

---

## Stage 2: Transcription

**Quality: GOOD (with one specific weak point)**

**What it does:** AssemblyAI → Whisper → Claude audio fallback chain. Returns `{ text, segments, provider, confidence }`. Confidence gates whether transcript evidence is shown in agent prompts.

**Specific miss — Claude audio fallback timestamps:** When both AssemblyAI and Whisper fail, `transcribeWithClaude()` sends audio to Claude and asks it to "estimate timestamps as best you can." Claude's audio model has no sub-second timing capability. Timestamp estimates from this fallback can be off by 2-5 seconds, which corrupts every downstream timestamp reference in the action plan. There's a 15% confidence penalty applied (`baseConfidence * 0.85`) but no cap low enough to prevent these segments from being used as "evidence."

**Concrete fix:** Cap Claude audio fallback confidence at 0.35 (currently it can score 0.60+ despite invented timestamps). At ≤0.35, `assessTranscriptQuality()` already gates it to `shouldUseTranscriptEvidence: false`, keeping guessed timestamps out of agent prompts.

**Specific miss — short transcript threshold too lenient:** `assessTranscriptQuality()` flags `veryShortTranscript` only when `words < 4`. A 4-word transcript ("okay let's go") passes as potentially usable, hits the confidence check (≥0.45), and can land in agent prompts as quoted "evidence." The threshold should be ≥8 words for quotes to be meaningful.

---

## Stage 3: Hook Analysis

**Quality: WEAK (one structural flaw)**

**What it does:** Hook agent receives 6 dense frames from 0.05s-3.0s, the creator's first spoken segment, on-screen text from all frames, playbook context, and niche context. Returns score, roastText, findings, improvementTip.

**Specific miss — first-segment scoping is not 0-3s:** The hook context builder at `route.ts:1181-1184` passes `transcript.segments[0]` as "the creator's first spoken words":

```ts
const firstSegment = transcript.segments[0];
ctx = `The creator's first spoken words are: "${firstSegment.text}". Analyze whether this opening line is a strong hook.`;
```

AssemblyAI's default segmentation uses utterances (speaker turns), which routinely span 5-15 seconds. `segments[0]` often contains the first 8-12 seconds of speech, not just 0-3s. The hook agent is told this is "first spoken words" but may be reading 3x the intended hook window, diluting its diagnosis of the critical 0-3s moment.

**Concrete fix:** Filter to segments where `start <= 3.0` and join them: `transcript.segments.filter(s => s.start <= 3.0).map(s => s.text).join(' ')`. This is the same filter applied at `route.ts:1458` for `hookIdentification.spokenWords` — just not applied to the prompt context.

**Specific miss — on-screen text context is frame-unaware:** `hookIdentification.textOnScreen` flattens text from ALL extracted frames (including `later-story` frames at 8s+). The hook agent receiving this sees a merged string that may include on-screen text appearing 8 seconds in as if it were a hook-zone element. A text overlay that says "save this!" at second 10 could be credited as a first-frame hook.

**Concrete fix:** Filter `onScreenTextResults` to frames with `slot === 'opening'` before merging, or include per-frame timestamp metadata so the hook agent can see which text appeared when.

---

## Stage 4: First-5-Seconds Drop Reasoning

**Quality: WEAK**

**What it does:** `getFirstFiveSecondsDiagnosis()` in `hook-help.ts` derives `verdict`, `hookRead`, `likelyDropWindow`, `retentionRisk`, and `nextTimeFix` from the hook agent's findings + action plan P1 step.

**Specific miss — diagnosis falls back to score-based heuristics when evidence is absent:** When the P1 action plan item has no `timestampLabel` (which happens when the verdict LLM doesn't produce one, or when the fallback plan is used), `likelyDropWindow` is computed purely from score bands:

```ts
hookScore < 45 || openerFeelsSoft || noSpokenOpener ? 'likely drop: 0.0s-1.0s'
hookScore < 60 || visualScore < 55 ? 'likely drop: 1.0s-3.0s'
else: 'likely drop: 3.0s-5.0s'
```

A score of 55 on the hook maps to "1.0s-3.0s" regardless of what actually happens in those seconds. The `retentionRisk` in this fallback path becomes "cold viewers are getting an early-friction signal before the value lands" — a phrase that is both generic and jargon-heavy.

**Concrete fix:** Rather than score-band heuristics, derive drop window from the earliest timestamp in `hook.findings` or `transcript.segments` that the hook agent cited as problematic. If no timestamp evidence exists, say so explicitly: "Drop window unclear — no timestamped evidence from hook analysis." Honest uncertainty is more useful than a fake timestamp.

---

## Stage 5: Timestamped Action Plan

**Quality: WEAK**

**What it does:** Verdict LLM generates 3 action plan items, each with `timestampLabel`, `timestampSeconds`, `issue`, `evidence`, `doThis`, `example`, `whyItMatters`, and `algorithmicConsequence`.

**Specific miss — timestamps are inferred, not grounded:** The verdict prompt instructs the LLM to include `timestampLabel` and `timestampSeconds` "pointing to the moment the creator should edit first." The evidence ledger provides only the first 4 transcript segments. For dimensions like `authenticity`, `conversion`, and `visual`, there is no segment-level evidence linking a specific timestamp to the problem. The LLM reliably fills in timestamps (`"0:00-0:02"` for hook, `"0:15-0:30"` for audio) but these are pattern-matched from the dimension type, not derived from actual evidence.

**Example failure pattern:** An audio issue at 0:45 in a 90-second video gets a `timestampLabel` of `"0:00-0:30"` because the LLM defaults to "early video" timestamps for audio issues. The creator scrubs to 0:30, finds nothing, and loses trust in the tool.

**Concrete fix:** Add a post-processing step in `parseStrategicSummary()` that validates each action plan item's `timestampSeconds` against the evidence strings. If `evidence` contains a quote like `"1.2s-3.0s: 'your opening line'"`, extract and use that timestamp. If no timestamp is found in evidence, set `timestampLabel` to `null` rather than a guessed value.

**Specific miss — `example` field in fallback plan is generic:** When the fallback action plan is used (verdict JSON fails to parse), `buildFallbackExample()` returns: `Replace "[first line]" with a sharper claim, result, or curiosity gap in the first second.` This is not an actual replacement line — it's a template. The prompt explicitly says `example` should be "exact replacement spoken line, text overlay wording, or specific edit move."

**Concrete fix:** In the fallback path, construct the example from the hook agent's `improvementTip` (which is already asked to be specific) rather than a canned template string.

---

## Stage 6: Final Recommendations

**Quality: GOOD (with one structural constraint)**

**What it does:** The verdict prompt generates the 3-item action plan with `doThis` and `example` fields. The prompt explicitly requires "exact replacement spoken line" and "concrete, not vague" instructions.

**Specific miss — max_tokens: 1024 caps specificity:** All 6 agents and the verdict LLM are called with `max_tokens: 1024`. The verdict JSON alone requires: verdict (2-3 sentences), viralPotential, nichePercentile, biggestBlocker, 3 action plan items (each with 7 fields), encouragement. Under token pressure, the LLM tends to shorten `example` and `doThis` fields first. A P1 hook fix example might get truncated to "Start with your most impressive result instead of explaining it" when the prompt asked for verbatim replacement wording.

**Concrete fix:** Raise verdict `max_tokens` to 1800. The verdict is the most creator-facing output and the most token-starved. Individual agents can stay at 1024.

---

## Summary Table

| Stage | Quality | Highest-Impact Miss | Fix |
|-------|---------|--------------------|----|
| Niche Detection | **BROKEN** | filename passed as `caption`, hashtags hardcoded empty | Use `session.description`; parse `#hashtag` tokens |
| Transcription | **GOOD** | Claude fallback timestamps can be off by 2-5s | Cap Claude fallback confidence at 0.35 |
| Transcript Quality | **GOOD** | Short-transcript threshold too lenient (< 4 words) | Raise to < 8 words |
| Hook Diagnosis | **WEAK** | `segments[0]` can span 8-12s, not just 0-3s | Filter to `start <= 3.0` before passing to hook agent |
| On-Screen Text | **WEAK** | Later-story frame text merged into hook context | Filter to `slot === 'opening'` frames only |
| First-5s Reasoning | **WEAK** | Drop window from score-band heuristics, not evidence | Use earliest cited timestamp from hook findings |
| Action Plan Timestamps | **WEAK** | Timestamps inferred by LLM, not grounded in evidence | Post-process: extract timestamps from evidence strings |
| Fallback `example` | **WEAK** | Generic template, not actual replacement wording | Use agent `improvementTip` as fallback example |
| Final Recommendations | **GOOD** | `max_tokens: 1024` truncates `doThis`/`example` fields | Raise verdict to 1800 tokens |

---

## Top 3 Highest-Leverage Improvements (Ranked by Impact)

### #1 — Fix Niche Detection Inputs (Impact: HIGH — corrupts all 6 agents + verdict)

**Current:** `detectNiche({ caption: filename, hashtags: [], transcript })`. Filename is `video_abc123.mp4`. Hashtags always empty.

**Effect:** Most videos are classified into the wrong niche or default to `lifestyle`. Every agent then uses wrong benchmarks (wrong avgEngagement, wrong bestHooks, wrong optimalLength). Niche-aware scoring calibration — which every agent prompt references — is applied against the wrong content category.

**Fix:** Pass `session.description` as `caption`; extract `#word` patterns from it as `hashtags`. Two-line change in `route.ts`.

**Why it's #1:** A broken input signal corrupts all downstream outputs. Every other quality improvement is partially negated if the niche is wrong — the agents are calibrated against the wrong standard.

---

### #2 — Scope Hook Transcript to 0-3s (Impact: HIGH — directly degrades hook diagnosis quality)

**Current:** `transcript.segments[0]` is passed to the hook agent as "the creator's first spoken words." AssemblyAI utterances average 8-15s per segment. The hook agent is analyzing the wrong window.

**Effect:** Hook agent critiques content that appears at second 8 as "opening words." Misses actual word-level 0-3s analysis. Tier ranking, curiosity gap detection, and direct address detection are all evaluated on the wrong content.

**Fix:** `transcript.segments.filter(s => s.start <= 3.0).map(s => s.text).join(' ')`. Already done correctly for `hookIdentification.spokenWords` in the result — just needs to be applied to the agent context builder too.

**Why it's #2:** The hook agent is the highest-weighted dimension (30-45% of overall score). Getting the hook wrong has outsized downstream effects on analysisMode, weight distribution, and P1 action plan content.

---

### #3 — Ground Action Plan Timestamps to Evidence (Impact: MEDIUM — directly affects creator trust and executability)

**Current:** Verdict LLM generates `timestampLabel` and `timestampSeconds` values without verification that they align with actual evidence. Timestamps are inferred from dimension type, not from where the problem was observed.

**Effect:** Creators are told "edit 0:15-0:30" but the agent diagnosis doesn't cite anything at that timestamp. They scrub to the timestamp, find nothing specific, and the action plan loses credibility.

**Fix:** In `parseStrategicSummary()`, run a regex over each item's `evidence` array to extract any timestamp pattern (`\d+\.?\d*s`, `\d+:\d+`). If found, override the LLM's `timestampSeconds` with the evidence-derived value. If not found, set `timestampLabel` to `null` so the UI can render "timestamp unknown" rather than a guessed value.

**Why it's #3:** The action plan is the primary creator deliverable. Ungrounded timestamps are the most visible trust-breaking failure — they're checked immediately when a creator tries to act on feedback.