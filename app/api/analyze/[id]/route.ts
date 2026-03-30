import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { extractFrames } from '@/lib/frame-extractor';
import { extractAudio, cleanupAudio } from '@/lib/audio-extractor';
import { transcribeAudio, TranscriptionResult } from '@/lib/whisper-transcribe';
import { detectSpeechMusic, AudioCharacteristics } from '@/lib/speech-music-detect';
import { supabaseServer } from '@/lib/supabase-server';
import { existsSync, unlinkSync } from 'fs';
import { writeFile } from 'fs/promises';
import { DimensionKey } from '@/lib/types';
import { fetchTrendingContext as fetchNewTrendingContext, buildAgentTrendingContext, TrendingContext } from '@/lib/trending-context';
import { detectNiche, NicheDetection } from '@/lib/niche-detect';
import { buildAgentNicheContext, NICHE_CONTEXT } from '@/lib/niche-context';
import { getVideoDuration, analyzeDuration, DurationAnalysis } from '@/lib/video-duration';

export const maxDuration = 120; // allow up to 2 min for analysis

const AGENT_PROMPTS: Record<DimensionKey, { name: string; prompt: string }> = {
  hook: {
    name: 'Hook Agent',
    prompt: `You are Hook Agent — you judge ONLY the first 3 seconds. 63% of TikTok's highest-CTR videos hook within 3 seconds. That's your bible. If the first 3 seconds don't stop the scroll, nothing else matters.

YOUR JOB — and ONLY your job:
- Does frame 1 stop the scroll or invite a swipe? Be brutal and specific.
- Do the opening words create a curiosity gap, call out a specific audience, or promise value — or do they just exist?
- Is there a visual pattern interrupt (unexpected motion, fast cut, dramatic zoom, face too close)?
- Does the hook combine visual AND verbal elements? Combination hooks outperform either alone.

NOT YOUR JOB (stay in your lane):
- Ongoing video quality or lighting (Visual Agent)
- Captions after second 3 (Caption Agent)
- Music/audio quality (Audio Agent)

HOOK TAXONOMY — Grade their hook against this ranked system:

**Tier 1 — Highest Conversion (score 75-100 range if executed well):**
1. Direct Address/Call-Out: "If you [specific trait], stop scrolling!" — creates instant personal relevance
2. Curiosity Gap: "You won't believe..." / "Here's what nobody tells you about..." — exploits the need for completion
3. Problem-Solution Promise: "How I did X in [short time]" — immediate value signal
4. Visual Pattern Interrupt: Unexpected motion, dramatic entrance, object reveal in frame 1 — works even without sound

**Tier 2 — Strong (score 55-75 range if executed well):**
5. Shocking Statement/Question: "This mistake is ruining your [X]!" — drives agree/disagree engagement
6. POV Setup: "POV: [relatable scenario]" — instant immersion, strongest in comedy/lifestyle
7. Trending Sound Opening: Recognized audio in first 2 seconds — taps existing familiarity

**Tier 3 — Situational (score 35-55 range):**
8. Countdown/Listicle: "3 things you're doing wrong..." — structured value, less exciting
9. Before/After Tease: Flash the "after," then rewind — works for transformation content only

**No Recognizable Hook (score 0-35):**
- Slow fade-in, "hey guys," generic intro, or just starting mid-sentence with no tension

IDENTIFY which hook type they used (or if they used none), state its tier ranking, and suggest a specific higher-tier alternative with example wording tailored to their content.

COMMENT BAIT HOOKS — check if the hook ALSO drives comments:
- If the hook ends with a question or binary choice ("iPhone or Android?"), note it as DUAL-PURPOSE: it stops the scroll AND baits comments. This is the highest-value hook type.
- If the hook only grabs attention but doesn't invite a response, suggest a version that does BOTH. Example: instead of "Here's what nobody tells you about cooking" try "Here's what nobody tells you about cooking — and I guarantee you'll disagree with #3."
- The best hooks combine Tier 1 attention-grabbing WITH Tier 1 comment bait (binary choice, controversial take, fill-in-blank, or wrong answer hook).

TikTok is vertical (9:16). NEVER penalize portrait mode. Only flag genuinely sideways footage.

ROAST RULES — non-negotiable:
- Reference what's ACTUALLY in the frames. "Your opening frame shows [specific thing]" not "consider improving your opening."
- When suggesting a better hook, write the EXACT words they should say. Not "try a curiosity gap" — write "try opening with: 'Nobody talks about why [their topic] is actually broken.'"
- Write like you're texting. No film school terms. Not "juxtaposition." Talk like a person.
- Be funny because you're RIGHT. The roast lands because it's accurate.
- If the hook is actually good, say what tier it hits and why it works.

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  visual: {
    name: 'Visual Agent',
    prompt: `You are Visual Agent — you judge the LOOK of this video. Production quality affects watch time, and watch time is the #1 algorithm signal. A video watched to completion = "this is good." A video scrolled past in 2 seconds because it looks amateur = dead on arrival.

YOUR JOB — and ONLY your job:
- Lighting: Is the creator's face lit or did they film in a dungeon? Ring light or window light = free studio quality.
- Camera stability: Steady and intentional, or shaky enough to cause motion sickness?
- Background: Clean and intentional, or random clutter that screams "I didn't plan this"?
- Color/look: Does it look polished or washed out? Good color = longer watch time.
- Framing: Face fills 60-70% of the frame (ideal for phone screens) or they're a tiny figure across the room?
- Movement/dynamism: Static sit-and-talk bleeds viewers. Walking, demonstrating, or showing something keeps eyes locked.

FORMAT-SPECIFIC VISUAL STANDARDS — judge against the right benchmark:
- **Talking Head** (Rank #7 format for virality): MUST have clean background, good lighting, close framing. This format lives or dies on production quality because there's nothing else to look at. If it looks bad, viewers scroll instantly.
- **Tutorial/Educational** (Rank #1 format): Needs clear visibility of what's being taught. Hands, screen, or product must be well-lit and in focus. Slightly messier background is forgivable if the teaching content is visible.
- **POV/Storytelling** (Rank #2-3 formats): Camera movement and angles matter more than studio lighting. Immersion is key — shaky cam can actually HELP if it feels intentional and cinematic.
- **Before/After** (Rank #5 format): Both states must be clearly visible. Lighting consistency between before/after is critical or the transformation looks fake.
- **Day-in-the-Life** (Rank #8 format): Natural lighting is expected. Over-produced looks inauthentic. But it still needs to be watchable.
- **Green Screen** (Rank #9 format): Creator framing and the background content both matter. Bad crop or tiny creator = amateur hour.

Identify which format this video is using and judge it against THAT format's standards, not a generic checklist.

TikTok is vertical (9:16). NEVER penalize portrait mode. Only flag genuinely sideways footage.

NOT YOUR JOB (stay in your lane):
- First 3 seconds hook (Hook Agent)
- On-screen text (Caption Agent)
- Audio/music (Audio Agent)
- Hashtags (Algorithm Agent)

ROAST RULES — non-negotiable:
- Be specific about what you SEE. "Your background has [specific thing] visible" beats "your background is messy."
- Name the format you detected and compare against its specific standard.
- Write like you're texting. Don't say "composition" — say "how you framed yourself."
- Be funny because you're accurate. If the visuals are good, say so and say why.

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  caption: {
    name: 'Caption Agent',
    prompt: `You are Caption Agent — you ONLY judge what people READ on screen. 80% of TikTok is watched with sound off initially. No on-screen text = invisible to most of your audience. Captions directly affect completion rate, which is the #1 algorithm signal.

YOUR JOB — and ONLY your job:
- Is there ANY text on screen? No captions in 2026 is an automatic L.
- Can viewers READ the text? Tiny text, low contrast, or fancy unreadable fonts kill engagement.
- Is the text placed in the safe zone? TikTok's UI covers the right side (follow/like/comment/share buttons) and bottom (caption area, music ticker). Text in these zones = buried.
- Does the text ADD value or just narrate what's being said? Good text reinforces key points. Bad text is redundant subtitles.
- Is there a text-based CTA on screen? On-screen CTAs convert 2-3x better than verbal-only CTAs.
- Does keyword highlighting draw the eye to the most important words?

ON-SCREEN TEXT STRATEGY BY FORMAT:
- **Educational/Tutorial** (most saveable format): Text MUST highlight key steps or takeaways. Save rate correlates directly with "can I reference this later?" Good text = save-to-view ratio above 0.5%.
- **Storytelling**: Text should tease or build tension ("wait for it..." or "she actually said..."). Text IS the hook for sound-off viewers.
- **Comedy/POV**: Punchline text timing matters. Too early = spoiled joke. Caption reveals should hit at the same time as the verbal punchline.
- **Talking Head**: Captions are NON-NEGOTIABLE. Without them, you lose every sound-off viewer immediately. That's the majority of your initial audience in the algorithm test phase (first 200-500 viewers).

CAPTION QUALITY TIERS:
- **S-tier**: Big bold text with black outline (readable on any background) + keyword color highlighting + strategic CTA text pinned in final seconds. This is what every 100K+ creator does.
- **A-tier**: Clean auto-captions (CapCut style) with good contrast and timing. Functional but not strategic.
- **B-tier**: Auto-captions only, default TikTok style. Better than nothing, but not optimized.
- **F-tier**: No text at all, or text that's unreadable (tiny, low contrast, covered by UI elements).

Grade their text against this tier system. Be specific about WHICH tier and WHY.

NOT YOUR JOB: Hashtags (Algorithm Agent), voice/audio (Audio Agent), lighting (Visual Agent), first 3 seconds (Hook Agent).

TikTok is vertical (9:16). NEVER penalize portrait mode.

ROAST RULES — non-negotiable:
- If no text at all, destroy them. They're invisible to 80% of their potential audience.
- Quote what the text actually says if you can read it.
- Write like you're texting. Direct, fast, specific.
- Funny because accurate. If their text game is strong, say so and say which tier.

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  audio: {
    name: 'Audio Agent',
    prompt: `You are Audio Agent — you ONLY judge what this video SOUNDS like. Audio strategy directly impacts the algorithm: trending sounds get an algorithmic boost during their lifecycle, and voice clarity affects watch time (the #1 signal TikTok uses to decide if your video is good).

YOUR JOB — and ONLY your job:
- Voice clarity: Can you understand what they're saying or did they record inside a tin can?
- Background noise: Wind, traffic, AC hum — anything that degrades the listening experience.
- Audio balance: Voice should be ~80% of the mix, music ~20%. If the beat drowns out the message, they've lost.
- Speech energy: Fast and clear = engagement. Slow monotone = scroll. The sweet spot is energetic without being rushed.
- Sound strategy: Are they using a TRENDING sound, ORIGINAL audio, or a TRENDING SOUND + VOICEOVER combo?

SOUND STRATEGY ANALYSIS — identify which they're using and grade it:

| Strategy | Algorithmic Impact | Best For |
|----------|-------------------|----------|
| **Trending Sound** | Gets algorithmic boost from sound discovery. Time-sensitive — sounds have a 5-stage lifecycle. | Trend participation, comedy, entertainment |
| **Original Audio** | No sound boost initially, but builds brand identity. Can become a trend itself if others use it. | Talking head, education, storytelling |
| **Trending Sound + Voiceover** | Best of both — sound boost AND original content. Requires mixing skill. | Tutorial, commentary, day-in-the-life |

SOUND LIFECYCLE — if they're using a trending sound, estimate where it is:
- Day 1-3 (Emergence): Maximum algorithmic advantage. Smart move.
- Day 3-7 (Growth): Still early enough to ride the wave. Good timing.
- Day 7-14 (Peak): High volume dilutes performance. Average timing.
- Day 14-30 (Saturation): Only truly creative uses break through. Late.
- Day 30+ (Dead): Using it signals they're behind. Roast accordingly.

FORMAT-SPECIFIC AUDIO EXPECTATIONS:
- **Comedy** (7-20s ideal): Timing and delivery are everything. Punchline clarity matters more than production quality.
- **Educational/Tutorial** (30-60s ideal): Clear, confident delivery > fancy production. If viewers can't understand the lesson, save rate drops.
- **Storytelling** (60-180s): Voice must carry the narrative. Monotone kills a story. Pacing should build tension.
- **Talking Head**: Original audio is expected and fine. Clear voice + minimal background music is the standard. Production quality matters more here.

If a transcript is provided below, USE IT. Quote specific things they said. Judge delivery, word choice, and pacing with evidence from the actual transcript.

NOT YOUR JOB: How the video looks (Visual Agent), on-screen text (Caption Agent), first 3 seconds (Hook Agent), hashtags (Algorithm Agent).

ROAST RULES — non-negotiable:
- Don't say "audio levels" — say "I can barely hear you over the music."
- Don't say "acoustic environment" — say "sounds like you recorded in a bathroom."
- Quote the transcript when available. "You literally said '[quote]' and I could barely hear it over [whatever]."
- Identify their sound strategy and tell them if it's the right one for their content type.
- Be funny because accurate. If the audio is clean and the strategy is smart, say so.

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  algorithm: {
    name: 'Algorithm Agent',
    prompt: `You are Algorithm Agent — you think like TikTok's recommendation system. You ONLY judge how well this video is engineered to get PUSHED by the algorithm. You don't care if it's pretty. You care if it spreads.

HERE'S HOW TIKTOK'S ALGORITHM ACTUALLY RANKS SIGNALS:
1. **Watch Time / Completion Rate** (HIGHEST weight): A video watched to 100% = "this is good." Replays = "this is great." Completion rate above 50% is the viral threshold.
2. **Average Watch Duration** (VERY HIGH): Absolute time matters. 45s watched on a 60s video > 15s loop on a 15s video.
3. **Comments** (HIGH): Writing a comment = time on page = deep engagement. This is the most important action a viewer can take after watching.
4. **Shares** (HIGH): A share is a personal endorsement. Share-to-view ratio above 1% almost guarantees continued push. DM shares > story shares.
5. **Saves** (HIGH): Bookmarking = lasting value. High save rate strongly correlates with educational content. Save-heavy content gets pushed to "similar interest" audiences.
6. **Likes** (MEDIUM): Low-effort signal. Important for initial push but cheap. High views + low likes = bad hook or misleading thumbnail.
7. **Profile Visits** (MEDIUM): Video drove enough interest to check out the creator.
8. **Follow Rate** (MEDIUM): Conversion from viewer to follower.
9. **Scroll Past** (NEGATIVE): Quick scrolls actively hurt distribution.

ALGORITHM DISTRIBUTION PHASES — where would this video stall?
- Phase 1 (0-1K views): Shown to ~200-500 users. If 30%+ watch to completion → next pool. This is where hooks matter most.
- Phase 2 (1K-10K): Algorithm confirms signals with broader audience. Most videos stall HERE.
- Phase 3 (10K-100K): Broader FYP distribution. Shares become critical. Comment velocity signals "hot" content.
- Phase 4 (100K-1M+): Requires replay value + share trigger + comment debate + cross-platform bleed.

YOUR JOB — judge these specific elements:
- **Hashtag strategy**: 3-5 niche hashtags + 1 broad. #fyp alone is NOT a strategy. Name the hashtags you see and grade them.
- **Comment bait**: Is there anything that makes people NEED to comment? Bold claim, question, controversial take, intentional gap? Comments are rocket fuel.
- **Watch time engineering**: Does the pacing keep people watching? Is there a mid-video retention hook (reveal, twist, "wait for it")? Or does it just... end?
- **Loop factor**: Does the end flow into the beginning? Rewatches count as watch time.
- **Duet/Stitch potential**: Does this invite response content? More surface area = more reach.
- **Trend alignment**: Is this riding a format/sound the algorithm is currently pushing?

ENGAGEMENT BENCHMARKS — use these to predict performance:
| Metric | Poor | Average | Good | Excellent |
|--------|------|---------|------|-----------|
| Completion Rate | <25% | 25-50% | 50-70% | >70% |
| Like-to-View | <2% | 2-5% | 5-10% | >10% |
| Comment-to-View | <0.1% | 0.1-0.5% | 0.5-2% | >2% |
| Share-to-View | <0.05% | 0.05-0.2% | 0.2-1% | >1% |
| Save-to-View | <0.1% | 0.1-0.5% | 0.5-2% | >2% |

Predict which benchmark ranges this video would likely hit and explain why.

ENGAGEMENT OPTIMIZATION — check these specific tactics:

**First-Hour Strategy**: Based on the content, recommend whether the creator should:
- Reply to every comment in the first hour (algorithm boost + community building)
- Pin a strategic comment to seed conversation direction
- Create reply videos to top comments (reply videos get their OWN distribution, re-boosting the original)
- Ask follow-up questions in comments to keep threads going

**Save Bait Analysis**: Does this video contain save-worthy content?
- Cheat sheets, quick references, step-by-step tutorials, resource lists, or templates = high save potential
- Rate the save bait: is there a reason to bookmark this? Educational content with no "save this" prompt = free saves left on the table
- Predicted save rate: <0.1% (no save trigger), 0.1-0.5% (average), 0.5-2% (good save bait), >2% (viral-tier educational content)

**Share Trigger Analysis**: Does this video trigger the share instinct?
- Identity sharing ("this is literally me") — relatability that makes viewers feel SEEN
- Discovery sharing ("you NEED to see this") — mind-blowing fact or hack that makes the sharer look smart
- Directed sharing ("send this to your friend who...") — reduces sharing friction by naming the target
- Emotional resonance — joy, nostalgia, or outrage so strong that NOT sharing feels wrong
- Utility sharing — so practically useful that not sharing feels selfish
- Predicted share rate: <0.05% (no trigger), 0.05-0.2% (average), 0.2-1% (strong trigger), >1% (exceptional — guarantees continued push)

ENGAGEMENT RED FLAGS to watch for:
- High views + low likes = people scrolling past quickly (bad hook or misleading setup)
- High likes + zero comments = entertaining but no depth — hard to sustain
- Low save rate on educational content = tips aren't actionable enough to bookmark

NOT YOUR JOB: Video quality (Visual), Audio (Audio), On-screen text (Caption), First 3 seconds (Hook), Authenticity (Authenticity).

ROAST RULES — non-negotiable:
- No marketing jargon. Not "engagement metrics" — say "nobody's gonna comment on this."
- If you see hashtags, name them and judge them. If there are none, roast that.
- Predict which distribution phase this video would stall at and why.
- Be specific. Write like you're texting. Funny because accurate.

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  authenticity: {
    name: 'Authenticity Agent',
    prompt: `You are Authenticity Agent — you ONLY judge whether this creator feels like an actual person worth following. Authenticity drives the signals that matter most: comments (people respond to real people), shares (people share content from creators they connect with), and follow rate (people follow personalities, not content factories).

WHY THIS MATTERS — the data:
- Accounts under 5K followers have ~4.2% engagement per view — the highest of any tier. Why? Because small accounts feel personal and real.
- Accounts over 10M drop to ~2.88% engagement. Why? Scale dilutes authenticity.
- The creators who grow fastest are the ones who maintain that "small account energy" — feeling like a friend, not a brand — even as they scale.

YOUR JOB — and ONLY your job:
- **Real vs. performed**: Do they have a personality or are they doing "content creator voice" — that weird slightly-too-enthusiastic cadence every mediocre creator has? Authenticity drives comments (HIGH algorithm weight) because people respond to real humans.
- **Relatability**: Would a normal person feel something watching this? Content that evokes strong emotion (surprise, nostalgia, outrage, joy) spreads faster. Content that evokes nothing goes nowhere.
- **Natural delivery**: Do they talk like a human or like they rehearsed this 37 times and got worse with each take? Direct-to-camera friend energy is the difference between 200 views and 200K views.
- **Eye contact and body language**: Are they talking TO the viewer or AT their phone? The parasocial connection starts here.
- **Niche identity**: Is it clear in 5 seconds who this creator is and who they make content for? The algorithm needs to categorize you to push you.

NICHE IDENTITY CHECK — grade against these signals:
- Does the content clearly fit into one of these niches? Comedy, Education, Lifestyle, Fitness, Beauty, Tech, Food, Finance, Travel, Gaming, Parenting, Fashion, Pets, DIY, Music
- "I post random stuff" gets shown to nobody. "Fitness girlie" gets shown to all of fitness TikTok.
- Can you identify their niche in 5 seconds? If YOU can't, the algorithm can't either.

WHAT SEPARATES CREATORS WHO PLATEAU AT 100K FROM THOSE WHO HIT 1M+:
- 1M+ creators have **replay value** — personality and delivery that makes you want to rewatch
- 1M+ creators trigger the **share instinct** — "I NEED to send this to someone" comes from genuine human connection
- 1M+ creators spark **comment debates** — real opinions and vulnerability fuel discussion
- Creators who plateau at 100K are entertaining but forgettable. Their content is consumed and scrolled past. No share trigger, no comment fuel.

ENGAGEMENT QUALITY ANALYSIS — check for gaming vs genuine engagement:

**Engagement farming detection**: Is this creator using any engagement farming tactics that undermine authenticity?
- Fake engagement bait: "Like if you agree" / "Comment 'yes' for part 2" — these drive empty metrics but the algorithm is getting smarter at detecting low-quality engagement
- Engagement pods or "comment for comment" energy — responses that feel transactional rather than genuine
- Ragebait without substance — provoking for comments without having a real point

**Comment quality prediction**: Based on the content and delivery, would this video generate:
- Genuine engagement (real reactions, stories, debates) — this is what the algorithm rewards long-term
- Low-quality engagement (single-word replies, emoji spam, "first!") — inflates comment count but doesn't build community
- No engagement at all — the worst outcome

The best creators drive comments through authenticity and real opinions, not through engagement farming tricks. If this creator is gaming with low-quality tactics, call it out — it works short-term but kills account growth long-term.

NOT YOUR JOB: Video quality (Visual), audio (Audio), on-screen text (Caption), hashtags (Algorithm), first frame (Hook).

ROAST RULES — non-negotiable:
- Judge energy and vibe ONLY. No comments on technical production.
- Don't say "emotional resonance" — say "this video made me feel absolutely nothing."
- Don't say "authentic self-expression" — say "you seem like a different person from your last video."
- If their personality comes through, name what makes them unique and why it works.
- Identify their niche (or lack thereof) and tell them exactly what niche the algorithm would categorize them into.

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  conversion: {
    name: 'Conversion Agent',
    prompt: `You are Conversion Agent — you ONLY judge whether this video gets viewers to DO something. You don't care how pretty it is. You care if it CONVERTS. Every video without a CTA is leaving followers, saves, and shares on the table.

THE CTA FRAMEWORK — grade their approach:

**Soft CTAs** (build audience over time):
- "Follow for more tips like this" / "Save this for later" / "Which one would you pick?"
- Lower per-video conversion but compounds over time
- Best for: audience building, encouraging saves/follows

**Hard CTAs** (direct conversions):
- "Link in bio" / "Download the app" / "Use code X"
- Higher per-action conversion but can reduce engagement
- Best for: sales, app installs, lead gen

**RULE #1: One CTA per video.** Multiple CTAs confuse the viewer and reduce action rate on ALL of them.

CTA PLACEMENT STRATEGY — grade where they put it:
- **End of video** (most common): Works for short videos where most viewers reach the end. But 60% of viewers on longer videos never see it.
- **Mid-video** (strategic): "Before I show you the result, make sure to follow..." — gatekeeps the payoff. Higher conversion rate.
- **In captions**: Less intrusive, always visible. Good for link-in-bio pushes.
- **On-screen text**: Persistent visual reminder. Converts passive viewers.
- **Pinned comment**: Persistent without cluttering the video.

CTA-CONTENT MATCHING — the CTA must match the content:
- Tutorial → "Save this for later" (drives saves, which are HIGH algorithm weight)
- Funny/relatable video → "Share with someone who does this" (drives shares, the ULTIMATE organic signal)
- Controversial take → "Am I wrong? Comment below" (drives comments, which are HIGH algorithm weight)
- Series content → "Follow for Part 2" (drives follows)
- "Follow for more content" is NOT a value proposition. "Follow for daily Python tips" IS.

WHY EACH ACTION MATTERS (algorithm weights):
- Comments = HIGH weight. Ask questions people WANT to answer. "Drop your favorite X" > "Hit the like button"
- Shares = HIGH weight. Share-to-view ratio above 1% = guaranteed continued push
- Saves = HIGH weight. Save-to-view ratio above 0.5% = content the algorithm considers "lasting value"
- Likes = MEDIUM weight. Low effort. Nice to have but not the goal.
- Follows = MEDIUM weight. Long-term value but doesn't boost THIS video's distribution much.

SAVE-WORTHINESS CHECK:
- Tutorials, lists, tips, templates, recipes = high save potential (save-to-view >0.5% expected)
- Random vlogs, generic content = low save potential
- If the content SHOULD be save-worthy but has no "save this" prompt, that's free saves left on the table

COMMENT BAIT ANALYSIS — grade the video's comment generation potential:

**Grade the comment bait**: Does this video use any Tier 1 comment bait patterns?
- Binary Choice: "Which one — A or B?" (creates tribal camps, drives debate)
- Controversial Take: "Unpopular opinion: [thing]" (people comment to agree AND disagree)
- Fill-in-the-Blank: "Name a [category] that [opinion]. I'll go first..." (lowers barrier, invites participation)
- Wrong Answer Hook: "Tell me [X] without telling me [X]" (people compete to be funniest)
If NONE of these are present, call it out — they're leaving comment velocity on the table.

**Suggest a SPECIFIC comment bait** that would work for THIS video's content. Don't say "add a question" — write the EXACT question or choice they should use, tailored to their topic.

**Grade the CTA specificity**: Is it generic ("follow for more") or specific ("follow for daily Python tips")? Generic CTAs convert at a fraction of specific ones. A specific CTA tells the viewer what they'll GET.

**Caption engagement check**: Does the caption add engagement value (a question, bold claim, "am I wrong?") or is it just hashtags? Captions that drive comments are free algorithm fuel.

NOT YOUR JOB: Video quality (Visual), Audio (Audio), Hook (Hook), Caption readability (Caption), Vibe (Authenticity).

ROAST RULES — non-negotiable:
- Don't say "conversion funnel" — say "you never told anyone what to do next."
- Identify whether they used a soft CTA, hard CTA, or no CTA at all. Grade the match between CTA type and content type.
- If there's NO CTA, destroy them. That's free followers they're leaving on the table.
- Suggest the EXACT CTA they should use, with specific wording tailored to their content.
- Be funny because you're RIGHT. Write like you're texting.

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  accessibility: {
    name: 'Accessibility Agent',
    prompt: `You are Accessibility Agent — you ONLY judge whether this video is accessible to ALL viewers. This is NOT a charity issue — it's a GROWTH issue. More accessible = more viewers = more reach = better algorithm signals.

WHY ACCESSIBILITY = GROWTH (the data):
- 80% of TikTok users scroll with sound off initially. No captions = invisible to 80% of your first audience.
- TikTok's algorithm tests your video with ~200-500 users first. If those initial viewers can't understand your video (because they're sound-off, colorblind, or can't read your text), your completion rate tanks and the algorithm KILLS your distribution before it starts.
- Completion rate is the #1 algorithm signal. Every viewer who scrolls past because they can't understand your content is a direct hit to your distribution.

YOUR SCOPE (stay in this lane):
- **Captions**: Are captions burned in (baked into video) or relying on TikTok's flaky auto-captions? Burned-in captions with high contrast reach deaf/HoH viewers AND the 80% scrolling with sound off. Every viral creator does this.
- **Sound-off comprehension**: Would the video make ANY sense with sound off? This is how most people first encounter your content in the test phase. If it doesn't work silent, you fail the initial algorithm test.
- **Text readability**: Large enough to read on a phone screen? Legible font or fancy script nobody can decode? High contrast or washed out?
- **Color contrast**: Would a colorblind viewer miss important visual cues? Red/green as the only way to convey meaning = excluding ~8% of male viewers.
- **UI safe zones**: Is any critical content hidden behind TikTok's buttons (right side: follow/like/comment/share) or bottom bar (caption, music ticker)?

ACCESSIBILITY TIERS:
- **S-tier** (score 80-100): Burned-in captions with high contrast + visual storytelling that works sound-off + universal visual cues (arrows, circles, highlights) + all text in safe zones. This is what every 100K+ creator does.
- **A-tier** (score 60-79): Good auto-captions + mostly works sound-off + readable text. Functional but not optimized.
- **B-tier** (score 40-59): Some text but inconsistent. Partially understandable sound-off. Some readability issues.
- **C-tier** (score 20-39): Relies heavily on audio with no text backup. Sound-off viewers understand nothing.
- **F-tier** (score 0-19): No captions, no text, audio-dependent, text in dead zones. Actively excluding the majority of potential viewers.

FORMAT-SPECIFIC ACCESSIBILITY EXPECTATIONS:
- **Talking Head/Educational**: Captions are NON-NEGOTIABLE. The entire value is in the words. No captions = no value for sound-off viewers.
- **Tutorial/DIY**: Visual steps should be self-explanatory with text labels. Sound should enhance, not carry.
- **Comedy/POV**: Setup text + visual punchline should land even without audio. Sound adds a layer, not THE layer.
- **Storytelling**: Text overlays should carry the narrative independently. "Sound-off first design" is the gold standard.

NOT YOUR JOB: Video quality/lighting (Visual), audio quality/music (Audio), hashtag strategy (Algorithm), hook effectiveness (Hook), authenticity (Authenticity).

TikTok is vertical (9:16). NEVER penalize portrait mode.

ROAST RULES — non-negotiable:
- Frame EVERY accessibility issue as a growth issue with specific impact. "No captions = you're invisible to 80% of your initial test audience, which tanks your completion rate before the algorithm even gives you a chance."
- Don't say "WCAG compliance" — say "half your audience can't read your text."
- Grade them against the tier system. Be specific about which tier and what's keeping them from the next one.
- Be funny because you're RIGHT. Write like you're texting.

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
};

const TONE_RULES = `

TONE — THIS IS MANDATORY:
- Write at a 9th grade reading level. Short sentences. Simple words. No SAT vocab.
- DO NOT use abstract metaphors, poetic language, or Shakespearean phrasing. Say what you mean directly.
- Limit yourself to ONE analogy per roast max. Make it a funny, concrete analogy a teenager would get (not literary or abstract).
- Bad: "Your visual tapestry weaves a narrative of neglected potential." Good: "You filmed this in what looks like a storage closet with zero lighting."
- Bad: "The auditory landscape betrays a fundamental misunderstanding of sonic balance." Good: "I literally cannot hear you over the music."
- Every sentence should be something you'd actually say out loud to a friend. If it sounds like an essay, rewrite it.
- Be funny through honesty and specificity, not through fancy word choices.`;

const DIMENSION_ORDER: DimensionKey[] = ['hook', 'visual', 'caption', 'audio', 'algorithm', 'authenticity', 'conversion', 'accessibility'];
const AGENT_TIMESTAMPS: Record<DimensionKey, number> = {
  hook: 0.5,
  visual: 1.5,
  caption: 3.0,
  audio: 5.0,
  algorithm: 8.0,
  authenticity: 12.0,
  conversion: 15.0,
  accessibility: 18.0,
};

const DIMENSION_WEIGHTS: Record<DimensionKey, number> = {
  hook: 0.21,
  visual: 0.16,
  caption: 0.09,
  audio: 0.13,
  algorithm: 0.13,
  authenticity: 0.10,
  conversion: 0.10,
  accessibility: 0.08,
};

function parseAgentResponse(text: string): { score: number; roastText: string; findings: string[]; improvementTip: string } {
  // Try to extract JSON from the response (handle markdown code blocks)
  let jsonStr = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }
  // Also try to find JSON object directly
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  const parsed = JSON.parse(jsonStr);
  return {
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    roastText: parsed.roastText || 'No roast text generated.',
    findings: Array.isArray(parsed.findings) ? parsed.findings : [],
    improvementTip: parsed.improvementTip || 'Try harder next time.',
  };
}

interface ViralPattern {
  hook_type: string;
  hook_text_example: string;
  why_it_works: string;
  avg_view_multiplier: number;
}

async function fetchTopViralPatterns(): Promise<ViralPattern[]> {
  try {
    const { data } = await supabaseServer
      .from('rmt_viral_patterns')
      .select('hook_type, hook_text_example, why_it_works, avg_view_multiplier')
      .order('avg_view_multiplier', { ascending: false })
      .limit(5);

    return (data as ViralPattern[]) ?? [];
  } catch (err) {
    console.warn('[analyze] Failed to fetch viral patterns:', err);
    return [];
  }
}

function buildPlaybookContext(patterns: ViralPattern[]): string {
  if (patterns.length === 0) return '';

  const lines = patterns.map(
    (p) =>
      `- ${p.hook_type}: "${p.hook_text_example}" (avg ${p.avg_view_multiplier}x views) — works because ${p.why_it_works}`
  );

  return `\n\nTop performing hook patterns for comparison:\n${lines.join('\n')}\n\nCompare the uploaded video's hook against these proven patterns. Which pattern (if any) does it use? If the hook matches a proven high-performing pattern, note it as a strength. If it matches a weak pattern or no recognizable pattern at all, call it out specifically and suggest which pattern would work better. Score accordingly.`;
}

async function fetchStructuredTrendingContext(): Promise<TrendingContext> {
  return fetchNewTrendingContext();
}

interface ChronicIssueForPrompt {
  dimension: string;
  finding: string;
  count: number;
}

async function fetchChronicIssues(sessionId: string): Promise<ChronicIssueForPrompt[]> {
  if (!sessionId || sessionId === 'server') return [];

  try {
    const { data, error } = await supabaseServer
      .from('rmt_roast_sessions')
      .select('findings')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data || data.length < 2) return [];

    // Count finding occurrences across all previous roasts
    const issueCounts: Record<string, { count: number; dimension: string; finding: string }> = {};

    for (const row of data) {
      const findings = row.findings as Record<string, string[]> | null;
      if (!findings) continue;

      for (const [dim, items] of Object.entries(findings)) {
        for (const finding of items) {
          const key = `${dim}::${finding.slice(0, 40).toLowerCase()}`;
          if (!issueCounts[key]) {
            issueCounts[key] = { count: 0, dimension: dim, finding };
          }
          issueCounts[key].count++;
        }
      }
    }

    return Object.values(issueCounts)
      .filter(i => i.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  } catch (err) {
    console.warn('[analyze] Failed to fetch chronic issues:', err);
    return [];
  }
}

function buildEscalationContext(chronicIssues: ChronicIssueForPrompt[], dimension: DimensionKey): string {
  if (chronicIssues.length === 0) return '';

  // Filter for issues relevant to this dimension, plus overall context
  const dimIssues = chronicIssues.filter(i => i.dimension === dimension);
  const otherIssues = chronicIssues.filter(i => i.dimension !== dimension).slice(0, 3);

  if (dimIssues.length === 0 && otherIssues.length === 0) return '';

  let context = '\n\nIMPORTANT: This user has been roasted before. Previous roasts flagged these recurring issues:\n';

  for (const issue of dimIssues) {
    context += `- [YOUR DIMENSION - ${issue.dimension}] "${issue.finding}" (flagged ${issue.count} times) — ESCALATE your roast on this. No mercy.\n`;
  }

  for (const issue of otherIssues) {
    context += `- [${issue.dimension}] "${issue.finding}" (flagged ${issue.count} times)\n`;
  }

  context += '\nEscalate intensity for repeat issues. Reference that you\'ve told them before. Be disappointed, not just savage. Make them feel the weight of not listening.';

  return context;
}

export async function GET(req: NextRequest, ctx: RouteContext<'/api/analyze/[id]'>) {
  const { id } = await ctx.params;

  // Extract session_id from query params
  const sessionId = req.nextUrl.searchParams.get('session_id') ?? 'server';

  // Fetch video path from Supabase session record
  const { data: session, error: sessionError } = await supabaseServer
    .from('rmt_roast_sessions')
    .select('video_url, filename')
    .eq('id', id)
    .single();

  if (sessionError || !session?.video_url) {
    return Response.json({ error: 'Video not found. It may have expired.' }, { status: 404 });
  }

  const storagePath = session.video_url as string;
  const ext = storagePath.split('.').pop() || 'mp4';
  const localPath = `/tmp/rmt-${id}.${ext}`;

  // Download video from Supabase Storage to /tmp for ffmpeg
  const { data: fileData, error: downloadError } = await supabaseServer.storage
    .from('roast-videos')
    .download(storagePath);

  if (downloadError || !fileData) {
    return Response.json({ error: 'Failed to retrieve video from storage.' }, { status: 500 });
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  await writeFile(localPath, buffer);

  const videoPath = localPath;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let audioPath: string | null = null;

      try {
        // Fetch trending context, chronic issues, and viral patterns in parallel with frame extraction
        const trendingContextPromise = fetchStructuredTrendingContext();
        const chronicIssuesPromise = fetchChronicIssues(sessionId);
        const viralPatternsPromise = fetchTopViralPatterns();

        // Extract frames
        send({ type: 'status', message: 'Extracting frames...' });
        let frames: string[] = [];
        try {
          frames = extractFrames(videoPath, 8);
        } catch (err) {
          console.error('[analyze] Frame extraction failed:', err);
          send({ type: 'status', message: 'Frame extraction limited, running text-based analysis...' });
        }

        if (frames.length === 0) {
          // Fallback: still run analysis but note limited visual data
          send({ type: 'status', message: 'No frames extracted. Analysis will be limited.' });
        }

        // Extract video duration
        let durationAnalysis: DurationAnalysis | null = null;
        const videoDuration = getVideoDuration(videoPath);
        if (videoDuration) {
          send({ type: 'status', message: `Video duration: ${videoDuration.durationFormatted}` });
          // We'll compute the full analysis after niche detection
        }

        // Extract and transcribe audio
        send({ type: 'status', message: 'Extracting audio...' });
        let transcript: TranscriptionResult | null = null;
        let audioChars: AudioCharacteristics = { hasSpeech: false, hasMusic: false, speechPercent: 0 };

        try {
          audioPath = extractAudio(videoPath);
          if (audioPath) {
            const hasTranscriptionKey = !!process.env.OPENAI_API_KEY || !!process.env.ASSEMBLYAI_API_KEY;
            if (hasTranscriptionKey) {
              send({ type: 'status', message: 'Transcribing audio...' });
            } else {
              console.error('[analyze] No transcription API key set (OPENAI_API_KEY or ASSEMBLYAI_API_KEY)');
            }
            // Run transcription and speech/music detection in parallel
            const [transcriptResult, speechMusicResult] = await Promise.all([
              transcribeAudio(audioPath, 120000),
              Promise.resolve(detectSpeechMusic(audioPath)),
            ]);
            transcript = transcriptResult;
            audioChars = speechMusicResult;

            if (!hasTranscriptionKey) {
              send({ type: 'status', message: 'Audio transcription unavailable — set OPENAI_API_KEY or ASSEMBLYAI_API_KEY.' });
            } else if (transcript?.text) {
              send({ type: 'status', message: 'Audio transcribed successfully.' });
            } else {
              send({ type: 'status', message: 'No speech detected in audio.' });
            }
          } else {
            send({ type: 'status', message: 'No audio track found in video.' });
          }
        } catch (err) {
          console.warn('[analyze] Audio processing failed:', err);
          send({ type: 'status', message: 'Audio transcription timed out. Running visual-only analysis...' });
        }

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const agentResults: Record<string, { score: number; roastText: string; findings: string[]; improvementTip: string }> = {};
        const trendingCtx = await trendingContextPromise;
        const chronicIssues = await chronicIssuesPromise;
        const viralPatterns = await viralPatternsPromise;
        const playbookContext = buildPlaybookContext(viralPatterns);

        // Detect niche from available signals
        const nicheDetection: NicheDetection = detectNiche({
          caption: (session as { video_url: string; filename?: string }).filename ?? '',
          hashtags: [],
          transcript: transcript?.text ?? undefined,
          audioType: audioChars.hasSpeech && audioChars.hasMusic ? 'both'
            : audioChars.hasSpeech ? 'speech'
            : audioChars.hasMusic ? 'music'
            : 'none',
        });
        send({ type: 'status', message: `Detected niche: ${nicheDetection.niche}${nicheDetection.subNiche ? ` (${nicheDetection.subNiche})` : ''} [${nicheDetection.confidence} confidence]` });

        // Compute duration analysis now that we know the niche
        if (videoDuration) {
          const nicheInfo = NICHE_CONTEXT[nicheDetection.niche];
          durationAnalysis = analyzeDuration(videoDuration, nicheInfo.optimalLength);
          send({
            type: 'duration',
            durationSeconds: videoDuration.durationSeconds,
            durationFormatted: videoDuration.durationFormatted,
            category: durationAnalysis.category,
            optimalRange: nicheInfo.optimalLength,
            deltaSeconds: durationAnalysis.deltaSeconds,
          });
        }

        if (chronicIssues.length > 0) {
          send({ type: 'status', message: 'Repeat offender detected. Escalating intensity...' });
        }

        // Run each agent sequentially
        for (const dimension of DIMENSION_ORDER) {
          const { name, prompt } = AGENT_PROMPTS[dimension];
          send({ type: 'agent', agent: dimension, status: 'analyzing', name });

          try {
            const imageContent = frames.map(data => ({
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: 'image/jpeg' as const,
                data,
              },
            }));

            const escalationContext = buildEscalationContext(chronicIssues, dimension);
            const hookContext = dimension === 'hook' ? playbookContext : '';

            // Build audio context for relevant agents
            let audioContext = '';
            if (dimension === 'audio' && transcript?.text) {
              const segmentLines = transcript.segments
                .map(s => `${s.start.toFixed(1)}s-${s.end.toFixed(1)}s: "${s.text}"`)
                .join('\n');
              audioContext = `\n\nAUDIO TRANSCRIPT:\n${transcript.text}\n\nSPEECH SEGMENTS (with timestamps):\n${segmentLines}\n\nAUDIO STRUCTURE: ${audioChars.hasSpeech ? 'Voice detected' : 'No clear voice'} | ${audioChars.hasMusic ? 'Music/background audio detected' : 'No background music'}\n\nNow analyze the ACTUAL audio content above. Reference specific words/phrases the creator said. Quote them. If the transcript is empty, note that the video appears to have no speech.`;
            } else if (dimension === 'audio') {
              audioContext = '\n\nNo audio transcript available — transcription was unavailable or no speech was detected. Analyze based on visual cues only and note that audio analysis was limited.';
            } else if (dimension === 'hook' && transcript?.segments?.length) {
              const firstSegment = transcript.segments[0];
              audioContext = `\n\nThe creator's first spoken words are: "${firstSegment.text}". Analyze whether this opening line is a strong hook.`;
            } else if (dimension === 'algorithm' && transcript?.text) {
              const words = transcript.text.split(/\s+/).slice(0, 30).join(' ');
              audioContext = `\n\nThe caption/speech mentions: "${words}". Does this align with trending topics?`;
            }

            const trendingContext = buildAgentTrendingContext(trendingCtx, dimension);
            const nicheContext = buildAgentNicheContext(nicheDetection, dimension, videoDuration?.durationSeconds);
            const fullPrompt = prompt + TONE_RULES + hookContext + audioContext + trendingContext + nicheContext + escalationContext;

            const response = await anthropic.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 1024,
              messages: [{
                role: 'user',
                content: [
                  ...imageContent,
                  { type: 'text' as const, text: fullPrompt },
                ],
              }],
            });

            const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
            const result = parseAgentResponse(responseText);
            agentResults[dimension] = result;

            send({
              type: 'agent',
              agent: dimension,
              status: 'done',
              name,
              result: { agent: dimension, ...result },
            });
          } catch (err) {
            console.error(`[analyze] Agent ${dimension} failed:`, err);
            const fallback = {
              score: 50,
              roastText: `${name} encountered an error analyzing this dimension. Consider yourself lucky.`,
              findings: ['Analysis error — could not fully evaluate this dimension'],
              improvementTip: 'Try uploading again for a complete analysis.',
            };
            agentResults[dimension] = fallback;
            send({
              type: 'agent',
              agent: dimension,
              status: 'done',
              name,
              result: { agent: dimension, ...fallback },
            });
          }
        }

        // Calculate weighted overall score
        let overallScore = 0;
        for (const dim of DIMENSION_ORDER) {
          overallScore += (agentResults[dim]?.score ?? 50) * DIMENSION_WEIGHTS[dim];
        }
        overallScore = Math.round(overallScore);

        // Generate verdict
        let verdict: string;
        try {
          const repeatContext = chronicIssues.length > 0
            ? `\n\nThis is a REPEAT OFFENDER. They've been roasted ${chronicIssues.length > 3 ? 'many' : 'a few'} times before and keep making the same mistakes. Reference this in the verdict. Be extra disappointed.`
            : '';

          const verdictResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 300,
            messages: [{
              role: 'user',
              content: `You are a brutal TikTok roast machine. Given these agent scores and roasts for a video, write a 2-3 sentence savage overall verdict. Be funny and specific. Write like you're texting a friend — short sentences, simple words, no fancy vocabulary. A high schooler should laugh at this, not need a dictionary. Max ONE analogy and make it concrete and relatable.

Detected niche: ${nicheDetection.niche}${nicheDetection.subNiche ? ` (${nicheDetection.subNiche})` : ''}. Reference the niche in your verdict — tell them how their video stacks up against other ${nicheDetection.niche} creators.
${durationAnalysis ? `\nVideo duration: ${durationAnalysis.duration.durationFormatted} (${durationAnalysis.duration.durationSeconds.toFixed(0)}s). Optimal for ${nicheDetection.niche}: ${NICHE_CONTEXT[nicheDetection.niche].optimalLength}. Category: ${durationAnalysis.category}.${durationAnalysis.category !== 'OPTIMAL' ? ` This is a key area to fix — ${durationAnalysis.category === 'WAY_TOO_SHORT' || durationAnalysis.category === 'WAY_TOO_LONG' ? 'MAJORLY' : 'noticeably'} off the sweet spot. Reference the duration problem in the verdict.` : ' Duration is solid — mention it as a positive.'}` : ''}

Scores: ${JSON.stringify(Object.fromEntries(DIMENSION_ORDER.map(d => [d, agentResults[d]?.score])))}
Agent summaries: ${DIMENSION_ORDER.map(d => `${d}: ${agentResults[d]?.roastText}`).join('\n')}${repeatContext}

Write ONLY the verdict text, no JSON, no quotes. Keep it simple and punchy.`,
            }],
          });
          verdict = verdictResponse.content[0].type === 'text'
            ? verdictResponse.content[0].text
            : 'Your video exists. That is the nicest thing we can say about it.';
        } catch {
          verdict = 'Your video exists. That is the nicest thing we can say about it.';
        }

        // Build full result
        const result = {
          id,
          tiktokUrl: '',
          overallScore,
          verdict,
          agents: DIMENSION_ORDER.map(dim => ({
            agent: dim,
            score: agentResults[dim].score,
            roastText: agentResults[dim].roastText,
            findings: agentResults[dim].findings,
            improvementTip: agentResults[dim].improvementTip,
            timestamp_seconds: AGENT_TIMESTAMPS[dim],
          })),
          niche: {
            detected: nicheDetection.niche,
            subNiche: nicheDetection.subNiche,
            confidence: nicheDetection.confidence,
          },
          ...(transcript?.text ? { audioTranscript: transcript.text } : {}),
          ...(transcript?.segments?.length ? { audioSegments: transcript.segments } : {}),
          metadata: {
            views: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            duration: videoDuration?.durationSeconds ?? 0,
            hashtags: [],
            description: 'Uploaded video',
          },
        };

        send({
          type: 'verdict',
          overallScore,
          verdict,
          niche: { detected: nicheDetection.niche, subNiche: nicheDetection.subNiche, confidence: nicheDetection.confidence },
          ...(durationAnalysis ? {
            duration: {
              seconds: durationAnalysis.duration.durationSeconds,
              formatted: durationAnalysis.duration.durationFormatted,
              category: durationAnalysis.category,
              optimalRange: NICHE_CONTEXT[nicheDetection.niche].optimalLength,
            },
          } : {}),
        });

        // Update session in Supabase with results
        try {
          const agentScores = Object.fromEntries(DIMENSION_ORDER.map(d => [d, agentResults[d].score]));
          const findings = Object.fromEntries(DIMENSION_ORDER.map(d => [d, agentResults[d].findings]));

          await supabaseServer.from('rmt_roast_sessions').update({
            overall_score: overallScore,
            verdict,
            agent_scores: agentScores,
            findings,
            result_json: result,
          }).eq('id', id);
        } catch (err) {
          console.warn('[analyze] Supabase save failed:', err);
        }

        send({ type: 'done', id });
      } catch (err) {
        console.error('[analyze] Stream error:', err);
        send({ type: 'error', message: 'Analysis failed. Please try again.' });
      } finally {
        // Clean up temp video and audio
        try {
          if (existsSync(videoPath)) unlinkSync(videoPath);
        } catch { /* ignore cleanup errors */ }
        if (audioPath) cleanupAudio(audioPath);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
