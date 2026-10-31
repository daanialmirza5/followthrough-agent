import { NextResponse } from "next/server";
import { structured, hasKey, errorMessage } from "@/lib/llm";
import { ExtractResult } from "@/lib/schemas";
import { EXTRACT_SYSTEM } from "@/lib/prompts";
import { demoExtract } from "@/lib/demo";
import { calendarBlock, weekday } from "@/lib/dates";

export const maxDuration = 120;

type PastDecision = { id: string; text: string; topic: string; meeting: string; date: string; status: string };

export async function POST(req: Request) {
  const { transcript, meetingDate, memory = [], openTasks = [] } = (await req.json()) as {
    transcript: string;
    meetingDate: string;
    memory: PastDecision[];
    openTasks: { task: string; owner: string; deadline: string | null }[];
  };
  if (!transcript?.trim()) return NextResponse.json({ error: "Transcript is empty." }, { status: 400 });

  if (!hasKey()) {
    // Demo mode only knows the bundled sample. Never return canned output for a real meeting.
    if (!/razorpay/i.test(transcript)) {
      return NextResponse.json(
        { error: "Live AI isn't configured on this deployment (GROQ_API_KEY missing). Load the sample meeting to try demo mode." },
        { status: 503 }
      );
    }
    const ids: Record<string, string> = {};
    for (const m of memory) if (m.status === "active") ids[m.topic] = m.id;
    await new Promise((r) => setTimeout(r, 1800));
    return NextResponse.json({ result: demoExtract(meetingDate, ids), mode: "demo" });
  }

  const memoryBlock = memory.filter((m) => m.status === "active").length
    ? memory
        .filter((m) => m.status === "active")
        .map((m) => `- [id=${m.id}] (${m.date}, "${m.meeting}", topic: ${m.topic}) ${m.text}`)
        .join("\n")
    : "(no past decisions yet)";
  const tasksBlock = openTasks.length
    ? openTasks.map((t) => `- ${t.task} — ${t.owner}${t.deadline ? `, due ${t.deadline}` : ""}`).join("\n")
    : "(none)";

  const user = `MEETING DATE: ${meetingDate} (${weekday(meetingDate)})

${calendarBlock(meetingDate)}

PAST DECISIONS MEMORY:
${memoryBlock}

CURRENTLY OPEN TASKS (for context — mention in conflict explanations if a new decision invalidates one):
${tasksBlock}

TRANSCRIPT:
<transcript>
${transcript}
</transcript>`;

  try {
    const result = await structured({ system: EXTRACT_SYSTEM, user, schema: ExtractResult, effort: "medium" });
    return NextResponse.json({ result, mode: "live" });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 });
  }
}
