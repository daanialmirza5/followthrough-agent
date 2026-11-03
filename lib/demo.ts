import type { ExtractResult } from "./schemas";

export const PAST_MEETING_TRANSCRIPT = `Priya: Okay so final call on launch. We go live on November 15th.
Rahul: Agreed. Pricing stays at 499 rupees a month for the Pro plan.
Priya: And we ship Android first, iOS follows in December.
Ananya: I'll get the Play Store listing ready by November 8.`;

export const SAMPLE_TRANSCRIPT = `um okay so quick sync on the launch thing. Priya here. so basically, uh, the payments integration is not gonna be ready, Razorpay is still reviewing our KYC, so I think we have to, like, we're moving launch to November 22nd, that's final, I spoke to the founders.

Rahul: yeah okay that makes sense. also honestly I think we should go iOS first not Android, like seventy percent of our waitlist is on iPhone, so let's do iOS first

Priya: yeah fine, agreed, iOS first.

Rahul: I'll update the pricing page and the FAQ by Friday

Ananya: I can, uh, I'll redo the App Store screenshots, I need the final copy though, maybe by Wednesday?

Priya: Ananya, also can you, um, email the beta users about the new date, do it tomorrow. and someone needs to tell the support team, uh, I don't know who, let's figure that out

Rahul: oh and do we still want to do the Product Hunt launch same day? we never decided that

Priya: let's park it. okay, also Kabir wasn't here but he needs to send the press kit to the agency, like, before launch. Thanks all.`;

/** Canned result used in demo mode (no API key) for the sample transcript. */
export function demoExtract(today: string, pastDecisionIds: Record<string, string>): ExtractResult {
  // Work in UTC throughout: mixing local midnight with toISOString() shifted every date one day
  // early on servers east of UTC (e.g. IST), so "tomorrow" became today.
  const base = new Date(today + "T00:00:00Z");
  const d = (offset: number) => new Date(base.getTime() + offset * 86_400_000).toISOString().slice(0, 10);
  // next Friday / Wednesday relative to today
  const nextDow = (dow: number) => {
    const diff = (dow - base.getUTCDay() + 7) % 7 || 7;
    return d(diff);
  };
  return {
    title: "Launch re-plan sync",
    summary:
      "Payments (Razorpay KYC) is blocking, so launch moves from 15 Nov to 22 Nov and the team switches to iOS-first because ~70% of the waitlist is on iPhone. Pricing page, App Store assets and beta-user comms are being updated; Product Hunt timing is still open.",
    speakers: [
      { name: "Priya", role_guess: "Product lead" },
      { name: "Rahul", role_guess: "Growth / web" },
      { name: "Ananya", role_guess: "Design" },
    ],
    clean_transcript: [
      { speaker: "Priya", text: "Quick sync on the launch. The payments integration won't be ready — Razorpay is still reviewing our KYC. We're moving launch to 22 November. That's final; I've spoken to the founders." },
      { speaker: "Rahul", text: "That makes sense. I also think we should go iOS first rather than Android — about 70% of our waitlist is on iPhone." },
      { speaker: "Priya", text: "Agreed, iOS first." },
      { speaker: "Rahul", text: "I'll update the pricing page and the FAQ by Friday." },
      { speaker: "Ananya", text: "I'll redo the App Store screenshots. I need the final copy by Wednesday." },
      { speaker: "Priya", text: "Ananya, can you also email the beta users about the new date tomorrow? Someone also needs to tell the support team — we need to decide who." },
      { speaker: "Rahul", text: "Do we still want to do the Product Hunt launch on the same day? We never decided that." },
      { speaker: "Priya", text: "Let's park it. Kabir wasn't here, but he needs to send the press kit to the agency before launch." },
    ],
    decisions: [
      { text: "Launch moves to 22 November 2026", made_by: "Priya", rationale: "Razorpay KYC review is blocking payments", source_quote: "we're moving launch to November 22nd, that's final", topic: "launch date" },
      { text: "Ship iOS first instead of Android", made_by: "Priya (proposed by Rahul)", rationale: "~70% of waitlist is on iPhone", source_quote: "yeah fine, agreed, iOS first", topic: "platform" },
    ],
    action_items: [
      { task: "Update the pricing page and FAQ for the new launch date", owner: "Rahul", deadline: nextDow(5), deadline_phrase: "by Friday", priority: "high", source_quote: "I'll update the pricing page and the FAQ by Friday", confidence: "high" },
      { task: "Redo App Store screenshots for iOS-first launch", owner: "Ananya", deadline: null, deadline_phrase: null, priority: "high", source_quote: "I'll redo the App Store screenshots", confidence: "high" },
      { task: "Deliver final App Store copy to Ananya", owner: "Unassigned", deadline: nextDow(3), deadline_phrase: "by Wednesday", priority: "medium", source_quote: "I need the final copy though, maybe by Wednesday?", confidence: "medium" },
      { task: "Email beta users about the new 22 Nov launch date", owner: "Ananya", deadline: d(1), deadline_phrase: "tomorrow", priority: "high", source_quote: "email the beta users about the new date, do it tomorrow", confidence: "high" },
      { task: "Brief the support team on the new launch date", owner: "Unassigned", deadline: null, deadline_phrase: null, priority: "medium", source_quote: "someone needs to tell the support team", confidence: "medium" },
      { task: "Send press kit to the agency", owner: "Kabir", deadline: "2026-11-21", deadline_phrase: "before launch", priority: "medium", source_quote: "he needs to send the press kit to the agency, like, before launch", confidence: "medium" },
    ],
    conflicts: [
      {
        new_decision: "Launch moves to 22 November 2026",
        past_decision_id: pastDecisionIds["launch date"] ?? "",
        past_decision: "Launch on 15 November 2026",
        past_meeting: "Launch go/no-go",
        explanation: "The launch date agreed last week (15 Nov) is pushed by a week. Ananya's Play Store task (due 8 Nov) and any campaigns scheduled for 15 Nov are now misaligned.",
        severity: "high",
        suggested_resolution: "Mark the 15 Nov decision as superseded and re-date dependent tasks; notify marketing.",
      },
      {
        new_decision: "Ship iOS first instead of Android",
        past_decision_id: pastDecisionIds["platform"] ?? "",
        past_decision: "Ship Android first, iOS follows in December",
        past_meeting: "Launch go/no-go",
        explanation: "Platform order is reversed. The open task 'Play Store listing by 8 Nov' may no longer be the priority.",
        severity: "high",
        suggested_resolution: "Confirm with founders, then re-prioritise the Play Store task below App Store work.",
      },
    ],
    open_questions: ["Do we still launch on Product Hunt on the same day?", "Who briefs the support team?"],
    warnings: [
      "'Tell the support team' has no owner.",
      "Ananya's screenshots have no deadline, but depend on copy due Wednesday (no owner).",
      "Kabir was absent — he hasn't accepted the press-kit task. Confirm with him.",
    ],
  };
}
