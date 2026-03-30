# RMT reliability hardening eval

## goal
Make hook, text, audio, and user-visible output feel trustworthy by fixing real failure modes instead of just tweaking prompt wording.

## failure modes found
1. **Opening-frame blindness:** frame extraction sampled the whole video evenly, so short text hooks in the first second could be skipped entirely.
2. **Weak multimodal grounding:** frames were sent to the model without timestamp labels, which made it harder to reason about first-second evidence vs later story beats.
3. **AssemblyAI path was under-hardened:** no retry wrapper, no provider preference for richer timed transcripts, and no parsing path for utterance-level results.
4. **Prompt leak risk:** raw model strings flowed straight into user-visible roast text, findings, verdicts, and action plans.

## changes shipped
- dense opening-frame sampling via `buildFramePlan()` so hook-sensitive frames are front-loaded before later story frames
- timestamp + slot labels attached to every frame prompt so agents know which frames are opening evidence
- AssemblyAI promoted to the preferred timed-transcript provider when available, with retries/backoff and utterance parsing
- user-visible strings sanitized before they can reach the product surface

## before/after hook-text evidence
### test case: 12s video with an obvious text hook visible from 0.1s to 0.9s
- **old evenly spaced plan:** `1.33, 2.67, 4.00, 5.33, 6.67, 8.00, 9.33, 10.67`
- **new hook-sensitive plan:** includes an opening frame at `0.15s`
- result: old plan misses the hook window entirely; new plan captures it

Covered by automated test:
- `tests/rmt-reliability-hardening.test.mjs`
- assertion: `new frame plan catches a short opening text hook that evenly spaced sampling misses`

## audio-path evidence
Covered by automated test:
- `parseAssemblyTranscript uses utterances when available`
- verifies AssemblyAI responses with utterance timing become structured transcript segments for downstream hook/audio analysis

## prompt-safety evidence
Covered by automated tests:
- `sanitizeUserFacingText blocks prompt leakage`
- `sanitizeAgentResult replaces leaked instructions with safe fallbacks`
- `sanitizeActionPlan strips leaked text but keeps evidence-backed steps`

## validation run
```bash
node --test --experimental-strip-types tests/rmt-reliability-hardening.test.mjs
npx eslint lib/frame-extractor.ts lib/whisper-transcribe.ts lib/analysis-safety.ts lib/caption-quality.ts 'app/api/analyze/[id]/route.ts'
npx tsc --noEmit
```

All passed locally.
