# evidence-backed action plan eval

## gap addressed
before this change, the verdict layer could produce smart-sounding `nextSteps`, but they were still easy to read as generic synthesis. the strongest remaining gap was not agent quality, it was **final prioritization quality**: the creator was not getting a ranked fix plan with hard proof from their own video.

## reusable eval prompt
use any talking-head educational video with:
- a weak spoken opener
- captions that appear late or sit too low
- generic CTA/caption

then compare the final verdict payload before vs after this branch.

## what "before" looked like
- "tighten the hook so viewers stop scrolling"
- "improve caption readability"
- "add a clearer CTA"

problem: true, but soft. no proof. no exact move. no reason this order is right.

## what "after" should look like
- **P1 names the highest-leverage fix**, not just the lowest score
- each action includes **evidence bullets** from the actual video or transcript
- each action includes an **imperative fix** and an **example replacement line/edit move**
- the roast page renders those actions as a visible creator plan, not a throwaway list

## example of the target output shape
```json
{
  "biggestBlocker": "the opener spends its first two seconds explaining instead of creating tension, so the video loses the scroll before the value arrives.",
  "actionPlan": [
    {
      "priority": "P1",
      "dimension": "hook",
      "issue": "the video opens with explanation instead of a scroll-stopping claim",
      "evidence": [
        "0.0s-1.8s: 'today i want to talk about...'",
        "hook agent scored this dimension 34/100"
      ],
      "doThis": "replace the opener with a punchy outcome-first line and show the result in frame 1",
      "example": "say: 'you're making this mistake every single day and it's costing you views' while the final result is already on screen",
      "whyItMatters": "this is the fastest lever for better first-3-second retention"
    }
  ]
}
```

## why this now competes better
incumbent creator tools are good at naming categories. this branch makes rmt better at telling a serious creator **what to change first, why that is first, and exactly how to execute it**. that moves the product from "analysis" toward "coach with receipts." 
