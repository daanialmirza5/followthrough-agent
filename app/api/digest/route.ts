import { NextResponse } from "next/server";
import { structured, hasKey, errorMessage } from "@/lib/llm";
import { DigestResult } from "@/lib/schemas";
import { DIGEST_SYSTEM } from "@/lib/prompts";

export const maxDuration = 90;

type Task = { task: string; owner: string; deadline: string | null; status: string; priority: string };
type Dec = { text: string; date: string; meeting: string; status: string };

export async function POST(req: Request) {
  const { tasks = [], decisions = [], today } = (await req.json()) as { tasks: Task[]; decisions: Dec[]; today: string };

  if (!hasKey()) return NextResponse.json({ result: demoDigest(tasks, decisions, today), mode: "demo" });

  const user = `TODAY: ${today}

DECISIONS:
${decisions.map((d) => `- (${d.date}, ${d.meeting}) [${d.status}] ${d.text}`).join("\n") || "(none)"}

TASKS:
${tasks.map((t) => `- [${t.status}] ${t.task} — ${t.owner}, due ${t.deadline ?? "no date"}, ${t.priority}`).join("\n") || "(none)"}`;

  try {
    const result = await structured({ system: DIGEST_SYSTEM, user, schema: DigestResult, effort: "low" });
    return NextResponse.json({ result, mode: "live" });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 });
  }
}

function demoDigest(tasks: Task[], decisions: Dec[], today: string): DigestResult {
  const overdue = tasks.filter((t) => t.status !== "done" && t.deadline && t.deadline < today);
  const owners = [...new Set(tasks.map((t) => t.owner))];
  const by_owner = owners.map((o) => ({
    owner: o,
    open: tasks.filter((t) => t.owner === o && t.status !== "done").length,
    done: tasks.filter((t) => t.owner === o && t.status === "done").length,
    note: "",
  }));
  const active = decisions.filter((d) => d.status === "active").map((d) => d.text);
  return {
    headline: `${tasks.filter((t) => t.status === "done").length} of ${tasks.length} tasks done this week`,
    highlights: tasks.filter((t) => t.status === "done").map((t) => `${t.owner}: ${t.task}`),
    key_decisions: active,
    overdue: overdue.map((t) => `${t.task} (${t.owner}, due ${t.deadline})`),
    at_risk: tasks.filter((t) => t.owner === "Unassigned").map((t) => `${t.task} has no owner`),
    by_owner,
    next_week_focus: tasks.filter((t) => t.status !== "done" && t.priority === "high").map((t) => t.task),
    slack_message: `*Weekly digest*\n${active.map((a) => `• ${a}`).join("\n")}`,
  };
}
