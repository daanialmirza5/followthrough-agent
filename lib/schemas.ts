import { z } from "zod";

export const Priority = z.enum(["high", "medium", "low"]);
export const Confidence = z.enum(["high", "medium", "low"]);

export const ActionItem = z.object({
  task: z.string().describe("Imperative, specific task, e.g. 'Send revised pricing deck to finance'"),
  owner: z.string().describe("Person responsible. 'Unassigned' if nobody clearly took it."),
  deadline: z.string().nullable().describe("ISO date YYYY-MM-DD resolved against the meeting date, or null if none was given"),
  deadline_phrase: z.string().nullable().describe("The words used, e.g. 'by Friday', 'end of next week'"),
  priority: Priority,
  source_quote: z.string().describe("Short verbatim quote from the transcript that created this item"),
  confidence: Confidence.describe("How sure you are this is a real commitment (not just an idea floated)"),
});

export const Decision = z.object({
  text: z.string().describe("The decision, stated as a fact, e.g. 'Launch moves to 22 Nov'"),
  made_by: z.string().describe("Who made / confirmed it"),
  rationale: z.string().nullable(),
  source_quote: z.string(),
  topic: z.string().describe("1-3 word topic tag, e.g. 'launch date', 'pricing'"),
});

export const Conflict = z.object({
  new_decision: z.string(),
  past_decision_id: z.string().describe("id of the conflicting past decision from memory"),
  past_decision: z.string(),
  past_meeting: z.string(),
  explanation: z.string().describe("Why these conflict, in one or two sentences"),
  severity: z.enum(["high", "medium", "low"]),
  suggested_resolution: z.string(),
});

export const ExtractResult = z.object({
  title: z.string().describe("Short meeting title inferred from content"),
  summary: z.string().describe("2-3 sentence executive summary"),
  speakers: z.array(z.object({ name: z.string(), role_guess: z.string().nullable() })),
  clean_transcript: z
    .array(z.object({ speaker: z.string(), text: z.string() }))
    .describe("The transcript cleaned: filler words removed, grammar fixed, speakers attributed. Keep meaning, condense rambling."),
  decisions: z.array(Decision),
  action_items: z.array(ActionItem),
  conflicts: z.array(Conflict),
  open_questions: z.array(z.string()),
  warnings: z
    .array(z.string())
    .describe("Ambiguities that need a human: tasks without owners, vague deadlines, people who were mentioned but absent"),
});
export type ExtractResult = z.infer<typeof ExtractResult>;
export type ActionItemT = z.infer<typeof ActionItem>;
export type DecisionT = z.infer<typeof Decision>;
export type ConflictT = z.infer<typeof Conflict>;

export const CommandResult = z.object({
  action_items: z.array(ActionItem).describe("The FULL updated list of action items after applying the instruction"),
  reply: z.string().describe("One short sentence confirming what you changed"),
});
export type CommandResult = z.infer<typeof CommandResult>;

export const DigestResult = z.object({
  headline: z.string(),
  highlights: z.array(z.string()),
  key_decisions: z.array(z.string()),
  overdue: z.array(z.string()),
  at_risk: z.array(z.string()),
  by_owner: z.array(z.object({ owner: z.string(), open: z.number(), done: z.number(), note: z.string() })),
  next_week_focus: z.array(z.string()),
  slack_message: z.string().describe("Ready-to-post Slack message (mrkdwn) summarising the week"),
});
export type DigestResult = z.infer<typeof DigestResult>;
