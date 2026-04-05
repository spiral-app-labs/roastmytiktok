# transcript and audio edge cases eval

## scope
Harden the local ffmpeg + transcription fallback path so weak audio evidence does not contaminate the final diagnosis.

## before
- any non-empty transcript could flow into hook, caption, authenticity, conversion, and algorithm prompts
- music-heavy or speech-light clips could still surface thin or misleading quotes
- result payload exposed provider/confidence, but did not explicitly say whether the transcript was safe to trust

## after
- a transcript-quality gate now classifies each transcript as `usable`, `degraded`, or `unavailable`
- degraded transcripts are confidence-capped and withheld from non-audio prompt paths
- audio analysis still proceeds using ffmpeg waveform evidence, silence gaps, loudness, and music/speech detection
- result payload now carries `transcriptQuality` + `transcriptQualityNote` so the UI/debug surface can stay honest about what happened

## before/after examples
### empty transcript
- before: downstream code had to infer intent from missing transcript fields
- after: assessment returns `unavailable`, quotes are blocked, and analysis falls back to waveform-only audio evidence
- automated proof: `empty transcript cases are handled safely`

### music-heavy clip with junk transcript
- before: a tiny transcript like `yeah yeah yeah` could still look quotable
- after: assessment marks it `degraded`, caps confidence, and withholds transcript evidence from the diagnosis
- automated proof: `music-heavy clips degrade gracefully instead of poisoning downstream diagnosis`

### speech-light clip with partial words
- before: short partial text could leak into hook/authenticity/conversion analysis
- after: assessment marks it `degraded` and uses only waveform/audio-structure evidence for that lane
- automated proof: `speech-light partial transcripts stay honest even when text exists`

### clean spoken clip
- before: worked
- after: still works, and remains explicitly marked `usable`
- automated proof: `strong spoken transcripts remain usable for quoted evidence`

## qa run
```bash
node --test --experimental-strip-types tests/rmt-reliability-hardening.test.mjs
npm run lint -- --file lib/transcript-quality.ts --file lib/whisper-transcribe.ts --file lib/speech-music-detect.ts --file 'app/api/analyze/[id]/route.ts'
```
