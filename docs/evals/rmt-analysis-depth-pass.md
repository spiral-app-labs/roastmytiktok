# RMT analysis depth pass

## top remaining quality gap after hook-first
The hook-first work fixed **what** should win priority, but the output still felt too thin on **why that issue clearly deserves priority over everything else**. In practice, the analysis could still read like stacked observations instead of a strategist making one evidence-backed call: *here is the bottleneck, here is the proof, and here is what can wait.*

That was the biggest remaining competitor gap because incumbents feel smarter when they connect multiple signals into one sharp diagnosis instead of just listing critiques.

## shipped upgrade
Shipped a new **priority diagnosis** layer that:
- names the single primary bottleneck before the verdict prompt runs
- pulls in direct proof plus corroborating support signals
- explicitly states what to deprioritize for now
- feeds both the LLM verdict prompt and the fallback action plan so the prioritization survives even when the final summary is imperfect

## before vs after

### scenario
Beginner talking-head TikTok about baby naps.

- opening line: "hey guys, today i wanted to talk about naps because i get this question a lot"
- frame one is static
- captions are readable once the video gets going
- audio is understandable but slow to land

### before (representative)
> your first 2-3 seconds are why this video stalls. opening with "hey guys, today i wanted to talk about naps" is a generic warm-up, not a hook. fix the opener first. once the hook earns the hold, then worry about polishing the end CTA.

### what was still missing
- good instinct, but weak *proof chain*
- not enough corroboration from neighboring signals like frame-one visual drag or slow spoken delivery
- not explicit enough about what should wait and why

### after (new system target)
> the weak opening is still the single bottleneck because the very first line at 0.0s is "hey guys, today i wanted to talk about naps because i get this question a lot," which spends the opening on setup instead of a payoff. that diagnosis is reinforced by frame-one visual drag and a delivery pattern that takes too long to land the point, so tiktok likely gets early swipe signals before the useful advice starts.
>
> fix that before anything else: cut the warm-up and replace it with **"if your baby fights every nap, you're probably doing this one thing too early"** in the first second, with a tighter crop and immediate motion. captions are not the first problem here, so do not burn your first fix on end CTA or polish work until the opener earns the hold.

## why this now feels more competitive
- it reads like a strategist making a call, not a tool dumping notes
- the top recommendation is now supported by multiple pieces of evidence, not just one quote
- lower-priority work gets explicitly deferred, which makes the output feel more decisive
- the fallback plan now preserves the same logic, so quality degrades more gracefully when the model summary underperforms

## validation
- added tests for priority diagnosis selection in hook-first mode
- added tests that P1 in the fallback action plan now contains both direct proof and supporting proof
- added tests that the evidence ledger includes the new priority diagnosis block
