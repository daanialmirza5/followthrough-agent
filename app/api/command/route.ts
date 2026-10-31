import { NextResponse } from "next/server";
import { structured, hasKey, errorMessage } from "@/lib/llm";
import { CommandResult, type ActionItemT } from "@/lib/schemas";
import { COMMAND_SYSTEM } from "@/lib/prompts";
import { calendarBlock, weekday } from "@/lib/dates";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { instruction, items, today } = (await req.json()) as {
    instruction: string;
    items: ActionItemT[];
    today: string;
  };
  if (!instruction?.trim()) return NextResponse.json({ error: "Say or type an instruction." }, { status: 400 });

  if (!hasKey()) {
    return NextResponse.json({
      result: demoCommand(instruction, items),
      mode: "demo",
    });
  }

  const user = `TODAY: ${today} (${weekday(today)})

${calendarBlock(today)}

CURRENT ACTION ITEMS (JSON):
${JSON.stringify(items, null, 2)}

INSTRUCTION (spoken): "${instruction}"`;

  try {
    const result = await structured({ system: COMMAND_SYSTEM, user, schema: CommandResult, effort: "low" });
    return NextResponse.json({ result, mode: "live" });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 });
  }
}

/** Tiny rule-based fallback so the demo works without a key. */
function demoCommand(instruction: string, items: ActionItemT[]): CommandResult {
  const lower = instruction.toLowerCase();
  const next = items.map((i) => ({ ...i }));
  const names = ["Priya", "Rahul", "Ananya", "Kabir"];
  const who = names.find((n) => lower.includes(n.toLowerCase()));
  const target = next.find((i) => i.owner === "Unassigned") ?? next[0];
  if (who && target) {
    target.owner = who;
    return { action_items: next, reply: `Assigned "${target.task}" to ${who}. (demo mode — add GROQ_API_KEY for full natural-language edits)` };
  }
  return { action_items: next, reply: "Demo mode: add GROQ_API_KEY to apply free-form voice edits." };
}
